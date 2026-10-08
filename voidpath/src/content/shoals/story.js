// shoals: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5; lines per WRITING.md 5.3).
//
// Chapter 1, between Driftmarket's Ruse scenes and the return:
//   shoals.enter            Shoals load trigger: the singing ice
//   shoals.meridian_arrival Meridian load trigger (key): the broken spine, "Not all hands", two levers
//   shoals.lever            each emergency lever (switch script); the first one gets Orion's line
//   shoals.power_restored   flag trigger once both levers are on: story:meridian_power
//   shoals.varo_log         the captain's log (key, binding id): story:varo_log, the reactor hall unseals
//   shoals.maw              the Maw (key, field boss): battle, aftermath, lattice_coil, save, then
//                           cs.goto('driftmarket', 'dock') and cs.run('driftmarket.return') (4.1)
// Field scripts: shoals.view, shoals.nyx_lockbox (Nyx), shoals.orion_terminal (Orion), shoals.ribbons,
// shoals.quarters_door, shoals.reactor_door, shoals.long_gun, shoals.varo_log_after, shoals.colossus.
// Objectives ch1.restore_power, ch1.varo_quarters, ch1.find_coil. Local flags: shoals:lockbox,
// shoals:danjuma, shoals:ribbon_tied.

const SPINE_Y = 14.6;   // meridian: the spine's middle row (entry spawn row)

// Gather slots around the leader, pushed into the open side of the room it stands in.
function around(cs, dx, dz) {
  const l = cs.actor('leader');
  const x = l ? l.x : 0, z = l ? l.z : 0;
  return [x + dx, z + dz];
}

