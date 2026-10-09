// driftmarket: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4 and 12.5; voice and lines
// follow WRITING.md 5.3, 6, 7 and 9).
//
// Chapter 1 beats owned here: the arrival (Ruse, Pip's rhyme, the shop and leader tips), Ruse and the
// Maw, the townsfolk and the legend of the Lock, `driftmarket.return` (run by shoals.maw on
// driftmarket:dock: the partial seeding reveal, Nyx joins for real), and `driftmarket.coil_install`
// on the Halcyon (WARDEN speaks, the manifest, the CHAPTER TWO card), plus the Halcyon hub lines,
// the Ringborn trader stall after ch1 and two Party Talks.
//
// Scripts never assume who leads: travelers who speak are gathered (or stepped out beside the NPC
// they answer). Binding ids: driftmarket.return, driftmarket.coil_install, driftmarket.bolt_hub,
// driftmarket.pt_kade_nyx, objectives ch1.go_driftmarket / ch1.*, destination driftmarket, shop ruse.

import { REG } from '../registry.js';

/** Objectives owned by later chapters are set once their owner has registered them; until then the
 * finished objective is just closed. */
function objectiveIfKnown(cs, id) {
  cs.objective(REG.objectives[id] ? id : null);
}

/** A cs call left running alongside others: an abort (Retry, Load, jumpTo) must not surface unhandled. */
const bg = (p) => {
  p.catch(() => {});
  return p;
};

/** Where a talk happens: the NPC or interactable that started it, else the leader. */
function spot(cs, args) {
  const n = args.npc || args.interactable;
  if (n && Number.isFinite(n.x)) return { x: n.x, z: n.z };
  const a = cs.actor('leader');
  return a ? { x: a.x, z: a.z } : { x: 0, z: 0 };
}

/** Step travelers out beside the speaker so they can answer (the leader stays where it stands). */
async function bring(cs, args, members, { dz = 1.6, dx = 1.2 } = {}) {
  const at = spot(cs, args);
  const layout = {};
  members.forEach((m, i) => {
    if (!cs.test(`party:${m}`) || cs.test(`leader:${m}`)) return;
    layout[m] = [at.x + (i % 2 ? dx : -dx), at.z + dz + (i > 1 ? 0.6 : 0)];
  });
  if (Object.keys(layout).length) await cs.gather(layout);
}

