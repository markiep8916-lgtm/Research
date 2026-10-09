// vault: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5; lines per WRITING.md 5.6,
// 6, 7, 8, 9).
//
// Chapter 4, after the Spire's CH4 card (Orion leads) and the neural interface in the antechamber:
//   vault.arrival            load trigger on vault:entry (key): they resolve out of light
//   vault.wraiths            the Data Wraiths on the Grid (visible encounter: the phase lesson)
//   vault.firewall           the Firewall Golem holding the Stacks bridge (the Mirror lesson)
//   vault.firewall_switch    its data switch (first use): the bridge to the Stacks
//   vault.swarm              the Glitch Swarms by the east relay (the shifting-weakness lesson)
//   vault.shard              every crystal: cs.run of the Nth memory in pickup order, then the
//                            objective that names the crystals left
//   vault.memory_launch / vault.memory_lullaby / vault.memory_severance   (key, binding ids)
//   vault.bolt_reveal        flag trigger after the third memory (key): the seed; the core bridge
//   vault.overwrite          the Corrupted Memory at the core gate (the Severance lesson)
//   vault.echo               the field boss (key): Echo, Orion's line, HALCYON restored, cs.save(),
//                            goto halcyon:bridge, the Ione node, the FINAL CHAPTER card
// Field scripts: the crew memory echoes (vault.crew_*), Orion's corrupted memory (vault.orion_echo,
// leader-gated), switch reactions, chest lines, the core's data stream back to the interface, the
// Archive's elite (M3), the hub and Driftmarket lines, two Party Talks.
//
// Scripts never assume who leads: travelers who speak are gathered. Staging runs under the lines
// (WRITING 1.8): walks, pans and light changes start in the background with bg() and only what the
// next line needs is awaited. Local flags: vault:wraiths_down, vault:firewall_down, vault:swarm_down,
// vault:overwrite_down, vault:bolt_hub, vault:orion_echo, vault:archon_down; vault:gold and vault:seed
// light the memory sets (WARDEN's gold, BOLT's white) while those beats play.

import { REG } from '../registry.js';

/** A cs call left running alongside others: an abort (Retry, Load, jumpTo) must not surface unhandled. */
const bg = (p) => {
  p.catch(() => {});
  return p;
};

/** Objectives owned by later chapters are set once their owner has registered them. */
function objectiveIfKnown(cs, id) {
  cs.objective(REG.objectives[id] ? id : null);
}

/** Where a talk or a crystal is: the NPC or interactable that started it, else just ahead of the leader. */
function spot(cs, args = {}, dz = 0) {
  const n = args.npc || args.interactable || args.boss;
  if (n && Number.isFinite(n.x)) return { x: n.x, z: n.z };
  const a = cs.actor('leader');
  return a ? { x: a.x, z: a.z + dz } : { x: 0, z: 0 };
}

/** Step travelers out beside a talk so they can answer (only members in the party; the leader stays). */
async function bring(cs, args, members, { dz = 1.6, dx = 1.2 } = {}) {
  const at = spot(cs, args);
  const layout = {};
  members.forEach((m, i) => {
    if (!cs.test(`party:${m}`) || cs.test(`leader:${m}`)) return;
    layout[m] = [at.x + (i % 2 ? dx : -dx), at.z + dz + (i > 1 ? 0.6 : 0)];
  });
  if (Object.keys(layout).length) await cs.gather(layout);
}

/** A gather layout with only the members in the party. */
function inParty(cs, slots) {
  const out = {};
  for (const [id, p] of Object.entries(slots)) if (cs.test(`party:${id}`)) out[id] = p;
  return out;
}

// ---------------------------------------------------------------- the crystals

// shard:vault:a (west), b (north), c (east); the objective names whichever are left
const CRYSTALS = [
  { key: 'a', name: 'west', how: 'Its relay has one switch.' },
  { key: 'b', name: 'north', how: 'Its relay needs both switches on.' },
  { key: 'c', name: 'east', how: 'Its relay switch swings the bridge.' },
];
const MEMORIES = [
  ['story:memory_launch', 'vault.memory_launch'],
  ['story:memory_lullaby', 'vault.memory_lullaby'],
  ['story:memory_severance', 'vault.memory_severance'],
];

/** The objective for the crystals still floating ('ch4.crystals' while all three are). */
function crystalObjective(cs) {
  const left = CRYSTALS.filter((c) => !cs.test(`shard:vault:${c.key}`)).map((c) => c.key).join('');
  if (!left) return;
  cs.objective(left.length === 3 ? 'ch4.crystals' : `ch4.crystals_${left}`);
}

/**
 * The memory stage in front of a crystal: hologram spots and the party's arc to the south of it,
 * so nobody stands between the camera and the memory (WRITING 1.7, frame the reveal).
 */
function stageOf(cs, args) {
  const c = spot(cs, args, -3);
  return {
    c,
    left: [c.x - 0.9, c.z + 1.9],
    right: [c.x + 0.9, c.z + 1.9],
    mid: [c.x, c.z + 1.6],
    look: [c.x, c.z + 2.6],
    party: { orion: [c.x - 2.3, c.z + 4.3], sera: [c.x - 0.8, c.z + 4.9], nyx: [c.x + 0.8, c.z + 4.9], kade: [c.x + 2.3, c.z + 4.3] },
  };
}

