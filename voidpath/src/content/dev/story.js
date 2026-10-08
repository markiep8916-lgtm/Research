// dev: test-only story content (PURE, S2a). Reachable only through debug hooks:
//
//   jumps     'dev' (the four travelers at level 8 in the dev_box Test Hall), 'dev.fight' (the same
//             with the scripted fight armed)
//   scripts   dev.demo      every cs call in turn; dev:step = n marks each step, args.hold (seconds)
//                           pauses after each one for screenshots, args.ending runs cs.ending() last
//             dev.npc_talk  the TESTER on her walking path
//             dev.shard     the dev_box crystal: a replayed memory
//             dev.fight     a once-trigger fight in the Test Hall (Retry / auto-skip tests)
//             dev.goto_battle   cs.battle issued during a cs.goto fade
//   extends   dev_box: the fight trigger (east of the entry, armed by dev:fight_armed);
//             halcyon: an exit back to dev_box at halcyon:start while dev:exits is set
//   a hidden Starchart destination 'dev_box' (dev:charted) for travel tests

const HALL = { x: 9.5, z: 17.5 };   // dev_box 'entry' spawn
const at = (dx, dz) => [HALL.x + dx, HALL.z + dz];

async function step(cs, args, n) {
  cs.flag('dev:step', n);
  if (args.hold) await cs.wait(args.hold);
}

