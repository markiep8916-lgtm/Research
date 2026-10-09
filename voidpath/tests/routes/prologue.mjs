// Human-pace route of the prologue (tools/human-pace.mjs, G2 T-1): a curious first-time player on
// the critical path, from New Journey to the CHAPTER ONE card. Ported from the G2 design review.
// Segments chain title -> pro.lower -> pro.bridge -> ch1 (driftmarket.mjs).
// `plan`: WRITING 5.10's critical-path scene plans; `legs`: the zone walking for expected fights.

export default {
  segments: {
    // the cold open, Kade wakes, the tutorial, Sera, up the Spine Corridor to Engineering
    title: {
      next: 'pro.lower',
      async run(d) {
        await d.newJourney();
        await d.pump(d.F('story:kade_awake'), { minVt: 5 });
        await d.shot('p01-awake', { hi: true });
        d.milestone('awake');
        // a curious first look: the cryo terminal and the corner chest
        await d.use('term_cryo');
        await d.use('cryo_1', { optional: true });
        // the door north of the pods: the tutorial
        await d.go(7.0, 18.8, { until: d.F('seen:halcyon:tutorial') });
        await d.pump(d.F('pro:medbay_alarm'));
        d.milestone('tutorial done');
        // the medbay: Sera ("We'll find him.")
        d.choose(0);
        await d.go(7.0, 30.6, { until: d.F('story:sera_joined') });
        await d.pump(d.F('story:sera_joined'));
        d.milestone('sera joined');
        await d.med('med_bay');
        await d.use('term_medbay');
        await d.use('med_1', { optional: true });
        // up the Spine Corridor: terminals and the west chest
        await d.use('cor_1', { optional: true });
        await d.use('term_nav');
        await d.use('term_window');
        // Engineering: the hammering
        await d.go(20.6, 19.4, { until: d.F('seen:halcyon:hammering') });
      },
    },
    // Engineering (Kade and Sera): the hammering, Orion, Brandt's crate, Nyx at the bridge door
    'pro.lower': {
      next: 'pro.bridge',
      async run(d) {
        if (d.jumped) await d.go(20.6, 19.4, { until: d.F('seen:halcyon:hammering') });
        await d.pump();
        await d.use('eng_1', { optional: true });
        await d.use('term_reactor');
        await d.use('eng_3', { optional: true });
        await d.use('eng_4', { optional: true });
        await d.use('eng_2', { optional: true });     // the Stimulus Chip
        // Reactor Control: Orion behind the shutters
        await d.go(24.0, 35.4, { until: d.F('story:orion_joined') });
        await d.pump(d.F('story:orion_joined'));
        d.milestone('orion joined');
        await d.pump(null, { minVt: 1 });
        // Orion's equip tip has played (Stimulus Chip held): slot it, as he says
        if (await d.eval(() => !!window.__VP.ctx.state.inventory.eq_x_stim_chip)) await d.equipAccessory(0, 'eq_x_stim_chip');
        await d.shot('p05-orion');
        // Brandt's crate in the Coolant Gallery: the keycard
        await d.use('brandt');
        await d.pump();
        d.milestone('keycard');
        await d.journal('journal-prologue-keycard');
        // to the antechamber: Nyx and the Sentinel squad
        await d.go(38.6, 14.6, { until: d.F('story:nyx_joined') });
        await d.pump(d.F('story:nyx_joined'));
        d.milestone('nyx joined');
        await d.use('term_security');
        await d.med('med_ante');
        // the bridge door
        await d.use('bridge_door');
        await d.pump(d.F('seen:halcyon:bridge_open'));
      },
    },
    // the SENTINEL (Retry after a loss), the aftermath, the CH1 card
    'pro.bridge': {
      level: 7,
      next: 'ch1',
      async run(d) {
        if (d.jumped) await d.med('med_ante', { talk: false });
        await d.go(41.0, 9.0);
        await d.shot('p08-bridge', { hi: true });
        await d.fightBoss({
          at: [39.6, 6.6], script: 'prologue.sentinel', done: d.F('story:prologue_done'),
          onLoss: async () => {
            await d.med('med_ante', { talk: false });
            // C1-6: the checkpoint after the door; without it Retry relocks the door
            if (!(await d.eval(() => window.__PACE.flag('story:bridge_unlocked')))) {
              d.note('after Retry the bridge door is locked again (checkpoint predates the unlock); unlocking it again');
              await d.use('bridge_door');
              await d.pump(d.F('story:bridge_unlocked'));
            }
          },
        });
        await d.pump(`${d.F('story:prologue_done')} && window.__VP.ctx.state.story.chapter === "ch1"`, { maxVt: 600 });
        d.milestone('prologue done');
        await d.shot('p09-ch1-bridge', { hi: true });
      },
    },
  },

  plan: {
    prologue: {
      scenes: {
        'prologue.new_journey': 65, 'prologue.tutorial': 25, 'prologue.sera_wakes': 45, 'prologue.spine_drones': 8,
        'prologue.orion_rescue': 40, 'prologue.gallery_ambush': 8, 'prologue.equip_tip': 8, 'prologue.keycard': 8,
        'prologue.nyx_door': 50, 'prologue.bridge_open': 5, 'prologue.sentinel': 85,
      },
      bosses: { pro_boss_sentinel: 7 },
    },
  },

  // critical-path zone walking (tools/expected-fights.mjs); a { fight } point is a scripted fight
  legs: [
    {
      chapter: 'prologue', label: 'Kade + Sera: medbay -> Engineering', map: 'halcyon', flags: ['story:sera_joined'],
      points: [[7, 31], [7, 20], { fight: 'pro_spine_drones' }, [7, 14.5], [20.5, 14.5], [20.5, 19.5]],
    },
    {
      chapter: 'prologue', label: '+ Orion: gallery -> Brandt -> antechamber', map: 'halcyon', flags: ['story:sera_joined', 'story:orion_joined'],
      points: [[21, 35.4], { fight: 'pro_gallery_ambush' }, [15.75, 36.2], [29.5, 31], [29.5, 28], [20.5, 19], [20.5, 14.5], [37.5, 14.5]],
    },
  ],
};