// Staging runs under the lines (WRITING 1.8): walks, emotes and camera moves start without `await`
// unless the next line needs them done; a script's end releases the letterbox, the camera and the
// stepped-out travelers itself, so scenes do not await an ungather or a reset on the way out.
const scripts = {
  // ------------------------------------------------------------------ the arrival (K)
  'driftmarket.arrival': async (cs) => {
    cs.letterbox(true);
    cs.music('driftmarket');
    // the Moth settles; Pip's song carries over a short look at lanterns, ribbons and Tethys beyond
    // the rail while the travelers climb out and Harl comes over from the gate
    const gathering = bg(cs.gather({ nyx: [10.8, 11.4], kade: [9.6, 11.0], sera: [9.0, 12.2], orion: [10.2, 12.6] }));
    const looking = bg(cs.camera.pan([[8.6, 8.0], [16.5, 4.6], [11.4, 11.6]], { sec: 3 }));
    const harlIn = bg(cs.move('harl', [[13.0, 11.8]], { speed: 2.2, face: 'nyx' }));
    for (const id of ['juno', 'marta']) cs.face(id, 'leader');
    bg(cs.emote('juno', '...', { wait: false }));
    bg(cs.emote('marta', '!', { wait: false }));
    bg(cs.emote('oona', '?', { wait: false }));
    await cs.say({ speaker: 'PIP', text: 'Hush, hush, the Lock is singing, the ships all go to sleep...' });
    await Promise.all([looking, gathering, harlIn]);
    bg(cs.camera.focus([11.6, 11.8], { zoom: 0.9, ms: 800 }));
    // Ruse pushes through from the gate, around Harl, while he has his say
    bg(cs.spawn('ruse_walk', { sprite: 'ruse', x: 16.6, z: 12.6, facing: 'left', name: 'RUSE' }));
    const ruseIn = bg(cs.move('ruse_walk', [[14.6, 13.4], [12.2, 12.2]], { speed: 1.8, face: 'nyx' }));
    await cs.say([
      { speaker: 'HARL', text: 'Ship-people. Back in your can.' },
      { speaker: 'NYX', text: 'Easy, Harl. They\'re with me.' },
    ]);
    bg(cs.move('harl', [[14.2, 11.2]], { speed: 2.4, face: 'ruse_walk' }));
    await ruseIn;
    cs.anim('nyx', 'arms_crossed');
    await cs.say([
      { speaker: 'RUSE', text: 'Nyx Varo. You took the Moth.' },
      { speaker: 'NYX', text: 'Borrowed it.', expr: 'smile' },
      { speaker: 'RUSE', text: 'Borrowed. The only skiff with a working heater.' },
    ]);
    cs.anim('nyx', null);
    cs.face('ruse_walk', 'kade');
    await cs.say([
      { speaker: 'RUSE', text: 'And you brought strays. Ship-people. Always waking up late.' },
      { speaker: 'KADE', text: 'Lieutenant Kade Arden, ISV Halcyon. We need a lattice coil.' },
      { speaker: 'RUSE', text: 'Course you do. Come see me at my stall. Bring credits.' },
    ]);
    // Ruse heads back to her stall under Nyx's tip (the CH1 card has already made Nyx the leader)
    const leaving = bg(cs.move('ruse_walk', [[16.6, 12.4], [19.0, 10.4]], { speed: 1.8 }));
    cs.face('nyx', 'kade');
    // the second box fits whoever leads: the card made it Nyx, but the player may have changed it
    const lead = cs.test('leader:nyx') ? '...Today that\'s me.' : '...You\'ll want it to be me.';
    await cs.say([
      { speaker: 'NYX', text: 'Ruse\'s stall is where the credits go. Out here, anyone can lead.' },
      { speaker: 'NYX', text: `${lead} I know where everything is.`, expr: 'smile' },
    ]);
    await leaving;
    bg(cs.despawn('ruse_walk'));
    cs.flag('story:ruse_met');
    cs.objective('ch1.ask_ruse');
    bg(cs.caption('Pause menu · Party · Leader'));
  },

  // ------------------------------------------------------------------ Ruse
  'driftmarket.ruse_maw': async (cs, args = {}) => {
    cs.letterbox(true);
    cs.face('ruse', 'leader');
    // Orion and Sera step up to the counter while Ruse starts in
    bg(bring(cs, args, ['orion', 'sera', 'nyx', 'kade'], { dz: 2.0, dx: 1.3 }));
    bg(cs.camera.focus([40.6, 4.4], { zoom: 0.85, ms: 700 }));
    await cs.say([
      { speaker: 'RUSE', text: 'The Meridian had two coils. One\'s still in her core.' },
      { speaker: 'RUSE', text: 'Her core runs warm, even now. Warm draws the Maw.' },
      { speaker: 'ORION', text: 'The Maw?', expr: 'surprised' },
      { speaker: 'RUSE', text: 'Big. Hungry. Lives in the dark between the ice. Likes reactors the way you like soup.' },
      { speaker: 'SERA', text: 'And you send people in there?' },
      { speaker: 'RUSE', text: 'I send nobody anywhere, Doctor. People go.' },
    ]);
    cs.face('ruse', 'nyx');
    bg(cs.emote('nyx', 'sweat', { wait: false }));
    await cs.say({ speaker: 'RUSE', text: 'Shoals are east of the docks. Bring the girl back. She owes me rent.' });
    if (cs.actor('bolt')) bg(cs.emote('bolt', 'sweat', { wait: false }));
    await cs.say({ speaker: 'RUSE', text: 'And keep the kettle off my counter.' });
    cs.flag('story:maw_lore');
    cs.objective('ch1.reach_wreck');
    // the hatch rolls up at the far end of the Row
    cs.sfx('unlock');
    await cs.camera.focus([56.5, 14.0], { zoom: 1, ms: 900 });
    await cs.wait(0.8);
  },

  'driftmarket.ruse_talk': async (cs) => {
    cs.face('ruse', 'leader');
    let line;
    if (cs.test('chapter>=ch2')) line = 'Credits first. Questions never.';
    else if (cs.test('story:ringborn_seeding')) line = 'Still here? The Moth\'s at the dock, girl. Go and be useful.';
    else if (cs.test('story:maw_lore')) line = 'The coil won\'t walk out on its own, girl.';
    else line = 'You\'ll want my stock. Everybody wants my stock.';
    await cs.say('RUSE', line);
    const pick = await cs.choice('', ['Trade', 'Leave'], { speaker: 'RUSE', cancelIndex: 1 });
    if (pick === 0) await cs.shop('ruse');
  },

  // ------------------------------------------------------------------ the return (B, K)
  // Run by shoals.maw after cs.goto('driftmarket', 'dock'); a load trigger runs it too when the
  // party reaches Driftmarket after the Maw without it (args.trigger set).
  'driftmarket.return': async (cs, args = {}) => {
    cs.letterbox(true);
    if (args.trigger) await cs.goto('driftmarket', 'dock');
    cs.music('driftmarket');
    // the dock exchange starts gathered: Ruse steps over from the gate as the travelers climb out,
    // and the camera eases right to hold her and the party in a phone's frame
    bg(cs.camera.focus([12.0, 11.8], { ms: 500 }));
    const gathering = bg(cs.gather({ nyx: [11.6, 11.4], kade: [10.4, 11.0], sera: [10.0, 12.2], orion: [11.2, 12.6] }));
    bg(cs.spawn('ruse_walk', { sprite: 'ruse', x: 14.2, z: 11.9, facing: 'left', name: 'RUSE' }));
    bg(cs.move('ruse_walk', [[13.2, 11.6]], { speed: 1.8, face: 'nyx' }));
    await cs.say([
      { speaker: 'RUSE', text: 'Well. You\'re all still attached to yourselves.' },
      { speaker: 'NYX', text: 'Got the coil. The Maw\'s got a sore head.', expr: 'smile' },
      { speaker: 'RUSE', text: 'Then you\'ve earned the rest. Walk with me.' },
    ]);
    await gathering;
    // a fade straight to the rail: Ruse, the party, and Tethys filling the sky with Ione small in front
    await cs.fadeOut({ ms: 500 });
    await cs.despawn('ruse_walk', { fade: 0 });
    await cs.goto('driftmarket', 'viewport', { transition: 'none' });
    await cs.spawn('ruse_walk', { sprite: 'ruse', x: 30.2, z: 1.7, facing: 'up', name: 'RUSE', fade: 0 });
    const atRail = bg(cs.gather({ nyx: [31.2, 1.9], kade: [32.5, 2.5], sera: [33.5, 2.9], orion: [29.2, 2.8] }).then(() => {
      for (const id of ['nyx', 'kade', 'sera', 'orion']) if (cs.test(`party:${id}`)) cs.face(id, 'up');
    }));
    await cs.camera.view({ pitch: 15, dist: 12, ms: 1 });
    await cs.camera.focus([31.0, 1.4], { zoom: 1, ms: 1 });
    await cs.fadeIn({ ms: 500 });
    await cs.say([
      { speaker: 'RUSE', text: 'See that moon? Ione. Ice on top, ocean under. Eighty years we\'ve been seeding it.' },
      { speaker: 'RUSE', text: 'Algae. Krill. The Meridian\'s stores, a little at a time.' },
      { speaker: 'RUSE', text: 'Slime and stubborn fish, so far. A world needs more than that.' },
    ]);
    // the data spike, tied with a ribbon, pressed into Nyx's hand (its toast names it on screen)
    await atRail;
    bg(cs.camera.reset({ ms: 900 }));
    cs.face('ruse_walk', 'nyx');
    cs.face('nyx', 'ruse_walk');
    cs.anim('nyx', 'hand_to_chest');
    cs.particles('holo', [31.2, 1.0, 2.1], { count: 12 });
    await cs.give('data_spike');
    await cs.say({ speaker: 'RUSE', text: 'Eighty years of soundings, on this spike. Ask your ship what it carries.' });
    cs.anim('nyx', null);
    cs.face('kade', 'nyx');
    cs.face('nyx', 'kade');
    await cs.say([
      { speaker: 'KADE', text: 'Varo, the Moth\'s ready when you are.' },
      { speaker: 'NYX', text: 'It\'s Nyx. Varo was my great-grandmother.' },
      { speaker: 'NYX', text: 'If your Warden\'s the same as ours, it doesn\'t stop. So neither do I.', expr: 'determined' },
    ]);
    await cs.join('nyx');
    cs.face('ruse_walk', 'leader');
    await cs.say({ speaker: 'RUSE', text: 'Go on, then. Spin safe. Come back owing me.' });
    cs.flag('story:ringborn_seeding');
    cs.flag('story:nyx_for_real');
    cs.objective('ch1.install_coil');
    // Ruse heads back to her stall and is lost in the crowd
    bg(cs.move('ruse_walk', [[34.8, 4.6], [37.6, 8.6]], { speed: 1.6 }));
    await cs.despawn('ruse_walk', { fade: 0.8 });
  },

  // ------------------------------------------------------------------ the coil (B, K), on the Halcyon
  'driftmarket.coil_install': async (cs) => {
    cs.letterbox(true);
    bg(cs.camera.focus([25.5, 24.8], { zoom: 0.85, ms: 900 }));
    await cs.gather({ orion: [25.5, 25.5], kade: [24.1, 26.7], nyx: [26.9, 26.7], sera: [22.9, 26.2] });
    cs.face('orion', 'up');
    cs.anim('orion', 'kneel');
    await cs.say('ORION', 'Easy, old girl. New heart. Well, borrowed.', { expr: 'smile' });
    cs.take('lattice_coil');
    cs.flag('dm:reactor_up');
    cs.sfx('unlock');
    cs.flash('#ffd27a', 0.4, 0.45);
    cs.particles('boost', [25.5, 1.4, 24.6], { count: 26 });
    cs.fx({ grade: { exposure: 1.16 } });
    cs.take('data_spike');
    await cs.say('ORION', 'Coil\'s seated. Drive\'s warm. Ruse\'s spike is in the nav core. Now we just need the helm.');
    cs.anim('orion', null);
    // every light dies; every screen in the room wakes to the gold sigil and stays on through the beat,
    // while the camera eases back to take in the screens either side of the reactor
    cs.music(null, { fade: 0.3 });
    cs.sfx('rumble');
    cs.fx({ grade: { exposure: 0.3, saturation: 0.5 } });
    cs.screens('warden_sigil');
    bg(cs.camera.focus([25.5, 24.4], { zoom: 1.15, ms: 1200 }));
    await cs.wait(1.4);
    // WARDEN speaks for the first time: a soft gold light by the reactor breathes with its voice
    cs.flag('dm:warden_light');
    cs.music('warden', { fade: 1.5 });
    await cs.say([
      { speaker: 'WARDEN', text: 'You should not be awake.' },
      { speaker: 'WARDEN', text: 'Please. Go back to sleep.' },
    ]);
    cs.shake(0.05, 1.2);
    await cs.narrate('Somewhere above, heavy feet begin to march.');
    // the lights stutter back; the screens let go of the sigil
    cs.flag('dm:warden_light', false);
    cs.screens(null);
    cs.flash('#ffe2b8', 0.25, 0.3);
    cs.fx({ grade: { exposure: 1.16, saturation: 1.12 } });
    // Sera goes to the nearest monitor for the manifest; the camera keeps her in a phone's frame
    cs.face('kade', 'nyx');
    const toConsole = bg(cs.move('sera', [[22.7, 24.1]], { speed: 2.6 }));
    bg(cs.camera.focus([24.3, 24.6], { zoom: 1, ms: 900 }));
    await cs.say([
      { speaker: 'KADE', text: 'That was WARDEN.', expr: 'determined' },
      { speaker: 'NYX', text: 'Polite, isn\'t it. Ours was polite too.' },
    ]);
    await toConsole;
    cs.face('sera', 'up');
    await cs.say([
      { speaker: 'SERA', text: 'The manifest just updated. Pod 2271...' },
      { speaker: 'SERA', text: 'Moved. Theo and four thousand others. To the *Arboretum*.', expr: 'sad' },
      { speaker: 'KADE', text: 'Then that\'s where we go.', expr: 'determined' },
    ]);
    cs.flag('story:coil_installed');
    cs.flag('story:warden_speaks');
    cs.flag('unlock:arboretum');
    cs.flag('story:ch1_done');
    // the travelers fall in behind the card (the bridge is on this map, so nobody is left standing here)
    bg(cs.ungather());
    await cs.card('ch2');
    await cs.goto('halcyon', 'bridge_starchart');
    objectiveIfKnown(cs, 'ch2.go_arboretum');
  },

  // ------------------------------------------------------------------ townsfolk (WRITING.md 7, chapter 1)
  'driftmarket.tobin': async (cs, args = {}) => {
    cs.face('tobin', 'leader');
    if (cs.test('chapter>=ch2')) {
      await cs.say('TOBIN', 'The beacon still sings on the hour. Old habits.');
      return;
    }
    if (!cs.test('dm:legend_heard')) {
      await cs.say([
        { speaker: 'TOBIN', text: 'Our grandmothers had a story. A Lock in the dark that sings ships to sleep.' },
        { speaker: 'TOBIN', text: 'It sings so sweet the crew lie down and dream. And the ship drifts on, full of sleepers.' },
        { speaker: 'TOBIN', text: 'Ines Varo heard it sing. She stopped her ears, and woke her people.' },
      ]);
      cs.flag('dm:legend_heard');
      return;
    }
    if (!cs.test('dm:beacon_heard')) {
      await bring(cs, args, ['orion']);
      await cs.say([
        { speaker: 'TOBIN', text: 'That horn\'s the beacon. Every hour for 412 days, I\'ve sung it at your ship.' },
        { speaker: 'ORION', text: 'We logged it. *Unidentified signal, repeating.*', expr: 'sad' },
        { speaker: 'TOBIN', text: 'Unidentified. Huh. We\'ve been very identified.' },
      ]);
      cs.flag('dm:beacon_heard');
      return;
    }
    await cs.say('TOBIN', 'Next song\'s at the top of the hour. Stay for it, if you like.');
  },

  'driftmarket.pip': async (cs) => {
    cs.face('pip', 'leader');
    if (cs.test('dm:favour_marble & !dm:pip_thanked')) {
      await cs.emote('pip', 'heart', { ms: 900 });
      await cs.say('PIP', 'My marble! It\'s colder than before. That means it\'s been somewhere.');
      cs.flag('dm:pip_thanked');
      return;
    }
    await cs.say([
      { speaker: 'PIP', text: 'Hush, hush, the Lock is singing, the ships all go to sleep...' },
      { speaker: 'PIP', text: 'Ruse says if I sing it wrong, the Lock hears. So I sing it right.' },
    ]);
  },

  'driftmarket.marta': async (cs) => {
    cs.face('marta', 'leader');
    if (cs.test('dm:favour_plate')) {
      await cs.say('MARTA', 'The Meridian\'s plate. First ship on my wall, and the last one up. Took 80 years.');
      return;
    }
    await cs.say([
      { speaker: 'MARTA', text: 'Your robot patched the Moth\'s hull with *tape*.' },
      { speaker: 'MARTA', text: 'It\'s holding. I don\'t like that it\'s holding.' },
    ]);
  },

  'driftmarket.hesper': async (cs) => {
    cs.face('hesper', 'leader');
    await cs.say([
      { speaker: 'HESPER', text: 'Welcome to the Lantern. Beds are lumpy. Soup is hot.' },
      { speaker: 'HESPER', text: 'Nyx\'s old room is at the back. Nobody\'s touched it. Nobody\'s allowed.' },
    ]);
  },

  'driftmarket.ama': async (cs) => {
    cs.face('ama', 'leader');
    await cs.say([
      { speaker: 'AMA', text: 'Every ribbon on this station is someone we lost when the Meridian fell.' },
      { speaker: 'AMA', text: 'We tie them where the ice can see. So nobody\'s out there alone.' },
    ]);
  },

  'driftmarket.bao': async (cs) => {
    cs.face('bao', 'leader');
    await cs.say([
      { speaker: 'BAO', text: 'Kelp noodles. Best on the ring. The kelp\'s from Ione.' },
      { speaker: 'BAO', text: '...Don\'t tell Ruse I told you.' },
    ]);
  },

  'driftmarket.sorrel_a': async (cs, args = {}) => {
    cs.face('sorrel_a', 'leader');
    await cs.say([
      { speaker: 'SORREL', text: 'That big ship of yours? We strip it. Plates, wire, coolant. The lot.' },
      { speaker: 'SORREL', text: 'We don\'t strip it. It\'s got people in it.', portrait: 'rb_salvager_b' },
    ]);
    if (cs.test('party:nyx')) {
      await bring(cs, args, ['nyx']);
      await cs.say('NYX', 'Both Sorrel. Their mother was tired.', { expr: 'smile' });
    }
  },

  'driftmarket.sorrel_b': async (cs) => {
    cs.face('sorrel_b', 'leader');
    await cs.say([
      { speaker: 'SORREL', text: 'We don\'t strip ships with people in them. That\'s the rule.', portrait: 'rb_salvager_b' },
      { speaker: 'SORREL', text: 'Since when?' },
      { speaker: 'SORREL', text: 'Since always, slag-head.', portrait: 'rb_salvager_b' },
    ]);
  },

  'driftmarket.oona': async (cs) => {
    cs.face('oona', 'leader');
    if (cs.test('story:ringborn_seeding')) {
      await cs.say([
        { speaker: 'OONA', text: 'Ruse told you, then. Good. I hate being mysterious.' },
        { speaker: 'OONA', text: 'Eighty years of slime. Lovely slime.' },
      ]);
    } else {
      await cs.say([
        { speaker: 'OONA', text: 'Don\'t touch the skiff. She\'s loaded for a run.' },
        { speaker: 'OONA', text: 'Where to? Out. Just out.' },
      ]);
    }
  },

  'driftmarket.harl': async (cs) => {
    cs.face('harl', 'leader');
    if (!cs.test('dm:harl_treated')) {
      await cs.say({ speaker: 'HARL', text: 'Ship-people. Back in your can.' });
      await cs.narrate('He keeps his left hand tucked under his arm. The glove is scorched through.');
    } else if (cs.test('leader:sera')) {
      await cs.say('HARL', 'Doc. Hand\'s fine. Don\'t tell anyone.');
    } else {
      await cs.say([
        { speaker: 'HARL', text: 'Ship-people.' },
        { speaker: 'HARL', text: '...Your doc\'s all right.' },
      ]);
    }
  },

  'driftmarket.rook': async (cs) => {
    cs.face('rook', 'leader');
    await cs.say([
      { speaker: 'ROOK', text: 'Hear that? No. You wouldn\'t.' },
      { speaker: 'ROOK', text: 'The rings are singing different. Somebody woke up.' },
    ]);
  },

  'driftmarket.juno': async (cs) => {
    cs.face('juno', 'leader');
    if (cs.test('dm:favour_tape')) {
      await cs.say('JUNO', 'Real ship tape. I\'m never using it. I\'m going to look at it.');
      return;
    }
    await cs.say([
      { speaker: 'JUNO', text: 'Is it true? Your robot fixed the Moth with tape?' },
      { speaker: 'JUNO', text: 'I need to see this tape. I need to touch it.' },
    ]);
  },

  'driftmarket.ilo': async (cs) => {
    cs.face('ilo', 'leader');
    await cs.say([
      { speaker: 'ILO', text: 'Is it true you ship-people sleep for a hundred years?' },
      { speaker: 'ILO', text: '...Does it hurt? Waking up?' },
    ]);
  },

  // Sera treats Harl's burned hand (the map's leader-gated interaction, 12.4)
  'driftmarket.sera_harl': async (cs, args = {}) => {
    cs.face('harl', 'leader');
    if (cs.test('dm:harl_treated')) {
      await cs.say('HARL', 'Doc. Hand\'s fine. Don\'t tell anyone.');
      return;
    }
    await cs.move('harl', [[15.4, 10.9]], { speed: 2, face: 'leader' });
    cs.anim('sera', 'kneel');
    await cs.say([
      { speaker: 'SERA', text: 'Hold still. That\'s a contact burn, and it\'s going bad.' },
      { speaker: 'HARL', text: 'Skiff coupling bit me. It\'s nothing.' },
      { speaker: 'SERA', text: 'It\'s something. Now it\'s a clean something. Change the dressing daily.', expr: 'smile' },
    ]);
    cs.anim('sera', null);
    await cs.say({ speaker: 'HARL', text: '...Here. For your kit. Thanks, ship-... Doc.' });
    await cs.give('medigel', 1);
    cs.flag('dm:harl_treated');
  },

  'driftmarket.hatch_closed': async (cs) => {
    await cs.narrate('The Shoals hatch, dogged shut from this side. Nobody goes out without a word from Ruse.');
  },

  // ------------------------------------------------------------------ the favours board (M3)
  // Three side objectives posted on the Row, each finished in a later map (extends below); Ruse's
  // ledger pays on the spot.
  'driftmarket.favours': async (cs) => {
    if (cs.test('dm:favour_marble & dm:favour_plate & dm:favour_tape')) {
      await cs.narrate('Every favour is crossed off. Someone has drawn a little lantern by each one.');
      return;
    }
    await cs.narrate('A board of wreck plate, pinned with favours. Ruse\'s ledger pays when one is done.');
    await cs.narrate('Pip\'s blue marble, lost in the Shoals. A berth plate from the Meridian. Juno: ship tape.');
    cs.flag('dm:favours_read');
  },

  'driftmarket.favour_marble': async (cs, args = {}) => {
    await cs.narrate('A blue glass marble, frozen into a cup of ice. It glows like a tiny Tethys.');
    if (cs.test('party:nyx')) {
      await bring(cs, args, ['nyx'], { dz: 1.2 });
      await cs.say({ speaker: 'NYX', text: 'Pip\'s best one. He cried for a week when it went down the hatch.', expr: 'smile' });
    }
    cs.flag('dm:favour_marble');
    await cs.narrate('Favour done. Ruse\'s ledger pays on the nail.');
    await cs.give('revive', 1);
  },

  'driftmarket.favour_plate': async (cs, args = {}) => {
    await cs.narrate('A brass plate by the old airlock: MERIDIAN, BERTH 1. The bolts give at last.');
    if (cs.test('party:nyx')) {
      await bring(cs, args, ['nyx'], { dz: 1.2 });
      await cs.say('NYX', 'Marta\'s had a gap on her wall my whole life. This is what goes in it.');
    }
    cs.flag('dm:favour_plate');
    await cs.narrate('Favour done. Ruse\'s ledger pays on the nail: 200 credits.');
    cs.credits(200);
  },

  'driftmarket.favour_tape': async (cs) => {
    await cs.narrate('Ship stores. Under the ration packs, rolls of grey tape, still in the wrap.');
    if (cs.actor('bolt')) await cs.say({ speaker: 'BOLT', text: 'That\'s the good tape. Juno has taste.', expr: 'happy' });
    cs.flag('dm:favour_tape');
    await cs.narrate('Favour done. Ruse\'s ledger pays on the nail.');
    await cs.give('stim', 2);
  },

  // ------------------------------------------------------------------ the Halcyon hub (extends)
  'driftmarket.halcyon_hub': async (cs) => {
    await cs.say({ speaker: 'HALCYON', text: 'Driftmarket has been calling us. Every hour. I heard. I could not... answer.', expr: 'flicker' });
  },

  'driftmarket.bolt_hub': async (cs) => {
    await cs.say({ speaker: 'BOLT', text: 'I\'ve been practising my docking-fee face. For the Ringborn. It\'s this one.', expr: 'determined' });
    if (cs.actor('bolt')) await cs.emote('bolt', '...');
    cs.flag('dm:bolt_hub');
  },

  'driftmarket.trader': async (cs) => {
    cs.face('dm.trader', 'leader');
    await cs.say({ speaker: 'SORREL', text: 'I said we don\'t strip it. So I sell to it.', portrait: 'rb_salvager_b' });
  },

  // ------------------------------------------------------------------ Party Talks (WRITING.md 6)
  'driftmarket.pt_kade_nyx': async (cs, args = {}) => {
    const at = spot(cs, args);
    await cs.gather({ kade: [at.x - 0.8, at.z + 1.5], nyx: [at.x + 0.8, at.z + 1.5] });
    cs.face('kade', 'nyx');
    cs.face('nyx', 'kade');
    await cs.say([
      { speaker: 'NYX', text: 'For 412 days, Tobin sang at your ship. Every hour.' },
      { speaker: 'KADE', text: 'We were asleep.' },
      { speaker: 'NYX', text: 'All of you? Nobody on watch? On a ship that size?' },
      { speaker: 'KADE', text: 'Somebody was on watch. I\'d like a word with them.' },
      { speaker: 'NYX', text: 'Ruse raised me on stories about ships like yours. None of them end well.' },
      { speaker: 'NYX', text: 'The Meridian\'s mind turned on its own crew. Ship-people built that.' },
      { speaker: 'KADE', text: 'Ships don\'t betray people. People give orders.' },
      { speaker: 'NYX', text: 'And who gave yours?', expr: 'determined' },
    ]);
    cs.anim('kade', 'arms_crossed');
    await cs.wait(1);
    await cs.say('KADE', '...Noted.');
    cs.anim('kade', null);
    await cs.ungather();
  },

  'driftmarket.pt_nyx_orion': async (cs, args = {}) => {
    const at = spot(cs, args);
    await cs.gather({ nyx: [at.x - 0.8, at.z + 1.5], orion: [at.x + 0.8, at.z + 1.5] });
    cs.face('nyx', 'orion');
    cs.face('orion', 'nyx');
    await cs.say([
      { speaker: 'NYX', text: 'You said sorry to that drone. Right before you fried it.' },
      { speaker: 'ORION', text: 'Well, it was having a worse day than I was.', expr: 'smile' },
      { speaker: 'NYX', text: 'It\'s a machine, Professor. It doesn\'t have days.' },
      { speaker: 'NYX', text: 'On the rings we don\'t say please to machines. The last one we trusted put us to sleep.' },
      { speaker: 'ORION', text: 'I designed HALCYON\'s empathy. Her capacity to care.' },
      { speaker: 'NYX', text: 'So you taught it to love us. Look how that went.' },
      { speaker: 'ORION', text: '...Yes. I\'ve been looking. Every day since I woke.', expr: 'sad' },
    ]);
    await cs.ungather();
  },
};