const scripts = {
  'dev.demo': async (cs, args = {}) => {
    // 1. scene, music, letterbox, banner
    cs.scene({ leader: 'kade' });
    cs.music('warden', { fade: 1 });
    await cs.letterbox(true);
    await cs.banner('Dev Box', 'Cutscene demo');
    await cs.camera.view({ pitch: 30, dist: 14 });
    await step(cs, args, 1);

    // 2. actors: spawn a hologram, face, pose, emote
    await cs.spawn('dev_holo', { sprite: 'holo', x: at(2.2, -1.3)[0], z: at(2.2, -1.3)[1], facing: 'left', hologram: true, name: 'HALCYON' });
    cs.face('leader', 'dev_holo');
    cs.anim('dev_holo', 'idle_down');
    await cs.emote('dev_holo', '!');
    await cs.emote('leader', '?', { wait: false });
    await step(cs, args, 2);

    // 3. dialogue: a traveler with expressions, narration, a mood speaker (gold grade, sigil screens)
    await cs.say('KADE', 'Every cutscene call, one after another. Let us begin.', { expr: 'determined' });
    await cs.say([
      { speaker: 'KADE', text: 'Lines can carry *emphasis*.' },
      'And a plain string continues the same speaker.',
    ]);
    await cs.narrate('The deck hums. Somewhere, a pump turns over.');
    await cs.say([
      { speaker: 'DEV LOCK', text: 'A voice with a mood. The screens turn to the sigil while it speaks.' },
      { speaker: 'KADE', text: 'And the look returns once it stops.' },
    ]);
    await cs.say({ speaker: 'NYX', text: 'Radio check. You cannot see me, and that is fine.', offscreen: true });
    await step(cs, args, 3);

    // 4. the party steps out of the leader, moves, poses, and steps back in
    const sera = cs.test('party:sera');
    await cs.gather(sera ? { kade: at(-0.9, -0.4), sera: at(0.9, -0.4) } : { kade: at(0, -0.4) });
    if (sera) {
      await cs.say('SERA', 'Out of the leader and onto my own two feet.', { expr: 'smile' });
      await cs.move('sera', [at(2, -0.6), at(2, 0.4)], { speed: 2.2, face: 'leader' });
      cs.anim('sera', 'kneel');
      await cs.wait(0.6);
      cs.anim('sera', null);
    }
    cs.face('tester', 'leader');
    await cs.emote('tester', 'note');
    await cs.ungather();
    await step(cs, args, 4);

    // 5. camera: focus, pan, reset
    await cs.camera.focus('dev_holo', { zoom: 0.8, ms: 700 });
    await cs.camera.pan([at(-4, -0.5), at(4, -0.5)], { sec: 2 });
    await cs.camera.reset({ ms: 500 });
    await step(cs, args, 5);

    // 6. screen: fades, flash, shake, fx, memory look, screens
    await cs.fadeOut({ ms: 500, color: '#0a1830' });
    await cs.narrate('Narration over a coloured fade.');
    await cs.fadeIn({ ms: 500 });
    cs.flash('#9fe8ff', 0.3, 0.6);
    cs.shake(0.08, 0.4);
    cs.fx({ grade: { saturation: 0.7 } });
    await cs.wait(0.4);
    cs.memory(true);
    await cs.say({ speaker: 'HALCYON', text: 'A memory replays in cyan and violet.', offscreen: true });
    cs.memory(false);
    cs.screens('warden_sigil', 'dev');
    await cs.caption('Screens follow the script', { ms: 1500 });
    cs.screens(null);
    await step(cs, args, 6);

    // 7. world: lights, particles, living props
    cs.light('water', { color: '#ffd27a', intensity: 20 });
    cs.particles('holo', [at(2.2, -1.3)[0], 1, at(2.2, -1.3)[1]], { count: 24 });
    const pod = cs.prop('dev_pod');
    await cs.say('KADE', pod ? 'The pod reports in.' : 'No pod answers.');
    cs.light('water', { color: '#3fd6ff', intensity: 12 });
    await step(cs, args, 7);

    // 8. state: flags, tests, objectives, items, credits, party, leader, heal, saves
    cs.flag('dev:demo_seen');
    cs.objective(cs.test('dev:demo_seen & party:sera') ? 'dev.objective' : 'dev.side');
    cs.chapter('prologue');
    await cs.give('medigel', 2);
    cs.take('medigel', 1);
    cs.credits(25);
    if (cs.test('party:nyx')) {
      await cs.leave('nyx');
      await cs.join('nyx');
    }
    if (sera) await cs.setLeader('sera');
    await cs.setLeader('kade');
    await cs.heal();
    cs.checkpoint();
    cs.save();
    await step(cs, args, 8);

    // 9. a choice
    const pick = await cs.choice('Run the flow calls too?', ['Yes', 'Skip them'], { speaker: 'KADE', expr: 'determined', cancelIndex: 1 });
    await step(cs, args, 9);

    if (pick === 0) {
      // 10. flow: a map change and back, a battle, the shop, the Starchart, a nested script, a card
      await cs.goto('halcyon', 'start');
      await cs.say('KADE', 'Same script, another map.');
      await cs.goto('dev_box', 'entry');
      cs.face('leader', 'up');
      await step(cs, args, 10);
      const result = await cs.battle('dev_party1', { seed: 7 });
      await cs.say('KADE', result === 'victory' ? 'Battle won. The script carries on.' : 'That went badly.');
      await step(cs, args, 11);
      await cs.shop('fabricator');
      cs.flag('dev:charted');
      await cs.travel();
      await cs.run('dev.npc_talk', { npc: { id: 'tester' } });
      await cs.card('prologue');
      await step(cs, args, 12);
    }

    // 13. clean up
    await cs.despawn('dev_holo');
    cs.music('map');
    cs.sfx('confirm');
    await cs.letterbox(false);
    await step(cs, args, 13);
    if (args.ending) await cs.ending();
  },

  'dev.npc_talk': async (cs, args = {}) => {
    const id = args.npc?.id || 'tester';
    cs.face(id, 'leader');
    await cs.say([
      { speaker: 'TESTER', text: 'I walk this hall so the actors have somewhere to be.' },
      { speaker: 'TESTER', text: 'Talk to me again and I will say the same thing. That is the job.', expr: 'smile' },
    ]);
  },

  'dev.shard': async (cs) => {
    cs.memory(true);
    await cs.spawn('dev_mem_a', { sprite: 'kade', x: 34.6, z: 5.6, facing: 'right', hologram: true, name: 'MEMORY' });
    await cs.spawn('dev_mem_b', { sprite: 'orion', x: 36.4, z: 5.6, facing: 'left', hologram: true, name: 'MEMORY' });
    await cs.narrate('The crystal replays two figures in cyan light.');
    await Promise.all([cs.despawn('dev_mem_a'), cs.despawn('dev_mem_b')]);
    cs.memory(false);
  },

  // cs.battle issued while cs.goto's fade still runs: the shatter waits for the fade, and the script
  // resumes only after the field has faded back in (dev:resumed marks that moment)
  'dev.goto_battle': async (cs) => {
    const arrival = cs.goto('dev_box', 'deck_door');
    const result = await cs.battle('dev_party1', { seed: 3 });
    cs.flag('dev:resumed', result);
    await arrival;
    await cs.say('KADE', 'Back on the Sky Deck after the fight.');
  },

  'dev.fight': async (cs) => {
    cs.letterbox(true);
    const sera = cs.test('party:sera');
    await cs.gather(sera ? { kade: [15.0, 16.2], sera: [14.2, 16.9] } : { kade: [15.0, 16.2] });
    await cs.say('KADE', 'Pre-fight line. After a Retry this part is skipped.');
    if (sera) await cs.say('SERA', 'Then let us make the second try count.', { expr: 'determined' });
    await cs.ungather();
    const result = await cs.battle('dev_party1', { seed: 11 });
    await cs.say('KADE', `Aftermath: ${result}. This line always plays.`);
    cs.flag('dev:fight_won');
    cs.save();
  },
};

