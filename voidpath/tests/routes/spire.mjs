// Human-pace route of chapter 3 (tools/human-pace.mjs, G2 T-1): the Halcyon, the Moth's flight to the
// Security Spire, the Checkpoint, the Barracks and the first grid, the swap and Kade's override, the
// cadets, the Mk-III on the Officers' Deck, Kade's quarters and the Oathkeeper, the oath recording in
// the Training Hall, COMMANDER VOSS and the CHAPTER FOUR card.
// Chain: ch3 -> ch3.cells -> ch3.upper -> ch3.voss.

// the Checkpoint's barricades alternate north and south, so the lane weaves between them
const SLALOM = [[20, 52.5], [22.5, 52.5], [29, 49], [31.5, 49], [38, 52.5], [40.5, 52.5], [47, 49], [49.5, 49], [56, 52.5],
  [58.5, 52.5], [66.5, 48.5]];
// the Barracks: the aisle between the bunks (north) and the pillar and mess table (south), then under
// the west partition
const BARRACKS = [[66.5, 45.5], [60, 43.6], [53, 43.6], [46, 43.8], [40, 44], [35, 45.6], [31, 45.6], [24, 43.6]];
// the Training Hall's obstacle walls: under the first, over the second, under the third
const HALL = [[3, 21.5], [18, 21.5], [20.5, 21], [24.5, 15.6], [33, 16], [37, 16], [50, 21.5], [52.5, 21.5], [66.5, 15.6]];

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
        await d.go(14, 51);
        await d.go(18, 51, { until: d.F('seen:spire:checkpoint') });
        await d.pump(d.F('seen:spire:checkpoint'), { maxVt: 900 });
        d.milestone('checkpoint');
        await d.use('cp_cache', { optional: true });
        for (const [x, z] of SLALOM) await d.go(x, z);
        await d.shot('c02-checkpoint', { hi: true });
        // the Barracks: the riot drone on the way west, the first grid and its terminal
        for (const [x, z] of BARRACKS.slice(0, 3)) await d.go(x, z);
        await d.go(45, 44, { until: d.F('seen:spire:riot') });
        await d.pump(d.F('seen:spire:riot'), { maxVt: 900 });
        d.milestone('riot drone');
        await d.use('bunk_locker', { optional: true });
        for (const [x, z] of BARRACKS.slice(4)) await d.go(x, z);
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
        // the armory's Security Plate sits at its far west end: a side trip, not the critical path
        await d.go(16.5, 39.5);
        await d.go(29, 38.5);
        await d.use('grid_t2');
        await d.pump();
        // a toggle: a second press swaps the grids back, and the player presses it again
        if (!(await d.eval(() => !!window.__VP.ctx.state.flags['sw:spire:grid_swap']))) {
          await d.use('grid_t2');
          await d.pump();
        }
        await d.journal('journal-ch3-swap');
        await d.go(33.5, 38);
        await d.use('grid_t3');
        await d.pump(d.F('sw:spire:override'));
        await d.journal('journal-ch3-override');
        await d.go(50, 39);
        await d.shot('c03-cells', { hi: true });
        await d.use('cells');
        await d.pump(d.F('story:cadets_freed'), { maxVt: 900 });
        d.milestone('cadets freed');
        await d.med('med_cells');
        await d.use('lift_block');
        await d.pump('window.__PACE.snap().z < 34', { maxVt: 200 });
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
        await d.go(10.5, 31.6);
        await d.go(10.5, 27.5, { until: d.F('seen:spire:quarters') });
        await d.pump(d.F('seen:spire:quarters'), { maxVt: 600 });
        await d.use('oathkeeper');
        d.milestone('oathkeeper');
        await d.use('kade_desk', { optional: true });
        await d.go(10.5, 30.5);
        await d.go(2.5, 30.5);
        await d.go(2.5, 26.5);
        await d.go(2.5, 22.5);
        for (const [x, z] of HALL.slice(0, 3)) await d.go(x, z);
        await d.shot('c04-training', { hi: true });
        await d.use('recording');
        // the recording ends on the climb's last step: the Journal names the command deck
        await d.pump('window.__VP.ctx.state.story.objective === "ch3.command"', { maxVt: 900 });
        d.milestone('oath recording');
        for (const [x, z] of HALL.slice(4)) await d.go(x, z);
        await d.use('lift_hall');
        await d.pump('window.__PACE.snap().z < 13', { maxVt: 200 });
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

  // the same walking as the segments above, chest detours included (expected-fights splits it by zone)
  legs: [
    {
      chapter: 'ch3', label: 'Checkpoint: dock -> cache -> barracks door', map: 'spire', flags: [],
      points: [[6, 51], [14, 51], [16, 51], { fight: 'spire_troopers' }, [18, 51], [22.5, 49.4], ...SLALOM, [66.5, 46.5]],
    },
    {
      chapter: 'ch3', label: 'Barracks: door -> bunk locker -> the first grid', map: 'spire', flags: [],
      points: [...BARRACKS.slice(0, 4), { fight: 'spire_riot' }, [37, 43.4], ...BARRACKS.slice(4), [23.5, 43.4]],
    },
    {
      chapter: 'ch3', label: 'Deck 4: the grid -> armory -> junction -> cells', map: 'spire', flags: ['sw:spire:grid_a'],
      points: [[23.5, 43.4], [16.5, 42.5], [16.5, 39.5], [29, 38.5], [30.5, 36.2], [33.5, 38], [34.5, 36.2], [50, 39], [61, 36.4]],
    },
    {
      chapter: 'ch3', label: 'Holding Cells: the console -> Med-Station -> lift', map: 'spire', flags: ['story:cadets_freed'],
      points: [[61, 36.4], [68.5, 36.1], [69, 38.4]],
    },
    {
      chapter: 'ch3', label: 'Officers\' Deck: lift -> quarters -> stairwell', map: 'spire', flags: ['story:cadets_freed'],
      points: [[67, 32], [42.5, 31.6], { fight: 'spire_mk3_guard' }, [10.5, 31.6], [10.5, 27.5], [13.6, 26.3], [11.5, 26.6], [10.5, 30.5],
        [2.5, 30.5], [2.5, 26.5], [2.5, 22.5]],
    },
    {
      chapter: 'ch3', label: 'Training Hall: stairwell -> recording -> lift', map: 'spire', flags: ['story:cadets_freed'],
      points: [[2.5, 22.5], ...HALL.slice(0, 3), [24.5, 15.4], ...HALL.slice(4)],
    },
  ],
};