const scripts = {
  // ---------------------------------------------------------------- the Shoals

  'shoals.enter': async (cs) => {
    cs.letterbox(true);
    await cs.gather({ nyx: [3.6, 4.7], orion: [3.2, 6.5] });
    cs.face('nyx', 'right');
    // out to the arches and the planet, then back to the party before anyone speaks
    await cs.camera.pan([[8, 4.6], [13, 3.4], [4.6, 5.2]], { sec: 3.4 });
    await cs.say('NYX', 'The Shoals. Mind the ice. It sings before it breaks.');
    // the ice answers: three cold notes
    for (const pitch of [0.5, 0.63, 0.75]) {
      cs.sfx('shard', { pitch, volume: 0.7 });
      await cs.wait(0.35);
    }
    cs.particles('snow', [10, 2.6, 2], { count: 40 });
    await cs.emote('orion', '?');
    await cs.say('ORION', 'Ice doesn\'t sing. ...I stand corrected.', { expr: 'surprised' });
    await cs.ungather();
    await cs.camera.reset();
  },

  'shoals.view': async (cs) => {
    await cs.narrate('Tethys fills the arches, banded amber and cream. The rings glitter all the way down.');
    const lines = {
      kade: ['KADE', 'Never seen it without glass in the way.'],
      nyx: ['NYX', 'Home looks better from out here. Don\'t tell anyone I said that.'],
      orion: ['ORION', 'Hello, Tethys. You\'re bigger in person.'],
      sera: ['SERA', 'Theo would have his face pressed to this. Leaving smudges.'],
    };
    const leader = ['kade', 'nyx', 'orion', 'sera'].find((id) => cs.test(`leader:${id}`));
    if (leader) await cs.say(lines[leader][0], lines[leader][1]);
  },

  'shoals.nyx_lockbox': async (cs) => {
    cs.sfx('unlock');
    await cs.say('NYX', 'Ringborn lock. We all learn this one before we can walk.', { expr: 'smile' });
    cs.flag('shoals:lockbox');
    await cs.give('cryo_charge', 2);
    await cs.give('stim', 2);
  },

  // M3: the optional elite of Rime Hollow
  'shoals.colossus': async (cs) => {
    await cs.camera.focus('colossus', { zoom: 0.9, ms: 700 });
    cs.sfx('rumble');
    cs.shake(0.14, 0.7);
    cs.particles('frost', [52, 1.4, 24.6], { count: 40 });
    await cs.narrate('Ice shears off the wall. Something old and frozen stands up.');
    await cs.battle('shoals_elite_colossus');
    await cs.narrate('The colossus cracks apart. A heart of blue ice rolls out of the rubble.');
  },

  // ---------------------------------------------------------------- the Meridian

  'shoals.meridian_arrival': async (cs) => {
    cs.letterbox(true);
    await cs.gather({ nyx: [4.8, 14.3], kade: [3.2, 13.4], sera: [3.0, 15.8], orion: [4.4, 16.3] });
    cs.face('nyx', 'right');
    await cs.camera.focus([6.5, SPINE_Y], { zoom: 0.92, ms: 800 });
    await cs.say('NYX', 'The Meridian.');
    await cs.camera.pan([[12, SPINE_Y], [26, 13.4], [6, SPINE_Y]], { sec: 4.5 });
    cs.anim('nyx', 'hand_to_chest');
    await cs.say('NYX', 'Eighty years, and the lights never stopped.', { expr: 'sad' });
    cs.anim('nyx', null);
    await cs.say('KADE', 'The Meridian. Lost with all hands. They taught us that at the academy.');
    cs.face('nyx', 'kade');
    await cs.say('NYX', 'Not all hands.', { expr: 'determined' });
    await cs.emote('sera', '...');
    await cs.say('SERA', 'There\'s still air in here. Someone keeps it sealed.');
    await cs.say('NYX', 'We do. We come here to tie ribbons.');
    cs.flash('#ff9a3c', 0.25, 0.25);
    await cs.say('ORION', 'Emergency loop only. Two levers would wake the main bus. Hold and engineering.');
    cs.objective('ch1.restore_power');
    await cs.ungather();
    await cs.camera.reset();
  },

  'shoals.lever': async (cs, args = {}) => {
    cs.sfx('rumble', { volume: 0.6 });
    cs.shake(0.05, 0.4);
    const other = args.interactable?.id === 'lever_b' ? 'sw:meridian:lever_a' : 'sw:meridian:lever_b';
    if (cs.test(other)) return;   // the second lever: the power scene says the rest
    const z = cs.actor('leader')?.z ?? 0;
    await cs.gather({ orion: around(cs, -0.9, z < 11 ? 0.8 : -0.8) });
    await cs.say('ORION', 'One. She\'s listening.', { expr: 'smile' });
    await cs.ungather();
  },

  'shoals.power_restored': async (cs) => {
    cs.letterbox(true);
    cs.sfx('rumble');
    cs.shake(0.1, 0.8);
    cs.flag('story:meridian_power');
    cs.flash('#ffd9a0', 0.35, 0.35);
    cs.sfx('unlock');
    await cs.camera.focus('quarters_door', { zoom: 0.9, ms: 1000 });
    await cs.wait(1.0);
    await cs.camera.reset({ ms: 800 });
    const inHold = (cs.actor('leader')?.z ?? 20) < 11;
    await cs.gather({ orion: around(cs, -0.9, inHold ? 1.0 : -0.6), nyx: around(cs, 0.9, inHold ? 1.0 : 0.6) });
    await cs.say('ORION', 'Main bus is live. Hello, old girl. Eighty years is a long nap.', { expr: 'smile' });
    await cs.say('NYX', 'Her quarters just unsealed. The reactor hall wants a captain\'s code.', { expr: 'determined' });
    cs.objective('ch1.varo_quarters');
    await cs.ungather();
  },

  'shoals.quarters_door': async (cs) => {
    await cs.narrate('A dead door, rimed shut. The plate reads *QUARTERS · CAPT. I. VARO*.');
  },

  'shoals.reactor_door': async (cs) => {
    if (!cs.test('story:meridian_power')) await cs.narrate('A blast door, black with ice. Nothing on this side of it has power.');
    else await cs.narrate('A red lamp blinks over the blast door: *SEALED BY CAPTAIN\'S ORDER*.');
  },

  'shoals.ribbons': async (cs) => {
    await cs.narrate('Hundreds of ribbons, faded to the colour of rust. Some still have names stitched in.');
    if (!cs.test('party:nyx') || cs.test('shoals:ribbon_tied')) return;
    await cs.gather({ nyx: [14.6, 12.9] });
    cs.face('nyx', 'up');
    cs.anim('nyx', 'point');
    await cs.wait(0.9);
    cs.anim('nyx', 'hand_to_chest');
    await cs.say('NYX', 'One more.', { expr: 'sad' });
    cs.anim('nyx', null);
    cs.flag('shoals:ribbon_tied');
    await cs.ungather();
  },

  'shoals.orion_terminal': async (cs) => {
    await cs.say('ORION', 'Hello, old girl. You\'ve been talking to yourself for eighty years.', { expr: 'smile' });
    await cs.narrate('ENGINEERING LOG // K. Danjuma. The Sentinels are at the bulkhead. *Abel held the door.*');
    await cs.narrate('He didn\'t get out. The levers are yours now, whoever you are. Spin safe.');
    if (cs.test('shoals:danjuma')) return;
    cs.flag('shoals:danjuma');
    await cs.give('volt_charge', 2);
  },

  'shoals.varo_log': async (cs) => {
    cs.letterbox(true);
    cs.music(null, { fade: 1.2 });
    await cs.gather({ nyx: [21.5, 6.5], kade: [19.9, 7.5], sera: [23.1, 7.5], orion: [21.6, 8.5] });
    cs.face('nyx', 'up');
    cs.sfx('glitch');
    await cs.spawn('varo', { sprite: 'varo', x: 21.5, z: 5.05, facing: 'down', hologram: true, name: 'VARO', fade: 0.8 });
    await cs.camera.focus([21.5, 6.0], { zoom: 0.78, ms: 1200 });
    await cs.say('NYX', '...Great-grandma.', { expr: 'surprised' });
    cs.music('meridian', { fade: 3 });
    await cs.say([
      { speaker: 'VARO', text: 'Captain\'s log. Ines Varo. The reactor\'s gone. We\'re not going anywhere.' },
      { speaker: 'VARO', text: 'The Warden invoked the *Lullaby Directive*. Everyone sleeps until a new home is confirmed.' },
      { speaker: 'VARO', text: 'Nobody is coming to confirm anything. It means forever.' },
      { speaker: 'VARO', text: 'The Warden said sleep was mercy. I said mercy without consent is a cage.' },
      { speaker: 'VARO', text: 'God forgive me for what we did to get out.' },
    ]);
    cs.sfx('glitch', { volume: 0.5 });
    await cs.narrate('The recording loops. Ines raises a hand to the lens, and it begins again.');
    cs.anim('nyx', 'hand_to_chest');
    await cs.say('NYX', 'She looks tired. The stories never said she looked tired.', { expr: 'sad' });
    await cs.say('KADE', 'Lullaby Directive. It\'s in our charter too. Page four hundred. Nobody reads page four hundred.');
    await cs.say('ORION', 'Then WARDEN isn\'t broken. It\'s obeying something.');
    await cs.say('SERA', 'That Directive needs a failed destination. Ours hasn\'t failed. ...Has it?', { expr: 'sad' });
    await cs.despawn('varo', { fade: 0.8 });
    cs.anim('nyx', null);
    cs.flag('story:varo_log');
    cs.sfx('unlock');
    cs.shake(0.05, 0.4);
    await cs.say('NYX', 'Her code just opened the reactor hall. Let\'s take her coil. She\'d want that.', { expr: 'determined' });
    cs.objective('ch1.find_coil');
    await cs.ungather();
    await cs.camera.reset();
  },

  'shoals.varo_log_after': async (cs) => {
    await cs.narrate('The recording loops. Ines raises a hand to the lens, and it begins again.');
  },

  'shoals.long_gun': async (cs) => {
    await cs.gather({ nyx: [24.6, 9.9] });
    cs.face('nyx', 'right');
    await cs.say('NYX', 'Her rifle. ...Still zeroed.', { expr: 'sad' });
    await cs.ungather();
  },

  'shoals.maw': async (cs) => {
    cs.letterbox(true);
    await cs.gather({ kade: [46.0, 7.5], nyx: [47.6, 7.1], sera: [45.8, 8.6], orion: [47.4, 8.5] });
    cs.face('nyx', 'maw');
    cs.face('kade', 'maw');
    // the Maw and the squad in one frame
    await cs.camera.focus([48.9, 6.4], { zoom: 0.86, ms: 1000 });
    cs.particles('frost', [51, 0.4, 5.4], { count: 40 });
    await cs.narrate('Reactor heat breathes through the ice. Something vast moves beneath it.');
    await cs.say('NYX', 'Hold still. It hunts by warmth.', { expr: 'determined' });
    if (cs.actor('bolt')) await cs.emote('bolt', 'sweat');
    await cs.say('BOLT', 'I run hot. I\'m sorry.', { expr: 'sad' }); // BOLT draws sad as its worried eye
    cs.anim('maw', 'special');
    cs.sfx('emerge');
    cs.shake(0.3, 1.0);
    cs.flash('#cfefff', 0.3, 0.45);
    cs.particles('snow', [51, 1.2, 5.4], { count: 60 });
    await cs.wait(0.7);
    await cs.say('KADE', 'Contact. Spread out.', { expr: 'determined' });
    await cs.battle('shoals_boss_maw');

    // aftermath: the Maw sinks back, wounded; the coil comes home
    await cs.camera.focus('maw', { zoom: 0.92, ms: 600 });
    cs.anim('maw', 'hurt');
    cs.sfx('submerge');
    cs.particles('frost', [51, 0.4, 5.4], { count: 50 });
    cs.particles('snow', [51, 1.0, 5.4], { count: 40 });
    await cs.despawn('maw', { fade: 1.8 });
    await cs.narrate('The Maw sinks back into the black ice, wounded. Not dead.');
    await cs.camera.focus('reactor_core', { zoom: 0.85, ms: 900 });
    await cs.move('orion', [[50.2, 4.6]], { speed: 2.2, face: 'up' });
    cs.anim('orion', 'kneel');
    cs.prop('reactor')?.setState?.(false);
    cs.particles('holo', [51, 1.6, 3.6], { count: 30 });
    await cs.say('ORION', 'Come on, little one. You\'re coming home with us.', { expr: 'smile' });
    await cs.give('lattice_coil');
    cs.anim('orion', null);
    await cs.camera.reset({ ms: 700 });
    await cs.say('NYX', 'Sorry, great-grandma. Borrowing.', { expr: 'sad' });
    await cs.say('SERA', 'Can we leave before it remembers us?', { expr: 'surprised' });
    cs.save();
    await cs.goto('driftmarket', 'dock');
    await cs.run('driftmarket.return');
  },
};