export default {
  scripts,
  objectives: {
    'dev.objective': { chapter: 'prologue', text: 'Run every cutscene call.', hint: 'debug.runScript("dev.demo")',
      boltHint: 'Every call. In order. I am keeping count.', target: { map: 'dev_box', x: 9.5, z: 17.5 } },
    'dev.side': { chapter: 'prologue', text: 'An optional dev favour.', side: true, when: 'dev:demo_seen' },
  },
  speakers: {
    TESTER: { portrait: 'sera', accent: '#7fe3ff' },
    'DEV LOCK': { sigil: 'warden_sigil', accent: '#ffd27a', textSpeed: 0.6, sfx: 'choir', mood: 'warden' },
  },
  destinations: [
    { id: 'dev_box', name: 'Dev Box', subtitle: 'Test Deck', desc: 'A test deck for every world system.',
      map: 'dev_box', spawn: 'entry', unlock: 'dev:charted', visible: 'dev:charted', order: 99 },
  ],
  jumps: {
    dev: { chapter: 'prologue', map: 'dev_box', spawn: 'entry', level: 8, party: ['kade', 'sera', 'orion', 'nyx'], leader: 'kade',
      flags: ['dev:exits'], objective: 'dev.objective' },
    'dev.fight': { chapter: 'prologue', map: 'dev_box', spawn: 'entry', level: 8, party: ['kade', 'sera', 'orion', 'nyx'], leader: 'kade',
      flags: ['dev:fight_armed'], objective: 'dev.objective' },
  },
  extends: {
    // a way back from halcyon:start (dev_box's south door leads there) while dev:exits is set
    halcyon: {
      interactables: [
        { id: 'dev.door', kind: 'exit', x: 6.55, z: 20.3, r: 0.3, reach: 0.6, label: 'Dev Box', icon: 'travel',
          to: { map: 'dev_box', spawn: 'from_halcyon' }, transition: 'fade', when: 'chapter>=prologue & dev:exits' },
      ],
    },
    dev_box: {
      triggers: [
        { id: 'dev.fight', on: 'enter', rect: [13.6, 15.2, 17.8, 17.6], when: 'chapter>=prologue & dev:fight_armed & !dev:fight_won', once: true, script: 'dev.fight' },
      ],
    },
  },
};
