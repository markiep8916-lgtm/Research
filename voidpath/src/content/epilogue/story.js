// epilogue: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5; lines per WRITING.md 5.8,
// 7, 8 and 10). The game's last scene and its post-game.
//
//   epilogue.main         the flag trigger on the Halcyon after the crown (`chapter>=epilogue &
//                         !story:game_clear`): six vignettes. (1) the Cryo Deck: the pods change their
//                         minds in a wave, Kade lays Voss's halberd before the memorial; (2) pod 2271
//                         opens in the Medical Bay, then Sera and Theo at the Arboretum glass with
//                         MOTHER-7; (3) Nyx and Ruse at Driftmarket's viewport as the Halcyon passes;
//                         (4) Orion teaching HALCYON to paint at Window 9; (5) Ringborn skiffs rising
//                         round the Halcyon (`exterior`); (6) an ordinary goto to `ione:shore`: the four
//                         and BOLT on the ice at dawn, Kade's last line, the VOIDPATH logo,
//                         story:game_clear, unlock:ione, the queued save, cs.ending() (credits, THE END)
//   epilogue.shore_*      the travelers, BOLT and Theo on the shore after the clear
//   epilogue.orion_beacon Orion (leader-gated) coaxes the berth beacon into the lullaby
//   epilogue.memorial     the memorial on the Cryo Deck (inspect)
//   epilogue.halcyon_hub  HALCYON on the bridge after the clear
//   epilogue.dm_<npcId>   five Driftmarket townsfolk, post-game (WRITING 7)
//
// Vignettes 1-5 are scene gotos, each with its own traveler leading; the last goto is ordinary so the
// queued save lands on the shore (6.2), with the leader the player had. Binding ids: epilogue.main,
// destination ione, objectives epi.wake / epi.shore, flags story:revival_authorized,
// story:game_clear, unlock:ione; local flags epi:halberd (the halberd at the memorial), epi:theo_pod
// (pod 2271 open); recaps finale and epilogue; REG.credits.

import { SLOTS } from './maps/ione.js';

/** A cs call left running alongside others: an abort (Retry, Load, jumpTo) must not surface unhandled. */
const bg = (p) => {
  p.catch(() => {});
  return p;
};

const MEMBERS = ['kade', 'nyx', 'orion', 'sera'];

/** A gather layout with only the members in the party ({ kade: [x, z], ... }). */
function inParty(cs, slots) {
  const out = {};
  for (const [id, p] of Object.entries(slots)) if (cs.test(`party:${id}`)) out[id] = p;
  return out;
}

/** The leader's member id. */
const leaderOf = (cs) => MEMBERS.find((m) => cs.test(`leader:${m}`)) || 'kade';

/** One cut of the epilogue: fade, the vignette's traveler leads, a staged goto, the shot, fade in. */
async function cut(cs, { member, map, at, view, focus, zoom = 0.84, spawns = [], fade = 700 }) {
  await cs.fadeOut({ ms: fade });
  if (member) cs.scene({ leader: member });
  await cs.goto(map, at, { scene: true, transition: 'none' });
  for (const [id, def] of spawns) await cs.spawn(id, { ...def, fade: 0 });
  await cs.camera.view({ ...view, ms: 1 });
  await cs.camera.focus(focus, { zoom, ms: 1 });
  bg(cs.fadeIn({ ms: 800 }));
}

/**
 * The VOIDPATH logo over the dawn. There is no cs call for it (requested); the UI's logo card is
 * reached through the runner's context, with a caption where that is not there (the dry run).
 */
async function logo(cs) {
  const ctx = cs._ctx;
  const cards = ctx?.ui?.cards;
  if (typeof cards?.logo === 'function') await cards.logo({ ms: ctx.cutscenes?.fast ? 300 : 4200 });
  else await cs.caption('VOIDPATH', { ms: 4200 });
}