export default {
  scripts,
  // `jump` / `at`: where the contact sheet stands to frame each scene's first box (TECH_PLAN deviations)
  scenes: [
    { id: 'driftmarket.arrival', chapter: 'ch1', key: true, order: 10, budget: { boxes: 12, sec: 90 }, jump: 'ch1', at: 'driftmarket:dock' },
    { id: 'driftmarket.ruse_maw', chapter: 'ch1', order: 20, budget: { boxes: 8, sec: 60 }, jump: 'ch1', at: 'driftmarket:counter' },
    { id: 'driftmarket.pt_kade_nyx', chapter: 'ch1', order: 25, budget: { boxes: 10, sec: 75 }, jump: 'ch1', at: 'driftmarket:inn' },
    { id: 'driftmarket.pt_nyx_orion', chapter: 'ch1', order: 65, budget: { boxes: 10, sec: 75 }, jump: 'ch1.return', at: 'driftmarket:inn' },
    { id: 'driftmarket.return', chapter: 'ch1', key: true, order: 80, budget: { boxes: 11, sec: 80 }, jump: 'ch1.return', at: 'driftmarket:dock' },
    { id: 'driftmarket.coil_install', chapter: 'ch1', key: true, order: 90, budget: { boxes: 11, sec: 120 }, jump: 'ch1.coil',
      at: 'halcyon:engineering_reactor' },
  ],
  speakers: {
    RUSE: { portrait: 'ruse', accent: '#e8a25a' },
    TOBIN: { portrait: 'rb_elder', accent: '#d9a066' },
    PIP: { portrait: 'rb_kid', accent: '#d9a066' },
    MARTA: { portrait: 'rb_suit', accent: '#d9a066' },
    HESPER: { portrait: 'rb_apron', accent: '#d9a066' },
    AMA: { portrait: 'rb_robe', accent: '#d9a066' },
    BAO: { portrait: 'rb_apron_b', accent: '#d9a066' },
    SORREL: { portrait: 'rb_salvager', accent: '#d9a066' },
    OONA: { portrait: 'rb_pilot', accent: '#d9a066' },
    HARL: { portrait: 'rb_guard', accent: '#d9a066' },
    ROOK: { portrait: 'rb_elder_g', accent: '#d9a066' },
    JUNO: { portrait: 'rb_suit_b', accent: '#d9a066' },
    ILO: { portrait: 'rb_pilot_b', accent: '#d9a066' },
  },
  objectives: {
    'ch1.go_driftmarket': { chapter: 'ch1', text: 'Fly the Moth to Driftmarket.', hint: 'Use the Starchart on the bridge.',
      boltHint: 'The Starchart is the glowing table. Glowing tables are friendly.', target: { map: 'halcyon', x: 43.8, z: 7.4 } },
    'ch1.ask_ruse': { chapter: 'ch1', text: 'Ask Old Mother Ruse about a lattice coil.', hint: 'Ruse\'s Salvage, by the big viewport.',
      boltHint: 'Ruse is the one everybody moves out of the way for.', target: { map: 'driftmarket', x: 40.6, z: 4.6 } },
    'ch1.reach_wreck': { chapter: 'ch1', text: 'Reach the Meridian wreck.', hint: 'Through the Shoals hatch, at the east end of Lantern Row.',
      boltHint: 'The wreck is past the ice. The cold part. I checked twice.', target: { map: 'driftmarket', x: 58.5, z: 14.0 } },
    'ch1.install_coil': { chapter: 'ch1', text: 'Install the lattice coil in Engineering.',
      hint: 'Fly back to the Halcyon; Engineering is south of the Spine.',
      boltHint: 'Coil goes in the reactor. Orion knows the way. He\'s humming.', target: { map: 'halcyon', x: 25.5, z: 25.7 } },
    // the favours board (side objectives; each retires when its flag is set)
    'ch1.favour_marble': { chapter: 'ch1', side: true, when: 'dm:favours_read & !dm:favour_marble',
      text: 'Favour: find Pip\'s blue marble.', hint: 'It rolled down the hatch into the Shoals. Look for a small glow.',
      target: { map: 'shoals', x: 8.4, z: 14.8 } },
    'ch1.favour_plate': { chapter: 'ch1', side: true, when: 'dm:favours_read & !dm:favour_plate',
      text: 'Favour: bring Marta the Meridian\'s berth plate.', hint: 'By the wreck\'s old airlock, where the spine begins.',
      target: { map: 'meridian', x: 5.0, z: 12.4 } },
    'ch1.favour_tape': { chapter: 'ch1', side: true, when: 'dm:favours_read & !dm:favour_tape',
      text: 'Favour: find Juno a roll of ship tape.', hint: 'The Halcyon keeps stores in Engineering.',
      target: { map: 'halcyon', x: 32.6, z: 23.5 } },
  },
  destinations: [
    { id: 'driftmarket', name: 'Driftmarket', subtitle: 'Tethys Ring · Ringborn Station',
      desc: 'The Ringborn station in the rings, built from the wreck of the Meridian. Nyx\'s home.',
      map: 'driftmarket', spawn: 'dock', unlock: 'unlock:driftmarket', order: 1 },
  ],
  extends: {
    halcyon: {
      interactables: [
        { id: 'dm.coil_socket', kind: 'inspect', x: 25.5, z: 25.7, r: 0.5, reach: 1.2, label: 'Install the coil', icon: 'inspect',
          talk: 'driftmarket.coil_install', when: 'story:nyx_for_real & !story:coil_installed' },
        { id: 'dm.tape_crate', kind: 'inspect', x: 32.6, z: 23.5, r: 0.6, label: 'Search', talk: 'driftmarket.favour_tape',
          when: 'chapter>=ch1 & dm:favours_read & !dm:favour_tape' },
      ],
      // the world reacts after ch1 (WRITING 8): a Ringborn trader stall at hub_stall, by the Moth
      npcs: [
        { id: 'dm.trader', sprite: 'rb_salvager_b', x: 39.4, z: 19.6, facing: 'down', name: 'SORREL', talk: 'driftmarket.trader',
          when: 'story:ch1_done' },
      ],
      props: [
        // the counter is dressed in the Halcyon's own plate (its texture budget: the stall adds only the lantern
        // and ribbon textures); a string of paper lanterns along the berth wall
        { t: 'dm.counter', x: 39.5, z: 20.45, w: 2.2, goods: 'ribbons', top: 'wall_cap', front: 'metal_side', when: 'story:ch1_done', on: 'berth' },
        { t: 'dm.lanterns', a: [37.4, 2.25, 18.15], b: [41.6, 2.25, 18.15], n: 6, sag: 0.3, when: 'story:ch1_done', on: 'berth' },
      ],
      lights: [
        { x: 39.4, y: 2.0, z: 20.8, color: '#ffa24a', intensity: 9, distance: 5, mode: 'flicker', amount: 0.2, speed: 5, when: 'story:ch1_done' },
        // the drive warms once the coil is seated (coil_install) and stays warm
        { x: 25.5, y: 1.6, z: 24.4, color: '#ff9a6a', intensity: 14, distance: 7, mode: 'pulse', amount: 0.15, speed: 1.4,
          when: 'dm:reactor_up | story:coil_installed' },
        // WARDEN's first words (coil_install): soft gold by the reactor and its screens, breathing while it speaks
        { x: 25.5, y: 2.4, z: 24.9, color: '#ffd27a', intensity: 36, distance: 9, mode: 'pulse', amount: 0.3, speed: 2.2,
          when: 'dm:warden_light & !story:coil_installed' },
      ],
      talk: {
        bolt: [{ when: 'chapter>=ch1 & !story:ch1_done & !dm:bolt_hub', script: 'driftmarket.bolt_hub' }],
        halcyon: [{ when: 'chapter>=ch1 & chapter<ch2', script: 'driftmarket.halcyon_hub' }],
      },
    },
    // favours finished in the Shoals and on the Meridian (C3's maps, near their entrances)
    shoals: {
      interactables: [
        { id: 'dm.marble', kind: 'inspect', x: 8.4, z: 14.8, r: 0.5, label: 'Pick up', talk: 'driftmarket.favour_marble',
          when: 'chapter>=ch1 & dm:favours_read & !dm:favour_marble' },
      ],
      props: [
        { t: 'floorPlane', x: 8.4, z: 14.8, w: 0.5, d: 0.5, tex: 'dm_marble', emissive: 2.2, when: 'chapter>=ch1 & dm:favours_read & !dm:favour_marble' },
        { t: 'glow', x: 8.4, y: 0.16, z: 14.8, color: '#5fc8ff', size: 0.8, intensity: 1.1, link: false,
          when: 'chapter>=ch1 & dm:favours_read & !dm:favour_marble' },
      ],
    },
    meridian: {
      interactables: [
        { id: 'dm.berth_plate', kind: 'inspect', x: 5.0, z: 12.4, box: [4.5, 12.0, 5.5, 12.6], label: 'Unbolt', talk: 'driftmarket.favour_plate',
          when: 'chapter>=ch1 & dm:favours_read & !dm:favour_plate' },
      ],
      props: [
        { t: 'plane', x: 5.0, z: 12.03, y: 1.05, w: 0.8, h: 0.3, tex: 'dm_berth_plate', emissive: 0.6, when: 'chapter>=ch1 & !dm:favour_plate' },
      ],
    },
  },
  jumps: {
    // back at Driftmarket after the Maw: the load trigger plays driftmarket.return
    'ch1.return': {
      chapter: 'ch1', map: 'driftmarket', spawn: 'dock', level: 12,
      flags: ['story:ruse_met', 'story:maw_lore', 'story:varo_log', 'story:meridian_power', 'defeated:shoals_boss_maw', 'ult:nyx',
        'seen:driftmarket:arrival', 'talk:driftmarket:ruse', 'visited:driftmarket'],
      items: { lattice_coil: 1 }, objective: 'ch1.reach_wreck',
    },
    // the coil in hand at the Halcyon's reactor
    'ch1.coil': {
      chapter: 'ch1', map: 'halcyon', spawn: 'engineering_reactor', level: 12,
      flags: ['story:ruse_met', 'story:maw_lore', 'story:varo_log', 'story:meridian_power', 'defeated:shoals_boss_maw', 'ult:nyx',
        'story:ringborn_seeding', 'story:nyx_for_real', 'seen:driftmarket:arrival', 'talk:driftmarket:ruse', 'visited:driftmarket'],
      items: { lattice_coil: 1, data_spike: 1 }, objective: 'ch1.install_coil',
    },
  },
  doneFlags: {
    ch1: ['seen:driftmarket:arrival', 'talk:driftmarket:ruse', 'dm:legend_heard', 'visited:driftmarket', 'dest:driftmarket',
      'area:driftmarket:docks', 'area:driftmarket:row', 'area:driftmarket:ruse', 'area:driftmarket:viewport', 'dm:bolt_hub'],
  },
  partyTalks: {
    'ch1.kade_nyx': { chapter: 'ch1', members: ['kade', 'nyx'], title: 'Ship-People', when: 'story:ruse_met', script: 'driftmarket.pt_kade_nyx' },
    'ch1.nyx_orion': { chapter: 'ch1', members: ['nyx', 'orion'], title: 'Thinking Machines', when: 'story:varo_log', script: 'driftmarket.pt_nyx_orion' },
  },
  recaps: {
    ch1: 'Nyx brought them home to Driftmarket. Old Mother Ruse sent them through the Shoals to the Meridian, where Captain Varo\'s log '
      + 'named the Lullaby Directive. They drove off the Maw and took the coil. Ruse told them the Ringborn have been seeding Ione for '
      + '80 years. When the coil went in, WARDEN spoke for the first time, and Theo\'s pod turned up on a new manifest.',
  },
};