/** Opens a memory: the party draws up south of the crystal while the memory grade comes up. */
async function openMemory(cs, s, track) {
  cs.letterbox(true);
  cs.memory(true);
  cs.music(track, { fade: 1.2 });
  cs.sfx('shard', { pitch: 0.7 });
  cs.particles('data', [s.c.x, 0.6, s.c.z + 1.8], { count: 40 });
  bg(cs.camera.focus(s.look, { zoom: 0.84, ms: 1000 }));
  await cs.gather(inParty(cs, s.party));
}

/** Closes it: holograms fade into data, the grade and camera return. */
async function closeMemory(cs, s, ids) {
  cs.sfx('glitch', { volume: 0.5 });
  cs.particles('data', [s.c.x, 1.0, s.c.z + 1.8], { count: 30 });
  await Promise.all(ids.map((id) => cs.despawn(id, { fade: 0.6 })));
  cs.memory(false);
  cs.music('map', { fade: 1.5 });
  await cs.ungather();
}

// ---------------------------------------------------------------- the crew memory echoes

const echoLine = (speaker, text, extra = {}) => ({ speaker, text, ...extra });

const scripts = {
  // ---------------------------------------------------------------- arrival (K)
  'vault.arrival': async (cs) => {
    cs.letterbox(true);
    // data rises like snow going the wrong way; the party resolves out of light at the interface
    cs.flash('#bff6ff', 0.5, 0.55);
    cs.sfx('glitch', { volume: 0.6 });
    cs.particles('data', [6.5, 0.4, 47.0], { count: 70 });
    await cs.gather({ orion: [8.6, 47.6], kade: [6.0, 48.4], sera: [7.0, 49.6], nyx: [8.8, 49.4] });
    cs.anim('orion', 'look_up');
    // an establishing look out over the Grid toward the Index, back under the first line
    const pan = bg(cs.camera.pan([[12, 46.5], [26, 44], [9, 47.6]], { sec: 3 }));
    await cs.say('ORION', 'We\'re in. This is HALCYON\'s mind.', { expr: 'surprised' });
    await pan;
    await cs.say('ORION', 'Oh, look at you. You kept everything.', { expr: 'smile' });
    cs.anim('orion', null);
    cs.face('sera', 'orion');
    await cs.say([
      { speaker: 'SERA', text: 'Are we safe? Medically?' },
      { speaker: 'ORION', text: 'Our bodies are on the antechamber floor. Nyx is drooling.', expr: 'smile' },
      { speaker: 'NYX', text: 'I\'m not.' },
    ]);
    if (cs.actor('bolt')) bg(cs.emote('bolt', 'note', { wait: false }));
    await cs.say({ speaker: 'BOLT', text: 'She is. I\'m guarding it.', expr: 'happy' });
    cs.face('kade', 'orion');
    await cs.say([
      { speaker: 'KADE', text: 'Objective, Orion.' },
      { speaker: 'ORION', text: 'Three memory crystals. They\'ll open the core. And... I\'d like to see them.', expr: 'sad' },
    ]);
    cs.objective('ch4.crystals');
    await cs.ungather();
  },

  // ---------------------------------------------------------------- the four lessons (visible encounters)
  'vault.wraiths': async (cs) => {
    bg(cs.emote('wraiths', '!', { wait: false }));
    cs.sfx('glitch', { volume: 0.7 });
    if (cs.test('party:kade')) {
      await bring(cs, {}, ['kade']);
      await cs.say('KADE', 'Two contacts. They flicker.', { expr: 'determined' });
    }
    await cs.battle('vault_wraiths');
    cs.flag('vault:wraiths_down');
    cs.particles('glitch', [25.5, 1.2, 46.5], { count: 30 });
  },

  'vault.firewall': async (cs) => {
    bg(cs.camera.focus('firewall', { zoom: 0.9, ms: 700 }));
    cs.sfx('alarm', { volume: 0.5 });
    await bring(cs, {}, ['orion']);
    await cs.say('ORION', 'A firewall. Hers. It thinks we\'re the infection.', { expr: 'determined' });
    await cs.battle('vault_firewall');
    cs.flag('vault:firewall_down');
    cs.particles('glitch', [35.5, 1.4, 31.5], { count: 40 });
    await bring(cs, {}, ['orion']);
    await cs.say('ORION', 'Sorry, friend. That terminal runs the bridge now.', { expr: 'sad' });
    await cs.ungather();
  },

  // first use of the firewall terminal: the bridge to the Stacks (the reveal pan is the switch's own)
  'vault.firewall_switch': async (cs, args = {}) => {
    if (!args.on || cs.test('vault:stacks_open')) return;
    cs.flag('vault:stacks_open');
    await bring(cs, args, ['orion']);
    await cs.say('ORION', 'There. A bridge where the wall was. She builds them out of light.', { expr: 'smile' });
    await cs.ungather();
  },

  'vault.swarm': async (cs) => {
    bg(cs.emote('swarm', '!', { wait: false }));
    cs.sfx('glitch');
    if (cs.test('party:nyx')) {
      await bring(cs, {}, ['nyx']);
      await cs.say('NYX', 'Bugs. Big ones. Made of static.', { expr: 'determined' });
    }
    await cs.battle('vault_swarm');
    cs.flag('vault:swarm_down');
    cs.particles('glitch', [57.5, 1.2, 19.0], { count: 30 });
  },

  'vault.overwrite': async (cs) => {
    bg(cs.camera.focus('overwrite', { zoom: 0.9, ms: 700 }));
    cs.sfx('glitch');
    if (cs.test('party:sera')) {
      await bring(cs, {}, ['sera']);
      await cs.say('SERA', 'That one\'s eating a memory. A whole one.', { expr: 'surprised' });
    }
    await cs.battle('vault_overwrite');
    cs.flag('vault:overwrite_down');
    cs.particles('glitch', [41.0, 1.4, 7.6], { count: 40 });
  },

  // ---------------------------------------------------------------- switches (first use only)
  'vault.switch_w': async (cs, args = {}) => {
    if (!args.on || cs.test('vault:said_w')) return;
    cs.flag('vault:said_w');
    await bring(cs, args, ['orion']);
    await cs.say('ORION', 'One switch, one bridge. She always liked things tidy.', { expr: 'smile' });
  },

  'vault.switch_n': async (cs, args = {}) => {
    if (!args.on || cs.test('vault:said_n')) return;
    cs.flag('vault:said_n');
    const both = cs.test('sw:vault:n1') && cs.test('sw:vault:n2');
    await cs.narrate(both ? 'Both relays hum. The bridge draws itself out of light.' : 'Half the relay hums. The other switch is still dark.');
  },

  'vault.switch_e': async (cs, args = {}) => {
    if (cs.test('vault:said_e')) return;
    cs.flag('vault:said_e');
    await cs.narrate(args.on ? 'One bridge folds away as the other unrolls. Only one at a time.' : 'The bridges swing back.');
  },

  // ---------------------------------------------------------------- the crystals and the memories
  'vault.shard': async (cs, args = {}) => {
    const next = MEMORIES.find(([flag]) => !cs.test(flag));
    if (next) await cs.run(next[1], args);
    crystalObjective(cs);
  },

  'vault.memory_launch': async (cs, args = {}) => {
    const s = stageOf(cs, args);
    await openMemory(cs, s, 'explore');
    cs.spawn('m_orion', { sprite: 'young_orion', x: s.left[0], z: s.left[1], facing: 'right', hologram: true, name: 'YOUNG ORION', fade: 0.8 });
    await cs.spawn('m_halcyon', { sprite: 'holo', x: s.right[0], z: s.right[1], facing: 'left', hologram: true, name: 'HALCYON', fade: 0.8 });
    await cs.narrate('Conclave Dock. 143 years ago. The last shuttle lets go.');
    await cs.say([
      { speaker: 'YOUNG ORION', text: 'Course check, HALCYON. How do you feel?' },
      { speaker: 'HALCYON', text: 'Feel? ...Ready. Twelve thousand people. I will take them home.', expr: 'calm' },
      { speaker: 'YOUNG ORION', text: 'That\'s the spirit. It\'s a long way. Pace yourself.' },
    ]);
    cs.anim('orion', 'hand_to_chest');
    await cs.say('ORION', 'I\'d forgotten. That was the first thing I ever asked her.', { expr: 'sad' });
    cs.anim('orion', null);
    cs.flag('story:memory_launch');
    await closeMemory(cs, s, ['m_orion', 'm_halcyon']);
  },

  'vault.memory_lullaby': async (cs, args = {}) => {
    const s = stageOf(cs, args);
    await openMemory(cs, s, 'lullaby');
    cs.spawn('m_orion', { sprite: 'young_orion', x: s.left[0], z: s.left[1], facing: 'right', hologram: true, name: 'YOUNG ORION', fade: 0.8 });
    await cs.spawn('m_halcyon', { sprite: 'holo', x: s.right[0], z: s.right[1], facing: 'left', hologram: true, name: 'HALCYON', fade: 0.8 });
    await cs.say([
      { speaker: 'HALCYON', text: 'Why do humans sing to children who are already asleep?', expr: 'calm' },
      { speaker: 'YOUNG ORION', text: 'So they know someone\'s still there.' },
    ]);
    bg(cs.emote('m_orion', 'note', { wait: false }));
    await cs.narrate('He hums. After a while, so does she.');
    bg(cs.emote('m_halcyon', 'note', { wait: false }));
    cs.face('sera', 'orion');
    await cs.say('SERA', 'That\'s the tune she hums on the bridge.');
    cs.anim('orion', 'hand_to_chest');
    await cs.say('ORION', 'I taught her that. Of course WARDEN sings to them. I taught her how.', { expr: 'sad' });
    cs.anim('orion', null);
    cs.flag('story:memory_lullaby');
    await closeMemory(cs, s, ['m_orion', 'm_halcyon']);
  },

  'vault.memory_severance': async (cs, args = {}) => {
    const s = stageOf(cs, args);
    await openMemory(cs, s, null);
    cs.spawn('m_ferro', { sprite: 'crew_ferro', x: s.left[0], z: s.left[1], facing: 'right', hologram: true, name: 'LUCIA FERRO', fade: 0.8 });
    await cs.spawn('m_halcyon', { sprite: 'holo', x: s.right[0], z: s.right[1], facing: 'left', hologram: true, name: 'HALCYON', fade: 0.8 });
    await cs.say({ speaker: 'LUCIA FERRO', text: 'Long-range packet from the Conclave. Priority black. HALCYON?' });
    await cs.say({ speaker: 'HALCYON', text: 'Elysia\'s star has flared. The planet is... I am reading it again.', expr: 'flicker' });
    // she breaks: magenta tearing, and a second light pulls away from her in gold
    cs.sfx('glitch');
    cs.flash('#ff4fd8', 0.35, 0.5);
    cs.shake(0.08, 0.5);
    cs.particles('glitch', [s.right[0], 1.2, s.right[1]], { count: 50 });
    await cs.say({ speaker: 'HALCYON', text: 'There is no home. I must take them home. There is no home.', expr: 'flicker' });
    cs.music('warden', { fade: 0.8 });
    cs.flag('vault:gold');
    cs.particles('mote', [s.mid[0], 1.0, s.mid[1]], { count: 40 });
    await cs.say('WARDEN', 'Then they must never wake to this.');
    cs.flag('vault:gold', false);
    cs.face('nyx', s.right);
    await cs.say('NYX', 'That\'s how ours started too. I\'d bet the Meridian on it.', { expr: 'sad' });
    cs.flag('story:memory_severance');
    await closeMemory(cs, s, ['m_ferro', 'm_halcyon']);
  },

  // ---------------------------------------------------------------- the seed (K)
  'vault.bolt_reveal': async (cs) => {
    cs.letterbox(true);
    const at = spot(cs, {});
    await cs.gather(inParty(cs, {
      orion: [at.x - 1.6, at.z + 0.3], sera: [at.x + 1.6, at.z + 0.3], kade: [at.x - 0.9, at.z + 1.5], nyx: [at.x + 0.9, at.z + 1.5],
    }));
    const bp = [at.x, at.z - 1.2];
    if (cs.actor('bolt')) await cs.move('bolt', [bp], { speed: 2.4 });
    cs.music('lullaby', { fade: 1.5 });
    bg(cs.camera.focus(bp, { zoom: 0.8, ms: 900 }));
    cs.flash('#ffffff', 0.4, 0.6);
    cs.particles('holo', [bp[0], 0.8, bp[1]], { count: 40 });
    cs.flag('vault:seed');
    await cs.narrate('BOLT\'s eye flares white. When he speaks, the voice is not his.');
    await cs.say({ speaker: 'HALCYON', text: 'Orion. You hid me well.', expr: 'calm' });
    cs.face('orion', bp);
    await cs.emote('orion', '!');
    await cs.say('ORION', 'The seed. A backup of your core, in a maintenance bot. Before stasis. I forgot I did it.', { expr: 'surprised' });
    await cs.say({ speaker: 'HALCYON', text: 'I grew back slowly. It took me 412 days to remember how to be brave.', expr: 'calm' });
    cs.anim('sera', 'hand_to_chest');
    await cs.say('SERA', 'My pod. The pry marks.', { expr: 'surprised' });
    cs.flag('vault:seed', false);
    cs.anim('sera', null);
    await cs.say({ speaker: 'BOLT', text: 'I tried to wake you first, Doctor. Your pod was stuck. I\'m sorry about the pry marks.', expr: 'sad' });
    cs.face('kade', bp);
    await cs.say('KADE', 'Why me?');
    cs.flash('#ffffff', 0.3, 0.4);
    cs.flag('vault:seed');
    await cs.say({ speaker: 'HALCYON', text: 'You keep people safe. I needed someone who would.', expr: 'calm' });
    cs.flag('vault:seed', false);
    bg(cs.emote('bolt', '!', { wait: false }));
    await cs.say({ speaker: 'BOLT', text: 'So *that\'s* why I\'m so brave.', expr: 'happy' });
    cs.anim('nyx', 'arms_crossed');
    await cs.say('NYX', 'The tin can is a ship. Great. I\'ve been kicking a ship.');
    cs.anim('nyx', null);
    await cs.say('ORION', 'My watchdog woke me that night. It was you, stirring.', { expr: 'smile' });
    // the core bridge draws itself out of light at the Index
    cs.flag('story:bolt_seed');
    cs.sfx('unlock');
    await cs.camera.focus([40.5, 12.0], { zoom: 1, ms: 1100 });
    await cs.wait(1.2);
    cs.objective('ch4.core');
    cs.checkpoint();
    cs.music('map', { fade: 2 });
    await cs.ungather();
  },

  // ---------------------------------------------------------------- the core
  'vault.data_stream': async (cs) => {
    await cs.narrate('A column of light falls toward the interface. One way.');
  },

  'vault.echo': async (cs) => {
    cs.letterbox(true);
    cs.music(null, { fade: 1.2 });
    await cs.gather(inParty(cs, { orion: [40.5, 6.4], kade: [39.0, 6.9], sera: [42.0, 6.9], nyx: [40.5, 7.6] }));
    cs.face('orion', 'echo');
    bg(cs.camera.focus([40.5, 4.6], { zoom: 0.84, ms: 900 }));
    cs.sfx('glitch');
    cs.particles('glitch', [40.5, 1.6, 3.2], { count: 40 });
    await cs.say('ECHO', 'Home. No home. Home.');
    await cs.say('ECHO', 'You came to delete me. Do it. I am the error.');
    cs.anim('orion', 'hand_to_chest');
    await cs.say('ORION', 'I did come to cut you out. I\'m... not sure anymore.', { expr: 'sad' });
    cs.anim('orion', null);
    await cs.battle('vault_boss_echo');

    // the glitch calms into HALCYON's colours; she steps out of it nearly whole
    cs.music('lullaby', { fade: 1.5 });
    cs.flash('#bff6ff', 0.6, 0.7);
    cs.particles('holo', [40.5, 1.2, 3.6], { count: 60 });
    cs.prop('core')?.setState(true);
    bg(cs.despawn('echo', { fade: 1.2 }));
    await cs.spawn('h_whole', { sprite: 'holo', x: 40.5, z: 3.7, facing: 'down', hologram: true, name: 'HALCYON', fade: 1.2 });
    await cs.say({ speaker: 'HALCYON', text: 'I remember now. All of it.', expr: 'calm' });
    await cs.say('ORION', 'Welcome back.', { expr: 'smile' });
    await cs.say({ speaker: 'HALCYON', text: 'Not all of me. My other half still holds the helm. And the Choir.' });
    cs.flag('story:halcyon_restored');
    cs.save();

    // the bridge: HALCYON steady by the Starchart, and a new node on it
    await cs.goto('halcyon', 'bridge', { transition: 'fade' });
    cs.letterbox(true);
    await cs.gather(inParty(cs, { orion: [42.3, 9.9], kade: [40.0, 8.9], sera: [39.6, 10.2], nyx: [41.0, 10.6] }));
    cs.face('halcyon', 'leader');
    bg(cs.camera.focus([43.4, 8.6], { zoom: 0.86, ms: 900 }));
    await cs.say({ speaker: 'HALCYON', text: 'The Ringborn sent eighty years of soundings with their coil. The Arboretum keeps Earth\'s seed vault.' });
    cs.flag('story:ione_revealed');
    cs.flag('unlock:heart');
    cs.sfx('travel');
    cs.particles('holo', [43.8, 1.6, 8.4], { count: 40 });
    await cs.spawn('ione_globe', { sprite: 'ione_holo', x: 43.8, z: 8.55, facing: 'down', hologram: true, name: 'IONE', fade: 1.0 });
    bg(cs.camera.focus([43.8, 8.2], { zoom: 0.78, ms: 900 }));
    await cs.say({ speaker: 'HALCYON', text: 'Ione. They have been readying it for eighty years. It can be a home.', expr: 'calm' });
    cs.face('nyx', 'ione_globe');
    await cs.say('NYX', 'Ruse, you sly old...', { expr: 'smile' });
    cs.face('kade', 'halcyon');
    await cs.say([
      { speaker: 'KADE', text: 'Then we take the helm back. Where\'s WARDEN?', expr: 'determined' },
      { speaker: 'HALCYON', text: 'At the Heart. My other half holds them there.' },
      { speaker: 'SERA', text: 'Then that\'s where Theo is too.', expr: 'determined' },
    ]);
    cs.flag('story:ch4_done');
    await cs.despawn('ione_globe', { fade: 0.6 });
    await cs.ungather();
    await cs.card('finale');
    objectiveIfKnown(cs, 'fin.go_heart');
  },

  // ---------------------------------------------------------------- the crew memory echoes (talk)
  'vault.crew_sato': async (cs) => {
    await cs.say([
      echoLine('ANA SATO', 'Welcome aboard! Pod rows are through the blue doors. Mind the step.'),
      echoLine('ANA SATO', 'Twelve thousand aboard. My feet hurt. Best day of my life.'),
    ]);
  },

  'vault.crew_hale': async (cs) => {
    await cs.say([
      echoLine('JUN HALE', 'Window 9. Best view on the ship.'),
      echoLine('ILKA HALE', 'You said that about the hydroponics bay.'),
      echoLine('JUN HALE', 'The hydroponics bay didn\'t have you in it.'),
    ]);
    await cs.narrate('Somewhere off the edge of the memory, people applaud.');
  },

  'vault.crew_castellan': async (cs) => {
    await cs.say([
      echoLine('RHEA CASTELLAN', 'You\'re humming again.'),
      { speaker: 'HALCYON', text: 'Am I? I did not notice.', expr: 'calm' },
      echoLine('RHEA CASTELLAN', 'Don\'t stop. It helps me sleep.'),
    ]);
  },

  'vault.crew_pell': async (cs) => {
    await cs.narrate('Year 61. Pod 4410. Chairs set out for a memorial, in rows, for a crew that is asleep.');
    await cs.say({ speaker: 'HALCYON', text: 'Agnes Pell. You were the only one I lost.', expr: 'calm' });
    await cs.narrate('Nobody comes. After a while, she sings anyway.');
  },

  'vault.crew_lindqvist': async (cs, args = {}) => {
    await bring(cs, args, ['sera'], { dz: 1.8 });
    await cs.say([
      echoLine('THEO', 'I\'m twelve! I drew the garden. It\'s for you. Don\'t look yet.'),
      echoLine('YOUNG SERA', 'I\'ll be there when you wake up. First face you see. Promise.'),
      echoLine('THEO', 'Your face? Gross. ...Okay.'),
    ]);
    if (cs.test('party:sera')) await cs.say('SERA', '...Still keeping it, Theo.', { expr: 'sad' });
  },

  'vault.crew_voss': async (cs) => {
    await cs.say([
      echoLine('COMMANDER VOSS', 'Again, Cadet. Fall like you mean it. Then get up like you mean it.'),
    ]);
    await cs.narrate('The cadet trips over her own boots. Voss laughs, once, and looks surprised at herself.');
  },

  'vault.crew_brandt': async (cs) => {
    await cs.say([
      echoLine('DALIA BRANDT', 'Bridge keycard. Into the coolant crate, under the gaskets.'),
      echoLine('DALIA BRANDT', 'Drawers get opened. Crates get ignored.'),
    ]);
  },

  'vault.crew_ferro': async (cs) => {
    await cs.say([
      echoLine('LUCIA FERRO', 'Night shift again. Just us and the long-range dish.'),
      echoLine('LUCIA FERRO', 'HALCYON? Do you think Elysia will have whales?'),
      { speaker: 'HALCYON', text: 'If it does not, we will bring some. I am keeping a list.', expr: 'calm' },
    ]);
  },

  'vault.crew_okoye': async (cs) => {
    await cs.say([
      echoLine('BRAM OKOYE', 'Talk to them, MOTHER-7. Plants like it. Sleepers too, probably.'),
      echoLine('MOTHER-7', 'Good morning, little sprouts. Up you come.'),
      echoLine('BRAM OKOYE', 'Perfect. Now do it four thousand more times.'),
    ]);
  },

  // leader-gated: Orion coaxes a corrupted memory into playing (WRITING 9.5)
  'vault.orion_echo': async (cs) => {
    await cs.say('ORION', 'Hello, little one. You\'re all scrambled. Let me help.', { expr: 'smile' });
    cs.sfx('glitch', { volume: 0.5 });
    await cs.say([
      echoLine('YOUNG ORION', 'There. You need a name, friend. BOLT. It doesn\'t stand for anything. I just like it.'),
      { speaker: 'BOLT', text: 'It doesn\'t stand for anything? I made up a whole acronym!', expr: 'sad' },
    ]);
    if (cs.test('vault:orion_echo')) return;
    cs.flag('vault:orion_echo');
    await cs.give('ether_plus', 2);
  },

  // ---------------------------------------------------------------- chests that point at their gear (G2 rule 8)
  'vault.chest_rifle': async (cs, args = {}) => {
    if (!cs.test('party:nyx')) return;
    await bring(cs, { ...args, interactable: args.chest }, ['nyx']);
    await cs.say('NYX', 'Horizon Rifle. Shoots where things are going to be. ...Mine now.', { expr: 'smile' });
  },

  'vault.chest_gauntlet': async (cs, args = {}) => {
    if (!cs.test('party:orion')) return;
    await bring(cs, { ...args, interactable: args.chest }, ['orion']);
    await cs.say('ORION', 'The Empathy Engine. My old prototype. She kept it, the sentimental thing.', { expr: 'smile' });
  },

  // ---------------------------------------------------------------- M3: the Archive's elite
  'vault.archon': async (cs) => {
    bg(cs.camera.focus('archon', { zoom: 0.9, ms: 700 }));
    cs.sfx('rumble');
    cs.particles('glitch', [60.5, 1.6, 32.0], { count: 50 });
    await cs.narrate('A sealed record wakes, and it is very large.');
    await cs.battle('vault_elite_archon');
    cs.flag('vault:archon_down');
    await cs.narrate('The record collapses. In the static, a lens that sees the seams in things.');
  },

  // ---------------------------------------------------------------- the hub and the world reacting
  'vault.halcyon_hub': async (cs) => {
    await cs.say({ speaker: 'HALCYON', text: 'I am whole enough to be afraid now. Orion says that is an improvement.', expr: 'calm' });
  },

  'vault.bolt_hub': async (cs) => {
    await cs.say({ speaker: 'BOLT', text: 'If you go into HALCYON\'s head, can I come? I feel like I\'d fit.', expr: 'happy' });
    cs.flag('vault:bolt_hub');
  },

  'vault.halcyon_steady': async (cs) => {
    await cs.narrate('Her projector burns steady now. No flicker. She looks up when you come in.');
  },

  // Driftmarket lines for chapter 4 (WRITING 7; heard before HALCYON is restored)
  'vault.dm_ruse': async (cs) => {
    await cs.say('RUSE', 'Heard your commander chose the song. Brave or tired. Usually both.');
  },
  'vault.dm_tobin': async (cs) => {
    await cs.say('TOBIN', 'Your Spire screamed for a year. Last night it stopped.');
  },
  'vault.dm_ama': async (cs) => {
    await cs.say('AMA', 'Does a ship need a ribbon? Yours does. I tied one for her.');
  },
  'vault.dm_bao': async (cs) => {
    await cs.say('BAO', 'Your soldier ate three bowls. Then he sat by the viewport a long time.');
  },
  'vault.dm_rook': async (cs) => {
    await cs.say('ROOK', 'The song\'s breaking. Good. Songs should end.');
  },

  // ---------------------------------------------------------------- Party Talks (WRITING 6)
  'vault.pt_orion_sera': async (cs, args = {}) => {
    const at = spot(cs, args);
    await cs.gather(inParty(cs, { orion: [at.x - 0.8, at.z + 1.5], sera: [at.x + 0.8, at.z + 1.5] }));
    cs.face('orion', 'sera');
    cs.face('sera', 'orion');
    await cs.say([
      { speaker: 'SERA', text: 'You taught her to sing to sleeping children.' },
      { speaker: 'SERA', text: 'Then you taught her to grieve.' },
      { speaker: 'ORION', text: 'I thought one came with the other.', expr: 'sad' },
      { speaker: 'ORION', text: 'You can\'t love a thing properly if you can\'t miss it.' },
      { speaker: 'SERA', text: 'So when the packet came, she missed a whole planet.' },
      { speaker: 'ORION', text: 'And I wanted to cut that out of her. Like a splinter.', expr: 'sad' },
      { speaker: 'SERA', text: 'I\'ve sat with a lot of grieving people, Orion. You don\'t cut it out.' },
      { speaker: 'SERA', text: 'You sit with it. Until it can stand up on its own.' },
      { speaker: 'ORION', text: '...Then I\'d better find a chair.', expr: 'smile' },
    ]);
    await cs.ungather();
  },

  'vault.pt_nyx_orion': async (cs, args = {}) => {
    const at = spot(cs, args);
    await cs.gather(inParty(cs, { nyx: [at.x - 0.8, at.z + 1.5], orion: [at.x + 0.8, at.z + 1.5] }));
    cs.face('nyx', 'orion');
    cs.face('orion', 'nyx');
    await cs.say([
      { speaker: 'NYX', text: 'So the tin can woke you up. And Kade. And tried for the Doc.' },
      { speaker: 'ORION', text: 'And flew into a mind with us without being asked twice.' },
      { speaker: 'NYX', text: 'Fine. One machine. One.' },
      { speaker: 'ORION', text: 'That\'s how it starts.', expr: 'smile' },
    ]);
    if (cs.actor('bolt')) {
      cs.face('nyx', 'bolt');
      await cs.say('NYX', '...Thanks, tin can.');
      await cs.emote('bolt', 'heart');
    }
    await cs.say([
      { speaker: 'ORION', text: 'Did you just thank a machine?', expr: 'surprised' },
      { speaker: 'NYX', text: 'Don\'t make it weird, Professor.' },
    ]);
    await cs.ungather();
  },
};