const scripts = {
  'epilogue.main': async (cs) => {
    const lead = leaderOf(cs);
    bg(cs.letterbox(true));
    cs.music('explore', { fade: 2 });
    cs.flag('story:bolt_away');

    // ---------------------------------------------------------------- (1) the Cryo Deck
    await cut(cs, {
      member: 'kade', map: 'halcyon', at: { x: 6.6, z: 22.2, facing: 'up' },
      view: { pitch: 30, dist: 13 }, focus: [6.8, 20.4], zoom: 0.86, fade: 500,
    });
    await cs.wait(0.8);
    cs.flag('story:revival_authorized');
    bg(cs.camera.pan([[5.4, 20.4], [8.6, 20.4]], { sec: 4 }));
    await cs.narrate('One by one, the pods change their minds.');
    bg(cs.camera.focus([3.8, 27.2], { zoom: 0.8, ms: 1800 }));
    await cs.move('leader', [[6.4, 27.6], [3.4, 28.3]], { speed: 2.2, face: 'up' });
    cs.anim('leader', 'kneel');
    cs.flag('epi:halberd');
    cs.particles('mote', [3.4, 0.3, 27.7], { count: 18 });
    cs.sfx('equip', { volume: 0.5 });
    await cs.wait(0.9);
    await cs.say('KADE', 'They chose to keep dreaming, Commander. So did you. Keep them company.', { expr: 'sad' });
    cs.anim('leader', null);

    // ---------------------------------------------------------------- (2) Theo
    await cut(cs, {
      member: 'sera', map: 'halcyon', at: { x: 5.8, z: 32.2, facing: 'left' },
      view: { pitch: 28, dist: 12 }, focus: [4.6, 31.4], zoom: 0.8,
    });
    cs.flag('epi:theo_pod');
    cs.sfx('wake', { volume: 0.7 });
    cs.particles('frost', [3.6, 1.1, 30.9], { count: 36 });
    cs.particles('steam', [3.6, 0.4, 31.0], { count: 14 });
    await cs.wait(1.0);
    await cs.spawn('ep_theo', { sprite: 'theo', x: 3.6, z: 30.9, facing: 'down', name: 'THEO', fade: 0.5 });
    await cs.move('ep_theo', [[3.6, 31.5]], { speed: 0.7, face: 'leader' });
    await cs.say('THEO', '...Sera?', { expr: 'surprised' });
    await cs.move('leader', [[4.5, 31.8]], { speed: 3.2, face: 'ep_theo' });
    cs.anim('leader', 'kneel');
    await cs.say([
      { speaker: 'SERA', text: 'Hi. I\'m here. I said I\'d be here.', expr: 'sad' },
      { speaker: 'THEO', text: 'Did I miss anything?', expr: 'smile' },
      { speaker: 'SERA', text: 'A little.', expr: 'smile' },
    ]);
    await cs.emote('leader', 'heart', { ms: 900 });
    cs.anim('leader', null);

    // the Arboretum glass, the next morning: the two of them looking out, MOTHER-7 tending behind
    await cut(cs, {
      map: 'arboretum', at: { x: 12.8, z: 2.6, facing: 'up' },
      view: { pitch: 26, dist: 12 }, focus: [14.6, 3.0], zoom: 0.84,
      spawns: [
        ['ep_theo_glass', { sprite: 'theo', x: 14.0, z: 2.5, facing: 'up', name: 'THEO' }],
        ['ep_mother7', { sprite: 'mother7', x: 17.6, z: 4.8, facing: 'left', name: 'MOTHER-7' }],
      ],
    });
    bg(cs.move('ep_mother7', [[16.4, 4.2]], { speed: 0.9, face: 'left' }));
    await cs.wait(1.0);
    await cs.say('MOTHER-7', 'Good morning, little sprouts. Up you come.');
    cs.face('ep_theo_glass', 'ep_mother7');
    await cs.emote('ep_theo_glass', '!', { ms: 800 });

    // ---------------------------------------------------------------- (3) Driftmarket's viewport
    cs.music('driftmarket', { fade: 1.5 });
    await cut(cs, {
      member: 'nyx', map: 'driftmarket', at: { x: 31.2, z: 2.5, facing: 'up' },
      view: { pitch: 14, dist: 12 }, focus: [30.8, 1.0], zoom: 1,
      spawns: [['ep_ruse', { sprite: 'ruse', x: 29.8, z: 2.4, facing: 'up', name: 'RUSE' }]],
    });
    await cs.wait(2.0);
    await cs.say('RUSE', 'Ship-people. Always late.');
    cs.face('leader', 'ep_ruse');
    await cs.say('NYX', 'Worth the wait, though.', { expr: 'smile' });
    cs.face('ep_ruse', 'leader');
    await cs.say('RUSE', 'Don\'t let them hear you say that.');

    // ---------------------------------------------------------------- (4) Window 9
    await cut(cs, {
      member: 'orion', map: 'halcyon', at: { x: 24.0, z: 14.3, facing: 'up' },
      view: { pitch: 26, dist: 12 }, focus: [25.8, 13.2], zoom: 0.84,
      spawns: [['ep_halcyon', { sprite: 'holo', x: 25.4, z: 13.9, facing: 'up', hologram: true, name: 'HALCYON' }]],
    });
    cs.anim('leader', 'point');
    await cs.say('ORION', 'Light first. Then the dark around it.', { expr: 'smile' });
    cs.anim('leader', null);
    cs.face('ep_halcyon', 'leader');
    await cs.say('HALCYON', 'I have painted Tethys forty times. May I paint Ione next?', { expr: 'calm' });
    await cs.emote('leader', 'note', { ms: 900 });

    // ---------------------------------------------------------------- (5) the skiffs (exterior)
    await cs.fadeOut({ ms: 700 });
    await cs.goto('exterior', 'view', { scene: true, transition: 'none' });
    const me = cs.actor('leader');
    if (me) await me.setVisible(false);
    await cs.camera.view({ pitch: 14, dist: 23, ms: 1 });
    await cs.camera.focus([34, 5.5], { ms: 1 });
    const pan = bg(cs.camera.pan([[34, 5.5], [22, 5.5], [13, 5.5]], { sec: 9 }));
    bg(cs.fadeIn({ ms: 900 }));
    await cs.wait(1.6);
    await cs.narrate('Ringborn skiffs rise from the rings to walk the Halcyon home.');
    await pan;

    // ---------------------------------------------------------------- (6) Ione
    await cs.fadeOut({ ms: 1000 });
    cs.flag('story:bolt_away', false);
    cs.scene({ leader: lead });
    cs.music('ione', { fade: 2.5 });
    await cs.goto('ione', 'shore', { transition: 'none' });
    // the post-game travelers and Theo wait off stage until this script ends (touched actors are the
    // script's): the four on the ice now are the party itself
    for (const id of ['ep_kade', 'ep_nyx', 'ep_orion', 'ep_sera', 'ep_theo']) cs.face(id, 'up');
    await cs.gather(inParty(cs, { sera: SLOTS.sera, kade: SLOTS.kade, nyx: SLOTS.nyx, orion: SLOTS.orion }));
    await cs.move('bolt', [SLOTS.bolt], { speed: 3, face: 'up' });
    for (const id of MEMBERS) if (cs.test(`party:${id}`)) cs.face(id, 'up');
    await cs.camera.view({ pitch: 12, dist: 14, ms: 1 });
    await cs.camera.focus([22.6, 4.6], { zoom: 1, ms: 1 });
    bg(cs.fadeIn({ ms: 1800 }));
    await cs.caption('IONE  ·  First Shore', { ms: 3000 });
    bg(cs.emote('bolt', 'note', { wait: false }));
    await cs.say('BOLT', 'We made it. Not mostly. All the way.', { expr: 'happy' });
    await cs.say('NYX', 'Cold. Good cold, though.', { expr: 'smile' });
    cs.sfx('shard', { volume: 0.4 });
    await cs.wait(0.6);
    await cs.say('ORION', 'Listen. The ice is singing.', { expr: 'smile' });
    await cs.wait(1.0);
    await cs.say('KADE', 'Then we\'ll build a world worth waking for.', { expr: 'smile' });
    bg(cs.camera.view({ pitch: 17, dist: 19, ms: 7000 }));
    await logo(cs);
    cs.flag('story:game_clear');
    cs.flag('unlock:ione');
    cs.objective('epi.shore');
    cs.save();
    // the credits roll over the shore with the camera drifting along the water
    bg(cs.camera.pan([[22.6, 4.6], [25.0, 4.8]], { sec: 70 }));
    const end = await cs.ending();
    if (end !== 'ione') return;
    // Return to Ione: the leader turns from the water; the others stay on as the shore's NPCs
    bg(cs.letterbox(false));
    cs.face('leader', 'down');
  },

  // ---------------------------------------------------------------- the shore, after the clear
  'epilogue.shore_kade': async (cs) => {
    await cs.say('KADE', 'No chain of command out here. Just a lot of work. I\'m good at work.', { expr: 'smile' });
  },
  'epilogue.shore_nyx': async (cs) => {
    await cs.say('NYX', 'Never did get off that tub. Don\'t tell Ruse.', { expr: 'smile' });
  },
  'epilogue.shore_orion': async (cs) => {
    await cs.say('ORION', 'HALCYON wants to paint the sunrise. I said it takes practice. She said she has time.', { expr: 'smile' });
  },
  'epilogue.shore_sera': async (cs) => {
    await cs.say('SERA', 'Theo\'s been awake six hours and asked four hundred questions. I\'m counting.', { expr: 'smile' });
  },
  'epilogue.shore_bolt': async (cs) => {
    await cs.say('BOLT', 'My threat-assessment module rates Ione a 1. Out of 10. A good 1.', { expr: 'happy' });
  },
  'epilogue.shore_theo': async (cs) => {
    await cs.say('THEO', 'Ione\'s cold. I\'m going to draw it anyway.', { expr: 'smile' });
  },

  // Orion and the berth beacon: the Ringborn horn finds the lullaby (leader-gated on `ione`)
  'epilogue.orion_beacon': async (cs) => {
    cs.face('leader', 'up');
    await cs.say('ORION', 'Hello, old girl. Calling all this time, and nobody singing back?', { expr: 'smile' });
    cs.music('lullaby', { fade: 1.5 });
    cs.light('ep_beacon', { intensity: 16 });
    bg(cs.emote('leader', 'note', { wait: false }));
    await cs.narrate('The beacon finds the lullaby, one cold note at a time.');
    await cs.wait(2.5);
    await cs.say('ORION', 'There. Now somebody\'s singing back.', { expr: 'smile' });
    cs.light('ep_beacon', { intensity: 9 });
  },

  // the memorial on the Cryo Deck: the names, then the leader's line
  'epilogue.memorial': async (cs) => {
    await cs.narrate('Names, in light. Those who chose to keep dreaming. *Commander Ilse Voss* is among them.');
    const lines = {
      kade: ['KADE', 'Still on watch, Commander. Good.', 'sad'],
      nyx: ['NYX', 'Ruse would tie a ribbon for every one of these. ...I might.', 'sad'],
      orion: ['ORION', 'HALCYON sings to them every night. I checked.', 'smile'],
      sera: ['SERA', 'Their vitals are perfect. They\'re dreaming well.', 'smile'],
    };
    const [speaker, text, expr] = lines[leaderOf(cs)];
    await cs.say(speaker, text, { expr });
  },

  'epilogue.halcyon_hub': async (cs) => {
    await cs.say('HALCYON', 'Everyone was asked. Everyone answered. Some chose the song. I sing it for them now.', { expr: 'calm' });
  },

  // ---------------------------------------------------------------- Driftmarket, post-game (WRITING 7)
  'epilogue.dm_ruse': async (cs) => {
    await cs.say('RUSE', 'Still here? Go build something.');
  },
  'epilogue.dm_tobin': async (cs) => {
    await cs.say('TOBIN', 'Retired the beacon. Nobody left to call.');
  },
  'epilogue.dm_pip': async (cs) => {
    await cs.say('PIP', 'When\'s the Moth going to Ione? Can I come?');
  },
  'epilogue.dm_ama': async (cs) => {
    await cs.narrate('Ama unties a ribbon from the wall.');
    await cs.say('AMA', 'Came home.');
  },
  'epilogue.dm_juno': async (cs) => {
    await cs.say('JUNO', 'Building skiff number two. For Theo. He asked nicely.');
  },
};

