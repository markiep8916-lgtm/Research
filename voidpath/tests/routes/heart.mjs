// Human-pace route of the finale's ascent (tools/human-pace.mjs, G2 T-1): the Halcyon bridge, the
// Starchart to the Heart and the night before (C8), the flight, the Moth's pier and the arrival,
// Kade's dream, the first pylon and the chord bridge, the Choir's Wardens and the lift; the Second
// Tier (WARDEN, Nyx's dream, the north chord, the pylon, a rest and a Party Talk, the Choir Mantle,
// the first Choirlit Echoes, the lift); the Third Tier (WARDEN, Orion's dream, both pylons, the second
// Echoes, the processional and Sera's dream); the Sanctum's rest, the crown lift and the Crown (C8's
// dreams.crown with C11's WARDEN, then the EPILOGUE card).
// Chain: (vault.mjs) -> finale -> fin.tier2 -> fin.tier3 -> fin.crown -> (the epilogue's route).

/** Rides a same-map lift and waits until the leader stands near (x, z). */
async function ride(d, id, [x, z]) {
  const near = `(() => { const p = window.__VP.debug.state(); return p.map === 'heart' && Math.hypot(p.x - ${x}, p.z - ${z}) < 3; })()`;
  for (let k = 0; ; k++) {
    await d.use(id);
    try {
      await d.pump(near, { maxVt: 40 });
      return;
    } catch (e) {
      if (k >= 2) throw e;
    }
  }
}