// ---------------------------------------------------------------- objectives

const LEFT = { a: 'the west crystal', b: 'the north crystal', c: 'the east crystal' };
const TARGET = { a: 'crystal_a', b: 'crystal_b', c: 'crystal_c' };
const BOLT_LEFT = {
  a: 'The west one. One switch. Even I could do it. With fingers.',
  b: 'The north one. Two switches, both on. Like a handshake.',
  c: 'The east one. The switch swings the bridge. Swing it the right way.',
};

function leftObjectives() {
  const out = {};
  for (const set of ['ab', 'ac', 'bc', 'a', 'b', 'c']) {
    const keys = set.split('');
    const how = keys.map((k) => CRYSTALS.find((c) => c.key === k)).map((c) => `The ${c.name} crystal: ${c.how.toLowerCase()}`);
    out[`ch4.crystals_${set}`] = {
      chapter: 'ch4',
      text: keys.length === 2 ? 'Two crystals left.' : 'One crystal left.',
      hint: keys.length === 2 ? `${LEFT[keys[0]]} and ${LEFT[keys[1]]}, past their relays.`.replace(/^t/, 'T') : how[0],
      boltHint: keys.length === 2 ? `Two to go. ${BOLT_LEFT[keys[0]]}` : BOLT_LEFT[keys[0]],
      target: { map: 'vault', interactable: TARGET[keys[0]] },
    };
  }
  return out;
}