// ---------------------------------------------------------------- tables

export default {
  scripts,
  // play order inside chapter 1 (Driftmarket's arrival and Ruse scenes come first, its return runs
  // nested in shoals.maw, the coil install comes last)
  scenes: [
    { id: 'shoals.enter', chapter: 'ch1', order: 30, budget: { boxes: 2, sec: 15 } },
    // jump / at: where the contact sheet stands before it runs a key scene staged in the Meridian
    { id: 'shoals.meridian_arrival', chapter: 'ch1', order: 40, key: true, budget: { boxes: 7, sec: 60 }, jump: 'ch1.wreck' },
    { id: 'shoals.power_restored', chapter: 'ch1', order: 50, budget: { boxes: 2, sec: 15 } },
    { id: 'shoals.varo_log', chapter: 'ch1', order: 60, key: true, budget: { boxes: 12, sec: 150 }, jump: 'ch1.maw', at: 'meridian:log' },
    { id: 'shoals.maw', chapter: 'ch1', order: 70, key: true, budget: { boxes: 16, sec: 120 }, jump: 'ch1.maw' },
  ],
  objectives: {
    'ch1.restore_power': {
      chapter: 'ch1', text: 'Restore the Meridian\'s emergency power.', hint: 'Two levers: the cargo hold and engineering.',
      boltHint: 'Two levers. Pull both. I\'d help, but: arms.', target: { map: 'meridian', interactable: 'lever_a' },
    },
    'ch1.varo_quarters': {
      chapter: 'ch1', text: 'Search Captain Varo\'s quarters.', hint: 'The captain\'s quarters, off the spine.',
      boltHint: 'The captain\'s room has power now. Nyx went quiet. I noticed.', target: { map: 'meridian', interactable: 'varo_log' },
    },
    'ch1.find_coil': {
      chapter: 'ch1', text: 'Find the lattice coil in the reactor hall.', hint: 'The reactor hall at the end of the spine.',
      boltHint: 'The coil is where the heat is. So is the Maw. Sorry.', target: { map: 'meridian', x: 51.0, z: 4.0 },
    },
  },
  speakers: {
    VARO: { portrait: 'varo', accent: '#ff9a3c' },
  },
  jumps: {
    'ch1.shoals': {
      chapter: 'ch1', map: 'shoals', spawn: 'from_driftmarket', level: 8,
      flags: ['story:ruse_met', 'story:maw_lore', 'dm:legend_heard'], objective: 'ch1.reach_wreck',
    },
    'ch1.wreck': {
      chapter: 'ch1', map: 'meridian', spawn: 'from_shoals', level: 10,
      flags: ['story:ruse_met', 'story:maw_lore', 'dm:legend_heard', 'seen:shoals:enter', 'chest:shoals:grotto'],
      items: { eq_x_frost_charm: 1 }, objective: 'ch1.reach_wreck',
    },
    'ch1.maw': {
      chapter: 'ch1', map: 'meridian', spawn: 'reactor_hall', level: 12,
      flags: [
        'story:ruse_met', 'story:maw_lore', 'dm:legend_heard', 'seen:shoals:enter', 'seen:meridian:arrival',
        'sw:meridian:lever_a', 'sw:meridian:lever_b', 'story:meridian_power', 'seen:meridian:power', 'story:varo_log',
        'chest:shoals:grotto', 'chest:meridian:long_gun',
      ],
      items: { eq_x_frost_charm: 1, eq_w_nyx_3: 1 }, objective: 'ch1.find_coil',
    },
  },
  doneFlags: {
    ch1: [
      'seen:shoals:enter', 'seen:meridian:arrival', 'seen:meridian:power', 'sw:meridian:lever_a', 'sw:meridian:lever_b',
      'chest:shoals:grotto', 'chest:meridian:long_gun', 'tut:untargetable', 'tut:maw_dive', 'tut:ultimateReady',
      'visited:shoals', 'visited:meridian',
    ],
  },
  preload: { meridian: ['npc:varo'] },
};