// the bed and pod lamps of the Cryo Deck and the Medical Bay that turn green with the revivals
const WAKE_LAMPS = [
  ...[21.6, 25.6].flatMap((z) => [2.0, 3.25, 4.5, 9.5, 10.75, 12.0].map((x) => [x, 0.78, z - 0.85])),
  ...[1.5, 3.5, 9.5, 11.5].map((x) => [x, 2.12, 18.8]),
  ...[9.5, 11.5, 12.5].map((x) => [x, 2.12, 30.8]),
];

export default {
  scripts,
  scenes: [
    { id: 'epilogue.main', chapter: 'epilogue', order: 10, key: true, budget: { boxes: 20, sec: 150 }, jump: 'epilogue', at: 'halcyon:cryo' },
  ],
  objectives: {
    'epi.wake': { chapter: 'epilogue', text: 'Watch them wake.', hint: 'The Cryo Deck.', boltHint: 'They\'re waking up! Everyone who wants to!' },
    'epi.shore': {
      chapter: 'epilogue', text: 'Walk the shore of Ione.', hint: 'The Moth berth has a Starchart.',
      boltHint: 'Starchart\'s by the Moth. We can go anywhere now. Anywhere!', side: true,
    },
  },
  destinations: [
    {
      id: 'ione', name: 'Ione', subtitle: 'Moon of Tethys', order: 6,
      desc: 'An ocean under ice. The Ringborn have seeded it for eighty years.',
      map: 'ione', spawn: 'shore', unlock: 'unlock:ione', visible: 'story:ione_revealed', lockedText: 'After the Heart',
    },
  ],
  // the post-game shore, for tests and screenshots
  jumps: {
    'epi.shore': {
      chapter: 'epilogue', map: 'ione', spawn: 'shore', objective: 'epi.shore',
      flags: ['story:revival_authorized', 'story:game_clear', 'unlock:ione', 'epi:halberd', 'epi:theo_pod'],
    },
  },
  doneFlags: {
    epilogue: ['epi:halberd', 'epi:theo_pod'],
  },
  extends: {
    halcyon: {
      triggers: [
        { id: 'epi.main', on: 'flag', when: 'chapter>=epilogue & !story:game_clear', once: true, script: 'epilogue.main' },
      ],
      props: [
        // the memorial on the Cryo Deck, south-west (anchor `memorial`), and Voss's halberd at its foot
        { t: 'ep.memorial', x: 3.4, z: 27.1, when: 'chapter>=epilogue' },
        { t: 'sp.halberd', x: 3.4, z: 27.74, rot: 0, when: 'chapter>=epilogue & epi:halberd' },
        // pod 2271, brought down to the Medical Bay for Sera to wake him herself
        { t: 'ep.pod', x: 3.6, z: 30.42, status: 'epi:theo_pod', when: 'chapter>=epilogue' },
        { t: 'ep.wakeLights', points: WAKE_LAMPS, status: 'story:revival_authorized', when: 'chapter>=epilogue' },
        // HALCYON's easel at Window 9 on the Spine Corridor
        { t: 'ep.easel', x: 24.8, z: 12.9, rot: 0.35, when: 'chapter>=epilogue' },
      ],
      lights: [
        { x: 3.4, y: 1.4, z: 27.9, color: '#9fe8ff', intensity: 6, distance: 4, when: 'chapter>=epilogue' },
        { x: 3.6, y: 1.3, z: 31.0, color: '#bff4ff', intensity: 7, distance: 4, when: 'chapter>=epilogue & epi:theo_pod' },
        { x: 24.8, y: 1.6, z: 13.4, color: '#ffcf8a', intensity: 5, distance: 3.5, when: 'chapter>=epilogue' },
      ],
      interactables: [
        { id: 'ep.memorial', kind: 'inspect', x: 3.4, z: 27.9, r: 0.6, reach: 1.2, label: 'Read', icon: 'inspect', talk: 'epilogue.memorial', when: 'chapter>=epilogue' },
      ],
      talk: {
        halcyon: [{ when: 'chapter>=epilogue', script: 'epilogue.halcyon_hub' }],
      },
    },
    driftmarket: {
      props: [
        { t: 'ep.passing', x0: 21, x1: 42, y: 1.4, z: -14, w: 8, h: 2, speed: 0.9, when: 'chapter>=epilogue & !story:game_clear' },
      ],
      talk: {
        ruse: [{ when: 'chapter>=epilogue', script: 'epilogue.dm_ruse' }],
        tobin: [{ when: 'chapter>=epilogue', script: 'epilogue.dm_tobin' }],
        pip: [{ when: 'chapter>=epilogue', script: 'epilogue.dm_pip' }],
        ama: [{ when: 'chapter>=epilogue', script: 'epilogue.dm_ama' }],
        juno: [{ when: 'chapter>=epilogue', script: 'epilogue.dm_juno' }],
      },
    },
    exterior: {
      props: [
        { t: 'ep.skiffs', x0: 6, x1: 40, z: -1.5, n: 8, seed: 5, when: 'chapter>=epilogue & !story:game_clear' },
      ],
    },
  },
  // what the vignettes spawn that no MapDef names (prewarm, 11.5)
  preload: { halcyon: ['npc:theo', 'npc:holo'], arboretum: ['npc:theo', 'npc:mother7'] },
  recaps: {
    finale: 'They flew to the Heart and climbed. On the way WARDEN offered each of them what they wanted most, and each of them '
      + 'woke up. At the crown Nyx named it the Lock that sings ships to sleep. They fought it down, and HALCYON held her other '
      + 'half until the two were one. The Choir\'s light turned to morning.',
    epilogue: 'HALCYON asked every sleeper, and most chose to wake. Theo opened his eyes. Kade laid Voss\'s halberd before the wall '
      + 'of those who chose to keep dreaming. Ruse watched the Halcyon pass. Orion taught HALCYON to paint. Ringborn skiffs walked '
      + 'the ship to Ione, and four travelers stood on the ice at dawn.',
  },
  // WRITING 10; the UI prints "Everything you saw and heard was generated by code" itself (8.6)
  credits: [
    { head: 'VOIDPATH' },
    { text: 'A 2D-HD RPG' },
    { gap: 2 },
    { cast: 'kade', name: 'KADE ARDEN', role: 'Vanguard' },
    { cast: 'nyx', name: 'NYX VARO', role: 'Gunslinger' },
    { cast: 'orion', name: 'ORION SALL', role: 'Technomancer' },
    { cast: 'sera', name: 'SERA LINDQVIST', role: 'Medic' },
    { gap: 1 },
    { cast: 'bolt', name: 'BOLT', role: 'Maintenance, mostly' },
    { cast: 'holo', name: 'HALCYON', role: 'The ship' },
    { role: 'The other half', name: 'WARDEN' },
    { cast: 'voss', name: 'COMMANDER ILSE VOSS', role: 'Security Command' },
    { cast: 'ruse', name: 'OLD MOTHER RUSE', role: 'Driftmarket' },
    { cast: 'theo', name: 'THEO LINDQVIST', role: 'Pod 2271' },
    { cast: 'mother7', name: 'MOTHER-7', role: 'Caretaker' },
    { gap: 1 },
    { text: 'and the twelve thousand' },
    { gap: 2 },
    { role: 'Story, art, music and sound', name: 'Written in code' },
  ],
};