export default {
  segments: {
    // the Halcyon after the FINAL CHAPTER card: the Starchart, the night before, the flight, the Dock
    finale: {
      level: 27,
      next: 'fin.tier2',
      async run(d) {
        await d.use('bolt', { optional: true });
        d.choose('Rest tonight.');
        await d.fly('starchart', 'The Heart');
        await d.pump(d.F('seen:heart:arrival'), { maxVt: 1200 });
        d.milestone('heart arrival');
        await d.shot('c07-dock', { hi: true });
        // the causeway: Kade's dream
        await d.go(9.6, 42.6, { until: d.F('story:dream_kade') });
        await d.pump(d.F('story:dream_kade'), { maxVt: 900 });
        d.milestone('dream kade');
        await d.journal('journal-fin-ascend');
        // the pylon at the north end of the west arc, then the chord bridge across the shaft
        await d.use('pylon_t1');
        await d.pump(d.F('sw:heart:t1'));
        d.milestone('chord bridge');
        await d.go(14.6, 46.0);
        await d.go(29.0, 46.0, { label: 'across the chord' });
        await d.shot('c07-chord', { hi: true });
        await d.use('dawnspear', { optional: true });
        await d.fightBoss({ at: [29.4, 37.6], script: 'heart.wardens', done: d.F('heart:wardens_down') });
        d.milestone('wardens');
        await ride(d, 'lift_t1', [63.8, 51.7]);
      },
    },
    // the Second Tier: WARDEN at the lift, Nyx's dream, the north chord, the pylon, a rest, the Echoes
    'fin.tier2': {
      level: 28,
      next: 'fin.tier3',
      async run(d) {
        await d.pump(null, { minVt: 1 });
        await d.go(62.0, 48.6, { until: d.F('seen:heart:warden_t2') });
        await d.pump(d.F('seen:heart:warden_t2'), { maxVt: 300 });
        await d.go(64.2, 42.6, { until: d.F('story:dream_nyx') });
        await d.pump(d.F('story:dream_nyx'), { maxVt: 900 });
        d.milestone('dream nyx');
        await d.go(61.0, 39.0);
        await d.fightBoss({ at: [58.6, 39.0], script: 'heart.choir', done: d.F('heart:choir_down') });
        d.milestone('choir');
        await d.go(48.4, 39.0, { label: 'across the north chord' });
        await d.use('pylon_t2');
        await d.pump(d.F('sw:heart:t2'));
        await d.use('mantle', { optional: true });
        await d.med('med_t2');
        await d.shot('c07-tier2', { hi: true });
        await d.fightBoss({ at: [46.4, 46.8], script: 'heart.echoes_t2', done: d.F('heart:echoes_t2_down') });
        d.milestone('echoes t2');
        await ride(d, 'lift_t2', [65.7, 4.3]);
      },
    },
    // the Third Tier: WARDEN, Orion's dream, both pylons, the second Echoes, the processional
    'fin.tier3': {
      level: 30,
      next: 'fin.crown',
      async run(d) {
        await d.pump(null, { minVt: 1 });
        await d.go(62.6, 7.0, { until: d.F('seen:heart:warden_t3') });
        await d.pump(d.F('seen:heart:warden_t3'), { maxVt: 300 });
        await d.go(66.0, 14.0, { until: d.F('story:dream_orion') });
        await d.pump(d.F('story:dream_orion'), { maxVt: 900 });
        d.milestone('dream orion');
        await d.use('pylon_t3a');
        await d.pump(d.F('sw:heart:t3a'));
        await d.use('pylon_t3b');
        await d.pump(d.F('sw:heart:t3b'));
        d.milestone('processional');
        await d.shot('c07-tier3', { hi: true });
        await d.fightBoss({ at: [47.6, 15.6], script: 'heart.echoes_t3', done: d.F('heart:echoes_t3_down') });
        d.milestone('echoes t3');
        await d.go(40.0, 13.5, { until: d.F('story:dream_sera') });
        await d.pump(d.F('story:dream_sera'), { maxVt: 900 });
        d.milestone('dream sera');
      },
    },
    // the Sanctum: the last rest, the crown lift, the Crown (C8, C11)
    'fin.crown': {
      level: 31,
      async run(d) {
        await d.med('med_sanctum');
        await d.shot('c07-sanctum', { hi: true });
        d.choose('Ride to the crown.');
        await d.use('crown_lift', { after: '(() => window.__VP.debug.state().map === "heart" && window.__VP.debug.state().z > 19)()' });
        d.milestone('crown');
        await d.shot('c07-crown', { hi: true });
        await d.fightBoss({ at: [13.0, 17.0], script: 'dreams.crown', done: d.F('story:finale_done') });
        d.milestone('finale done');
      },
    },
  },

  plan: {
    finale: {
      scenes: {
        'dreams.night_before': 90, 'heart.arrival': 40, 'dreams.kade': 60, 'dreams.nyx': 60, 'dreams.orion': 60,
        'dreams.sera': 60, 'heart.crown_lift': 5, 'dreams.crown': 190,
      },
      bosses: { heart_elite_rings: 29, heart_elite_spire: 30, heart_boss_warden: 32 },
    },
  },

  // a leg ends where the walked distance really resets: a lift (its arrival restarts the grace), a
  // Med-Station rest, a boss
  legs: [
    {
      chapter: 'finale', label: 'Heart: the Dock -> the causeway -> the pylon -> the chord -> the Wardens -> the first lift', map: 'heart',
      flags: ['sw:heart:t1'],
      points: [[5.8, 43.2], [9.6, 42.6], [12.6, 40.0], [16.6, 35.0], [13.2, 44.5], [14.6, 46.0], [29.0, 46.0], [30.6, 42.0],
        [29.6, 38.4], { fight: 'heart_wardens' }, [31.6, 32.4]],
    },
    {
      chapter: 'finale', label: 'Heart: the Second Tier -> the north chord -> the pylon -> the rest', map: 'heart',
      flags: ['sw:heart:t1'],
      points: [[63.8, 51.7], [61.4, 48.6], [64.2, 42.6], [61.0, 39.0], [59.0, 39.0], { fight: 'heart_choir' }, [48.4, 39.0],
        [49.3, 35.2], [45.7, 38.4], [45.6, 42.5]],
    },
    {
      chapter: 'finale', label: 'Heart: the rest -> the Choirlit Echoes -> the second lift', map: 'heart',
      flags: ['sw:heart:t1', 'sw:heart:t2'],
      points: [[45.6, 42.5], [46.4, 46.4], { fight: 'heart_elite_rings' }, [43.6, 53.0]],
    },
    {
      chapter: 'finale', label: 'Heart: the Third Tier -> both pylons -> the Echoes -> the processional -> the Sanctum', map: 'heart',
      flags: ['sw:heart:t1', 'sw:heart:t2', 'sw:heart:t3a', 'sw:heart:t3b'],
      points: [[65.7, 4.3], [62.6, 7.0], [66.0, 14.0], [61.4, 21.0], [56.5, 22.6], [51.6, 21.0], [47.6, 16.0],
        { fight: 'heart_elite_spire' }, [44.0, 13.5], [37.6, 13.5], [31.8, 12.6]],
    },
    {
      chapter: 'finale', label: 'Heart: the Sanctum -> the crown lift -> the Crown -> WARDEN', map: 'heart',
      flags: ['sw:heart:t1', 'sw:heart:t2', 'sw:heart:t3a', 'sw:heart:t3b'],
      points: [[31.8, 12.6], [34.0, 6.0], { fight: 'heart_boss_warden' }],
    },
  ],
};