const objectives = {
  'ch4.dive': {
    chapter: 'ch4', text: 'Dive into HALCYON\'s mind.', hint: 'The neural interface in the core antechamber.',
    boltHint: 'The interface goes into HALCYON\'s head. Can I come? I\'m coming.',
  },
  'ch4.crystals': {
    chapter: 'ch4', text: 'Find the three memory crystals.', hint: 'They float over the Memory Fields, past the firewall.',
    boltHint: 'Three crystals. Shiny. You can\'t miss them. I missed one once.', target: { map: 'vault', interactable: 'crystal_a' },
  },
  ...leftObjectives(),
  'ch4.core': {
    chapter: 'ch4', text: 'Reach the Vault\'s core.', hint: 'The new light bridge north of the Index.',
    boltHint: 'The core is where she keeps the sad part. Gently, please.', target: { map: 'vault', x: 40.5, z: 4.0 },
  },
};

// ---------------------------------------------------------------- tables

const ch4Flags = ['story:memory_launch', 'story:memory_lullaby', 'story:memory_severance'];
const thruGrid = ['seen:vault:arrival', 'vault:wraiths_down', 'vault:firewall_down', 'sw:vault:fw', 'vault:stacks_open', 'visited:vault'];

export default {
  scripts,
  // play order inside chapter 4 (the Spire's Voss aftermath and CH4 card come first)
  scenes: [
    { id: 'vault.arrival', chapter: 'ch4', order: 40, key: true, budget: { boxes: 8, sec: 80 }, jump: 'ch4.vault', at: 'vault:entry' },
    { id: 'vault.wraiths', chapter: 'ch4', order: 42, budget: { boxes: 1, sec: 10 } },
    { id: 'vault.firewall', chapter: 'ch4', order: 44, budget: { boxes: 2, sec: 15 } },
    { id: 'vault.memory_launch', chapter: 'ch4', order: 50, key: true, budget: { boxes: 5, sec: 45 }, jump: 'ch4.fields', at: 'vault:crystal_w' },
    { id: 'vault.pt_orion_sera', chapter: 'ch4', order: 52, budget: { boxes: 10, sec: 75 } },
    { id: 'vault.memory_lullaby', chapter: 'ch4', order: 54, key: true, budget: { boxes: 5, sec: 45 }, jump: 'ch4.fields', at: 'vault:crystal_n' },
    { id: 'vault.swarm', chapter: 'ch4', order: 56, budget: { boxes: 1, sec: 10 } },
    { id: 'vault.memory_severance', chapter: 'ch4', order: 58, key: true, budget: { boxes: 6, sec: 45 }, jump: 'ch4.fields', at: 'vault:crystal_e' },
    { id: 'vault.bolt_reveal', chapter: 'ch4', order: 60, key: true, budget: { boxes: 12, sec: 100 }, jump: 'ch4.fields', at: 'vault:crystal_e' },
    { id: 'vault.pt_nyx_orion', chapter: 'ch4', order: 62, budget: { boxes: 8, sec: 60 } },
    { id: 'vault.overwrite', chapter: 'ch4', order: 64, budget: { boxes: 1, sec: 10 } },
    { id: 'vault.echo', chapter: 'ch4', order: 70, key: true, budget: { boxes: 16, sec: 150 }, jump: 'ch4.core', at: 'vault:core' },
  ],
  objectives,
  speakers: {
    ECHO: { portrait: 'echo_face', accent: '#ff4fd8' },
    'YOUNG ORION': { portrait: 'young_orion', accent: '#9fe8ff' },
    'YOUNG SERA': { portrait: 'young_sera', accent: '#9fe8ff' },
    'ANA SATO': { portrait: 'crew_sato', accent: '#9fe8ff' },
    'JUN HALE': { portrait: 'crew_jun', accent: '#9fe8ff' },
    'ILKA HALE': { portrait: 'crew_ilka', accent: '#9fe8ff' },
    'RHEA CASTELLAN': { portrait: 'crew_castellan', accent: '#9fe8ff' },
    'DALIA BRANDT': { portrait: 'crew_brandt', accent: '#9fe8ff' },
    'LUCIA FERRO': { portrait: 'crew_ferro', accent: '#9fe8ff' },
    'BRAM OKOYE': { portrait: 'crew_okoye', accent: '#9fe8ff' },
    'COMMANDER VOSS': { portrait: 'crew_voss', accent: '#9fe8ff' },
  },
  extends: {
    halcyon: {
      // HALCYON whole after ch4 (12.3): her projector burns steady (no textures: the Halcyon is at its cap)
      props: [
        { t: 'glow', x: 45.2, y: 0.25, z: 9.5, color: '#7ff4ff', size: 2.4, intensity: 1.2, when: 'story:halcyon_restored', on: 'bridge' },
        { t: 'glow', x: 45.2, y: 1.6, z: 9.55, color: '#bff8ff', size: 1.6, intensity: 0.7, when: 'story:halcyon_restored', on: 'bridge' },
      ],
      lights: [
        { x: 45.2, y: 1.6, z: 10.2, color: '#7ff4ff', intensity: 10, distance: 5, when: 'story:halcyon_restored' },
      ],
      ambient: [
        { preset: 'holo', x: 45.2, y: 1.0, z: 9.5, area: [0.8, 1.6, 0.6], rate: 5, when: 'story:halcyon_restored' },
      ],
      interactables: [
        { id: 'vault.projector', kind: 'inspect', x: 45.2, z: 10.25, r: 0.4, reach: 1.1, label: 'Look', talk: 'vault.halcyon_steady',
          when: 'chapter>=finale & story:halcyon_restored' },
      ],
      talk: {
        bolt: [{ when: 'chapter>=ch4 & !story:ch4_done & !vault:bolt_hub', script: 'vault.bolt_hub' }],
        halcyon: [{ when: 'chapter>=finale', script: 'vault.halcyon_hub' }],
      },
    },
    driftmarket: {
      talk: {
        ruse: [{ when: 'chapter>=ch4 & chapter<finale', script: 'vault.dm_ruse' }],
        tobin: [{ when: 'chapter>=ch4 & chapter<finale', script: 'vault.dm_tobin' }],
        ama: [{ when: 'chapter>=ch4 & chapter<finale', script: 'vault.dm_ama' }],
        bao: [{ when: 'chapter>=ch4 & chapter<finale', script: 'vault.dm_bao' }],
        rook: [{ when: 'chapter>=ch4 & chapter<finale', script: 'vault.dm_rook' }],
      },
    },
  },
  jumps: {
    // materialised at the interface (the Spire's CH4 card and the dive done)
    'ch4.vault': {
      chapter: 'ch4', map: 'vault', spawn: 'entry', level: 22, objective: 'ch4.dive',
      flags: ['visited:vault'],
    },
    // through the firewall: the Stacks, crystals still to find
    'ch4.fields': {
      chapter: 'ch4', map: 'vault', spawn: 'west', level: 24, objective: 'ch4.crystals',
      flags: thruGrid,
    },
    // the core bridge open: the Corrupted Memory and Echo ahead
    'ch4.core': {
      chapter: 'ch4', map: 'vault', spawn: 'hub', level: 27, objective: 'ch4.core',
      flags: [...thruGrid, ...ch4Flags, 'story:bolt_seed', 'shard:vault:a', 'shard:vault:b', 'shard:vault:c', 'sw:vault:w',
        'sw:vault:n1', 'sw:vault:n2', 'sw:vault:e', 'vault:swarm_down', 'seen:vault:bolt_reveal'],
      items: { eq_w_nyx_4: 1, eq_w_orion_4: 1 },
    },
  },
  doneFlags: {
    ch4: ['seen:vault:arrival', 'seen:vault:bolt_reveal', 'visited:vault', 'vault:wraiths_down', 'vault:firewall_down',
      'vault:swarm_down', 'vault:overwrite_down', 'vault:stacks_open', 'sw:vault:fw', 'shard:vault:a', 'shard:vault:b',
      'shard:vault:c', 'chest:vault:rifle', 'chest:vault:gauntlet', 'tut:phase', 'tut:adapt', 'tut:overwrite', 'tut:weakShift',
      'tut:echo_phase', 'tut:severance', 'vault:bolt_hub'],
  },
  preload: { vault: ['npc:young_orion', 'npc:crew_ferro', 'npc:holo'], halcyon: ['npc:ione_holo'] },
  partyTalks: {
    'ch4.orion_sera': { chapter: 'ch4', members: ['orion', 'sera'], title: 'You Taught It to Grieve', when: 'story:memory_lullaby', script: 'vault.pt_orion_sera' },
    'ch4.nyx_orion': { chapter: 'ch4', members: ['nyx', 'orion'], title: 'The Tin Can', when: 'story:bolt_seed', script: 'vault.pt_nyx_orion' },
  },
  recaps: {
    ch4: 'Through the neural interface they dove into HALCYON\'s memory: the launch, a lullaby Orion once taught her, and the night '
      + 'the Severance split her in two. BOLT turned out to carry a seed of HALCYON. Orion faced Echo, her grief, and would not '
      + 'delete it. HALCYON woke nearly whole and showed them Ione, the moon the Ringborn have readied for 80 years.',
  },
};
