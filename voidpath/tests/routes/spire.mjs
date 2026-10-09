// Human-pace route of chapter 3 (tools/human-pace.mjs, G2 T-1): the Halcyon, the Moth's flight to the
// Security Spire, the Checkpoint, the Barracks and the first grid, the swap and Kade's override, the
// cadets, the Mk-III on the Officers' Deck, Kade's quarters and the Oathkeeper, the oath recording in
// the Training Hall, COMMANDER VOSS and the CHAPTER FOUR card.
// Chain: ch3 -> ch3.cells -> ch3.upper -> ch3.voss.

// The walker finds its own way round barricades, bunks and the Training Hall's walls (the shortest
// walkable path, as expected-fights joins the legs), so the route names only the places a player
// heads for: triggers, chests on the way, terminals, lifts.

/** Rides a same-map lift; a freed cadet walking past can take the Confirm, so the player presses again. */
async function ride(d, id, arrived) {
  for (let k = 0; ; k++) {
    await d.use(id);
    try {
      await d.pump(arrived, { maxVt: 30 });
      return;
    } catch (e) {
      if (k >= 2) throw e;
    }
  }
}

export default {
  segments: {
    // the Halcyon after the CHAPTER THREE card: a word with BOLT, the Starchart, the Spire
    ch3: {
      level: 17,
      next: 'ch3.cells',
      async run(d) {
        await d.use('bolt', { optional: true });
        await d.fly('starchart', 'Security Spire');
        await d.pump(d.F('seen:spire:arrival'), { maxVt: 900 });
        d.milestone('spire arrival');
        await d.shot('c01-dock', { hi: true });
        // the Checkpoint: two troopers vault the barricade at the first lane
        await d.go(18, 51, { until: d.F('seen:spire:checkpoint') });
        await d.pump(d.F('seen:spire:checkpoint'), { maxVt: 900 });
        d.milestone('checkpoint');
        await d.use('cp_cache', { optional: true });
        await d.shot('c02-checkpoint', { hi: true });
        // the lane weaves between the barricades to the Barracks door; the riot drone on the way west,
        // the bunk locker, the first grid and its terminal
        await d.go(66.5, 46, { label: 'barracks door' });
        await d.go(45, 44, { until: d.F('seen:spire:riot') });
        await d.pump(d.F('seen:spire:riot'), { maxVt: 900 });
        d.milestone('riot drone');
        await d.use('bunk_locker', { optional: true });
        await d.use('grid_t1');
        await d.pump(d.F('spire:said_t1'));
        if (!(await d.eval(() => !!window.__VP.ctx.state.flags['sw:spire:grid_a']))) {
          await d.use('grid_t1');
          await d.pump();
        }
        await d.journal('journal-ch3-grids');
        await d.go(16.5, 42.5, { label: 'deck 4' });
      },
    },
    // Deck 4: the armory, the swap, Kade's override, the cadets
    'ch3.cells': {
      level: 19,
      next: 'ch3.upper',
      async run(d) {
        // the armory opens west of the door: its Security Plate is gear on the path (opened from the
        // front, so the facing taps do not slide the leader into the gap by the wall)
        await d.go(2, 36.7, { tol: 0.45, run: false, label: 'armory plate' });
        await d.use('armory_plate', { optional: true });
        await d.use('grid_t2');
        await d.pump();
        // a toggle: a second press swaps the grids back, and the player presses it again
        if (!(await d.eval(() => !!window.__VP.ctx.state.flags['sw:spire:grid_swap']))) {
          await d.use('grid_t2');
          await d.pump();
        }
        await d.journal('journal-ch3-swap');
        await d.use('grid_t3');
        await d.pump(d.F('sw:spire:override'));
        await d.journal('journal-ch3-override');
        await d.go(50, 39);
        await d.shot('c03-cells', { hi: true });
        await d.use('cells');
        await d.pump(d.F('story:cadets_freed'), { maxVt: 900 });
        d.milestone('cadets freed');
        await d.med('med_cells');
        await ride(d, 'lift_block', 'window.__PACE.snap().z < 34');
      },
    },
    // Deck 5: the Mk-III, Kade's quarters and the Oathkeeper, the stairwell, the oath recording
    'ch3.upper': {
      level: 20,
      next: 'ch3.voss',
      async run(d) {
        // the Mk-III guards the deck at x 40.5: its confront radius (3) starts at x 43.5
        await d.go(42.5, 31.6, { until: d.F('spire:mk3_down') });
        await d.pump(d.F('spire:mk3_down'), { maxVt: 900 });
        d.milestone('mk-iii');
        await d.go(10.5, 27.5, { until: d.F('seen:spire:quarters') });
        await d.pump(d.F('seen:spire:quarters'), { maxVt: 600 });
        await d.use('oathkeeper');
        d.milestone('oathkeeper');
        await d.use('kade_desk', { optional: true });
        // the stairwell's Med-Station, then up into the Training Hall, round its obstacle walls to the recording
        await d.med('med_stairs');
        await d.go(8.5, 21.5, { tol: 1.5, label: 'training hall' });
        await d.shot('c04-training', { hi: true });
        await d.use('recording');
        // the recording ends on the climb's last step: the Journal names the command deck
        await d.pump('window.__VP.ctx.state.story.objective === "ch3.command"', { maxVt: 900 });
        d.milestone('oath recording');
        await ride(d, 'lift_hall', 'window.__PACE.snap().z < 13');
      },
    },
    // COMMANDER VOSS (Retry after a loss), her upload, the CHAPTER FOUR card
    'ch3.voss': {
      level: 22,
      next: 'ch4',
      async run(d) {
        await d.med('med_lobby');
        await d.shot('c05-command', { hi: true });
        await d.fightBoss({
          at: [52.5, 8.5], script: 'spire.voss', done: d.F('story:ch3_done'),
          onLoss: async () => { if ((await d.snap()).map === 'spire') await d.med('med_lobby', { talk: false }); },
        });
        await d.pump(`${d.F('story:ch3_done')} && window.__VP.ctx.state.story.chapter === "ch4"`, { maxVt: 1200 });
        d.milestone('ch4 card');
        await d.vwait(2);
      },
    },
  },

  plan: {
    ch3: {
      // WRITING 5.10: flight 5 (the prologue's travel line), arrival 45, cadets 50, quarters 12, oath 55, voss 145
      scenes: {
        'spire.arrival': 45, 'spire.cadets': 50, 'spire.quarters': 12, 'spire.oath_recording': 55, 'spire.voss': 145,
      },
      bosses: { spire_boss_voss: 22 },
    },
  },

  // the same walking as the segments above, chests on the way included (expected-fights splits it by
  // zone). One leg per stretch the game counts without a break: explore.js keeps the walked distance
  // through rests, lifts within a zone and puzzle rooms, and restarts it only after a fight or on
  // entering another zone (the lift from Deck 4 to Deck 5).
  legs: [
    {
      chapter: 'ch3', label: 'Lower decks: arrival -> cache -> Barracks -> locker -> grid -> armory -> junction -> cells',
      map: 'spire', flags: [],
      points: [[14.2, 50.4], [16, 51], { fight: 'spire_troopers' }, [22.5, 49.4], [66.5, 46], [46, 44], { fight: 'spire_riot' },
        [37, 43.4], [23.5, 43.4], [16.5, 42.5], [2, 36.7], [30.5, 36.4], [34.5, 36.4], [50, 39], [61, 36.4]],
    },
    {
      chapter: 'ch3', label: 'Holding Cells: the console -> Med-Station -> lift', map: 'spire', flags: ['story:cadets_freed'],
      points: [[61, 36.4], [68.5, 36.4], [69, 38.4]],
    },
    {
      chapter: 'ch3', label: 'Deck 5: lift -> quarters -> stairwell Med-Station -> Training Hall -> recording -> lift',
      map: 'spire', flags: ['story:cadets_freed'],
      points: [[67, 32], [42.5, 31.6], { fight: 'spire_mk3_guard' }, [10.5, 27.5], [13.6, 26.3], [11.5, 26.6], [5.2, 26.4],
        [2.5, 26.5], [8.5, 21.5], [24.5, 15.4], [66.5, 15.4]],
    },
  ],
};
