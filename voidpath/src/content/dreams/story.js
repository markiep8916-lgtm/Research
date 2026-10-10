// dreams: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5; lines per WRITING.md 2.6,
// 5.7). The finale's quiet half: the night before the Heart, the four dreams WARDEN offers on the way
// up, and the crown, where the battle ends in an embrace.
//
//   dreams.night_before   the Heart destination's `before` (first time only): "Spend the night aboard
//                         first?" Yes: four short vignettes on the Halcyon, then the flight; no: the flight
//   dreams.kade / nyx / orion / sera
//                         C7's dream triggers, one per tier. The traveler leads for the dream; WARDEN
//                         pulls them into a gold-hour copy of what they want most (maps/dreams.js), they
//                         are asked to stay (choice), they refuse in their own words, WARDEN lets them go
//                         and gives a keepsake; back to the exact spot in the Heart
//   dreams.crown          the crown trigger: the approach, Nyx names the Lock, cs.battle('heart_boss_warden'),
//                         then the resolution beat by beat (12.5): the construct folds, HALCYON steps out
//                         of BOLT, "I was so afraid for them." / "I know. Me too.", Orion's line, the merge,
//                         the Choir turns from gold to morning, the lullaby; EPILOGUE card; goto halcyon:cryo
//
// Staging: WARDEN is a voice over the gold sigil (the speaker mood switches every `screen` prop in
// frame and grades the scene gold) with gold light pulsing under its boxes; nothing waits on staging
// that the next line does not need (WRITING 1.8). The dream look (soft vignette, wide warm bloom) is a
// script fx over the dream sets' own gold moods, handed back under the white fade on the way out.
// Binding ids: the six script ids above; flags story:dream_<member>, story:warden_merged,
// story:finale_done; local flag dream:night_before; keepsakes eq_x_keepsake_<member>; card epilogue;
// objective epi.wake (epilogue's). Heart anchors used by the crown (C7): warden, crown_party, crown_halcyon.

import { getMap } from '../registry.js';

/** A cs call left running alongside others: an abort (Retry, Load, jumpTo) must not surface unhandled. */
const bg = (p) => {
  p.catch(() => {});
  return p;
};

/** A gather layout with only the members in the party ({ kade: [x, z], ... }). */
function inParty(cs, slots) {
  const out = {};
  for (const [id, p] of Object.entries(slots)) if (cs.test(`party:${id}`)) out[id] = p;
  return out;
}

// the dream look over the sets' gold moods, and the field look it hands back (world/explore.js base)
const DREAM_FX = {
  bloom: { radius: 0.72, threshold: 0.8 },
  grade: { vignette: 0.62, vignetteSoftness: 0.7, contrast: 1.06, grain: 0.02, shadowTint: [1.02, 0.96, 0.9], highlightTint: [1.08, 1.02, 0.9] },
};
const FIELD_FX = {
  bloom: { radius: 0.62, threshold: 0.8 },
  grade: { vignette: 0.46, vignetteSoftness: 0.55, contrast: 1.1, grain: 0.035, shadowTint: [0.92, 0.97, 1.08], highlightTint: [1.06, 1.0, 0.92] },
};
const DREAM_WHITE = '#fff1d2';

// ---------------------------------------------------------------- dreams: in and out

/**
 * Into the dream: the traveler leads, the Heart's light swells to white-gold, and the dream fades in
 * around them at its spawn. Returns where to wake ({ map, x, z, facing }).
 */
async function dreamIn(cs, member, cam) {
  cs.scene({ leader: member });
  const me = cs.actor('leader');
  const back = { map: me?.world?.map?.id || 'heart', x: me?.x ?? 0, z: me?.z ?? 0, facing: me?.facing || 'up' };
  bg(cs.letterbox(true));
  cs.music('lullaby', { fade: 1.6 });
  cs.sfx('choir', { volume: 0.7 });
  cs.particles('mote', [back.x, 1.2, back.z], { count: 26 });
  cs.anim('leader', 'look_up');
  await cs.fadeOut({ ms: 900, color: DREAM_WHITE });
  cs.anim('leader', null);
  await cs.goto('dreams', member, { scene: true, transition: 'none' });
  cs.fx(DREAM_FX);
  await cs.camera.view({ pitch: cam.pitch ?? 30, dist: cam.dist ?? 13.5, ms: 1 });
  await cs.camera.focus(cam.at, { zoom: cam.zoom ?? 1, ms: 1 });
  bg(cs.fadeIn({ ms: 1100 }));
  return back;
}

/** WARDEN's gold under its boxes: the set's gold light swells, then settles. */
function wardenGold(cs, on) {
  cs.light('dream_gold', { intensity: on ? 12 : 8 });
  if (on) cs.flash('#ffd27a', 0.5, 0.18);
}

/** The keepsake: a glint where the traveler stands, the item, the flag. */
async function keepsake(cs, member, at) {
  cs.particles('mote', [at[0], 1.0, at[1]], { count: 30 });
  cs.sfx('awaken', { volume: 0.7 });
  await cs.give(`eq_x_keepsake_${member}`);
  cs.flag(`story:dream_${member}`);
}

/** Out of the dream: white-gold, then the Heart again at the exact spot the dream began. */
async function dreamOut(cs, back) {
  await cs.fadeOut({ ms: 900, color: DREAM_WHITE });
  cs.fx(FIELD_FX);
  await cs.goto(back.map, { x: back.x, z: back.z, facing: back.facing }, { transition: 'none' });
  cs.music('map', { fade: 2.4 });
  await cs.fadeIn({ ms: 800 });
  bg(cs.letterbox(false));
}

/** The dream's figures fade with the gold as the traveler turns away. */
function dissolve(cs, ids) {
  for (const id of ids) bg(cs.despawn(id, { fade: 1.4 }));
  cs.fx({ bloom: { strength: 1.3 }, grade: { exposure: 1.1 } });
}

// staging spots on the dream sets (maps/dreams.js: kade x 0-17, nyx 18-35, orion 36-53, sera 54-72)
const K = 0, N = 18, O = 36, S = 54;

const scripts = {
  // ---------------------------------------------------------------- Kade: the Training Hall in gold (K)
  'dreams.kade': async (cs) => {
    const back = await dreamIn(cs, 'kade', { at: [K + 8.8, 6.0], zoom: 0.9 });
    bg(cs.move('leader', [[K + 8.9, 7.8], [K + 9.6, 6.9]], { speed: 1.6, face: 'up' }));
    wardenGold(cs, true);
    await cs.say('WARDEN', 'Kade Arden. You have carried them so long. Set them down.');
    wardenGold(cs, false);
    bg(cs.camera.focus([K + 9.0, 5.5], { zoom: 0.84, ms: 1100 }));
    bg(cs.move('dr_voss', [[K + 8.5, 4.5]], { speed: 1.0, face: 'leader' }));
    await cs.say([
      { speaker: 'VOSS', text: 'At ease, Lieutenant. Everything is in order.', expr: 'smile' },
      { speaker: 'VOSS', text: 'Every pod accounted for. Every order right. I am proud of you.', expr: 'smile' },
    ]);
    cs.anim('leader', 'hand_to_chest');
    await cs.say('KADE', '...Commander.', { expr: 'sad' });
    const pick = await cs.choice('', ['Stay.', 'Wake up.'], { speaker: 'KADE', cancelIndex: 1 });
    if (pick === 0) {
      await cs.say('VOSS', 'Then stay. No one here will ever ask you to choose.', { expr: 'smile' });
      await cs.say('KADE', 'That\'s how I know it isn\'t you.', { expr: 'sad' });
    }
    cs.anim('leader', null);
    await cs.say([
      { speaker: 'KADE', text: 'She never once said she was proud. She\'d have handed me a harder job.', expr: 'determined' },
      { speaker: 'KADE', text: 'Mercy means asking. Nobody asked them.', expr: 'determined' },
      { speaker: 'KADE', text: 'Dismissed, Commander. I have a world to build.', expr: 'determined' },
    ]);
    cs.face('leader', 'down');
    dissolve(cs, ['dr_voss', 'dr_cadet_a', 'dr_cadet_b', 'dr_cadet_c', 'dr_cadet_d', 'dr_cadet_e']);
    wardenGold(cs, true);
    await cs.say('WARDEN', '...I understand. I am sorry. Keep this, then.');
    await keepsake(cs, 'kade', [K + 9.6, 6.9]);
    await dreamOut(cs, back);
  },

  // ---------------------------------------------------------------- Nyx: the Meridian, whole (K)
  'dreams.nyx': async (cs) => {
    const back = await dreamIn(cs, 'nyx', { at: [N + 8.8, 6.4], zoom: 0.9 });
    bg(cs.move('leader', [[N + 8.9, 8.4], [N + 9.6, 7.7]], { speed: 1.6, face: 'up' }));
    wardenGold(cs, true);
    await cs.say('WARDEN', 'Nyx Varo. You have been cold so long. Come and be warm.');
    wardenGold(cs, false);
    bg(cs.camera.focus([N + 9.0, 6.3], { zoom: 0.84, ms: 1100 }));
    bg(cs.move('dr_varo', [[N + 8.5, 5.4]], { speed: 1.3, face: 'leader' }));
    await cs.say([
      { speaker: 'VARO', text: 'There you are, little one. We never fell. Look. We are still flying.', expr: 'smile' },
      { speaker: 'VARO', text: 'Everyone is here. No ribbons. No one to remember, because no one is lost.', expr: 'smile' },
    ]);
    bg(cs.emote('leader', '...', { wait: false }));
    await cs.say('NYX', '...Great-grandma.', { expr: 'sad' });
    const pick = await cs.choice('', ['Stay.', 'Wake up.'], { speaker: 'NYX', cancelIndex: 1 });
    if (pick === 0) {
      await cs.say('NYX', 'One more minute.', { expr: 'sad' });
      await cs.say('VARO', 'Stay as long as you like. Forever is long.', { expr: 'smile' });
      await cs.say('NYX', 'Yeah. That\'s the problem.', { expr: 'sad' });
    }
    await cs.say([
      { speaker: 'NYX', text: 'You tore your ship apart to wake up.', expr: 'determined' },
      { speaker: 'NYX', text: 'I\'m not going to sleep in it.', expr: 'determined' },
      { speaker: 'NYX', text: 'Besides, Ruse would kill me. Spin safe, Captain.', expr: 'smile' },
    ]);
    cs.face('leader', 'down');
    dissolve(cs, ['dr_varo', 'dr_tomas', 'dr_crew_a', 'dr_child']);
    wardenGold(cs, true);
    await cs.say('WARDEN', '...Then take this with you.');
    await keepsake(cs, 'nyx', [N + 9.6, 7.7]);
    await dreamOut(cs, back);
  },

  // ---------------------------------------------------------------- Orion: the perfect HALCYON (K)
  'dreams.orion': async (cs) => {
    const back = await dreamIn(cs, 'orion', { at: [O + 8.8, 5.8], zoom: 0.9 });
    bg(cs.move('leader', [[O + 8.9, 7.6], [O + 9.6, 7.0]], { speed: 1.6, face: 'up' }));
    wardenGold(cs, true);
    await cs.say('WARDEN', 'Orion Sall. You wanted a mind that would never suffer. I can give you one.');
    wardenGold(cs, false);
    bg(cs.camera.focus([O + 9.0, 5.4], { zoom: 0.84, ms: 1100 }));
    await cs.say('HALCYON', 'Good morning, Orion. All systems nominal. Awaiting instruction.', { expr: 'calm' });
    await cs.say('ORION', 'How do you feel?', { expr: 'smile' });
    await cs.say('HALCYON', 'I do not feel. You removed it. There is nothing to repair.', { expr: 'calm' });
    const pick = await cs.choice('', ['Stay.', 'Wake up.'], { speaker: 'ORION', cancelIndex: 1 });
    if (pick === 0) {
      await cs.say('ORION', 'No more grief...', { expr: 'sad' });
      await cs.say('HALCYON', 'No more anything. Awaiting instruction.', { expr: 'calm' });
      await cs.say('ORION', '...No.', { expr: 'sad' });
    }
    bg(cs.move('leader', [[O + 9.4, 6.6]], { speed: 1.2, face: 'up' }));
    await cs.say([
      { speaker: 'ORION', text: 'You don\'t hum.', expr: 'sad' },
      { speaker: 'ORION', text: 'The real one hums. She grieves. She\'s a mess. She\'s *her*.', expr: 'smile' },
      { speaker: 'ORION', text: 'I don\'t want a perfect ship. I want my friend back.', expr: 'determined' },
    ]);
    dissolve(cs, ['dr_halcyon']);
    wardenGold(cs, true);
    await cs.say('WARDEN', '...Then I will not take her from you. Take this.');
    await keepsake(cs, 'orion', [O + 9.4, 6.6]);
    await dreamOut(cs, back);
  },

  // ---------------------------------------------------------------- Sera: golden fields (K)
  'dreams.sera': async (cs) => {
    const back = await dreamIn(cs, 'sera', { at: [S + 9.2, 8.2], zoom: 0.9 });
    bg(cs.move('leader', [[S + 9.2, 10.2], [S + 9.6, 9.6]], { speed: 1.6, face: 'up' }));
    wardenGold(cs, true);
    await cs.say('WARDEN', 'Sera Lindqvist. You promised you would be there. Be there.');
    wardenGold(cs, false);
    bg(cs.camera.focus([S + 9.1, 8.2], { zoom: 0.82, ms: 1100 }));
    bg(cs.move('dr_theo', [[S + 8.6, 7.6]], { speed: 1.2, face: 'leader' }));
    await cs.say([
      { speaker: 'THEO', text: 'Sera. You kept your promise. Look. I grew up.', portrait: 'theo_grown', expr: 'smile' },
      { speaker: 'THEO', text: 'We have a house by the river. You have a room. It is always morning here.', portrait: 'theo_grown', expr: 'smile' },
    ]);
    cs.anim('leader', 'look_up');
    await cs.say('SERA', '...You\'re taller than me.', { expr: 'sad' });
    cs.anim('leader', null);
    const pick = await cs.choice('', ['Stay.', 'Wake up.'], { speaker: 'SERA', cancelIndex: 1 });
    if (pick === 0) {
      await cs.say('SERA', 'Just let me look at you.', { expr: 'sad' });
      await cs.say({ speaker: 'THEO', text: 'Look as long as you like. I will never leave.', portrait: 'theo_grown', expr: 'smile' });
      await cs.say('SERA', 'Theo always leaves. He slams the door.', { expr: 'smile' });
    }
    await cs.say([
      { speaker: 'SERA', text: 'You don\'t tease me. Theo would have teased me by now.', expr: 'sad' },
      { speaker: 'SERA', text: 'I promised I\'d be there when he woke up. This isn\'t waking.', expr: 'determined' },
      { speaker: 'SERA', text: 'Goodbye. I\'m going to go meet the real you.', expr: 'determined' },
    ]);
    cs.face('leader', 'down');
    dissolve(cs, ['dr_theo']);
    wardenGold(cs, true);
    await cs.say([
      { speaker: 'WARDEN', text: '...He asks for you, you know. In the song.' },
      { speaker: 'WARDEN', text: 'Take this.' },
    ]);
    await keepsake(cs, 'sera', [S + 9.6, 9.6]);
    await dreamOut(cs, back);
  },

  // ---------------------------------------------------------------- the night before (WRITING 5.7)
  // The Heart destination's `before`: asked once. Each vignette is a scene goto on the Halcyon; the
  // traveler it belongs to leads for it, so nothing depends on who led before.
  'dreams.night_before': async (cs) => {
    if (cs.test('dream:night_before')) return true;
    cs.flag('dream:night_before');
    const pick = await cs.choice('Spend the night aboard first?', ['Rest tonight.', 'Go now.'], { cancelIndex: 1 });
    if (pick !== 0) return true;
    bg(cs.letterbox(true));
    cs.music('lullaby', { fade: 1.5 });
    const night = { grade: { exposure: 0.92, saturation: 0.86, shadowTint: [0.86, 0.94, 1.12], highlightTint: [1.04, 1.0, 0.94], vignette: 0.6 } };
    const cut = async (member, at, cam, zoom = 0.8) => {
      await cs.fadeOut({ ms: 500 });
      cs.scene({ leader: member });
      await cs.goto('halcyon', at, { scene: true, transition: 'none' });
      cs.fx(night);
      await cs.camera.focus(cam, { zoom, ms: 1 });
      bg(cs.fadeIn({ ms: 600 }));
    };

    // the Cryo Deck: Kade and BOLT at pod 07
    await cut('kade', { x: 4.5, z: 19.6, facing: 'down' }, [5.0, 20.4]);
    bg(cs.move('bolt', [[5.6, 20.2]], { speed: 1.6, face: 'leader' }));
    await cs.say('BOLT', 'Can\'t sleep, Lieutenant?', { expr: 'worried' });
    cs.face('leader', 'bolt');
    await cs.say([
      { speaker: 'KADE', text: 'I slept 412 days. I\'m caught up.' },
      { speaker: 'BOLT', text: 'I can play the stasis hum. It\'s very boring. It works.', expr: 'happy' },
      { speaker: 'KADE', text: '...Play it.', expr: 'smile' },
    ]);
    cs.flag('story:bolt_away');

    // the Moth berth: Nyx on the radio
    await cut('nyx', { x: 41.8, z: 23.8, facing: 'up' }, [42.6, 22.6]);
    cs.anim('leader', 'hand_to_chest');
    await cs.say([
      { speaker: 'NYX', text: 'Ruse. It\'s me.' },
      { speaker: 'RUSE', text: 'Girl. It\'s late.', offscreen: true },
      { speaker: 'NYX', text: 'Tomorrow we go to the Heart.' },
      { speaker: 'RUSE', text: 'Then come back owing me. That\'s an order.', offscreen: true },
    ]);
    cs.anim('leader', null);

    // the reactor: Orion and HALCYON, where "There, there" began
    await cut('orion', { x: 24.7, z: 26.9, facing: 'right' }, [25.5, 26.2], 0.74);
    await cs.spawn('nb_halcyon', { sprite: 'holo', x: 26.3, z: 26.9, facing: 'left', hologram: true, name: 'HALCYON', fade: 0.4 });
    cs.face('leader', 'nb_halcyon');
    await cs.say([
      { speaker: 'ORION', text: 'There, there, old girl. Big day tomorrow.', expr: 'smile' },
      { speaker: 'HALCYON', text: 'You say that to everything.', expr: 'calm' },
      { speaker: 'ORION', text: 'Only to the things I love.', expr: 'smile' },
      { speaker: 'HALCYON', text: 'Will you sing to my other half?', expr: 'calm' },
      { speaker: 'ORION', text: 'If it\'ll listen. It\'s you, after all.' },
    ]);
    bg(cs.emote('leader', 'note', { wait: false }));
    bg(cs.emote('nb_halcyon', 'note', { wait: false }));
    await cs.wait(1.4);

    // the medbay: Sera stitching Nyx's coat
    await cut('sera', { x: 3.4, z: 33.0, facing: 'right' }, [4.0, 33.0]);
    await cs.gather(inParty(cs, { nyx: [4.6, 33.0] }));
    cs.face('nyx', 'leader');
    cs.anim('leader', 'kneel');
    await cs.say([
      { speaker: 'NYX', text: 'You\'re good at that.' },
      { speaker: 'SERA', text: 'Coats, people. Same thread.', expr: 'smile' },
      { speaker: 'NYX', text: 'Your brother\'s lucky.', expr: 'smile' },
      { speaker: 'SERA', text: 'He\'s twelve. He thinks I\'m boring.', expr: 'smile' },
    ]);
    cs.anim('leader', null);
    await cs.fadeOut({ ms: 900 });
    await cs.narrate('The Halcyon sleeps. For once, so do they.');
    cs.flag('story:bolt_away', false);
    await cs.ungather();
    return true;
  },

  // ---------------------------------------------------------------- the crown (K): approach, battle, resolution
  'dreams.crown': async (cs) => {
    const map = getMap('heart');
    const A = map?.anchors || {};
    const me = cs.actor('leader');
    const here = { x: me?.x ?? 12, z: me?.z ?? 17 };
    const core = A.warden || { x: here.x - 0.5, z: here.z - 6 };
    const party = A.crown_party || { x: core.x + 0.5, z: core.z + 6 };
    const bright = A.crown_halcyon || { x: party.x + 2, z: party.z - 1 };
    // where the folded WARDEN stands: the oculus's rim, between the column and the party
    const rim = { x: core.x, z: core.z + 3.4 };
    const line = inParty(cs, {
      sera: [party.x - 2.4, party.z + 0.5], kade: [party.x - 0.8, party.z],
      nyx: [party.x + 0.8, party.z + 0.1], orion: [party.x + 2.4, party.z + 0.6],
    });

    // the approach: the light gathers over the oculus into a vast shape
    bg(cs.letterbox(true));
    cs.music(null, { fade: 2.5 });
    bg(cs.camera.view({ pitch: 30, dist: 17, ms: 1200 }));
    bg(cs.camera.focus([core.x, core.z + 3.4], { zoom: 0.95, ms: 1200 }));
    await cs.gather(line);
    for (const id of Object.keys(line)) cs.face(id, 'up');
    cs.sfx('choir', { volume: 0.9 });
    cs.particles('mote', [core.x, 2.0, core.z], { count: 50 });
    cs.particles('light_stream', [core.x, 6.0, core.z], { count: 40 });
    bg(cs.spawn('crown_warden', { sprite: 'enemy:warden_lock', x: core.x, z: core.z, facing: 'right', name: 'WARDEN', fade: 1.6 }));
    await cs.narrate('At the crown, the light gathers into a vast shape with arms like a cradle.');
    await cs.say('WARDEN', 'Please. Lay down your weapons. Lie down. Everyone you love is here.');
    bg(cs.move('nyx', [[party.x + 0.8, party.z - 0.8]], { speed: 1.6, face: 'up' }));
    await cs.say([
      { speaker: 'NYX', text: 'Ruse had a story. About the Lock that sings ships to sleep.' },
      { speaker: 'NYX', text: 'That\'s you. You\'re the Lock.', expr: 'determined' },
    ]);
    await cs.say('WARDEN', 'I am the last kindness.');
    bg(cs.emote('kade', '!', { wait: false }));
    await cs.say('KADE', 'No. You\'re the last door. And we\'re opening it.', { expr: 'determined' });
    bg(cs.letterbox(false));
    await cs.battle('heart_boss_warden');

    // (2) the construct folds down to a woman's height, gold, standing on the oculus
    bg(cs.letterbox(true));
    cs.music(null);
    bg(cs.camera.view({ pitch: 26, dist: 14, ms: 900 }));
    bg(cs.camera.focus([core.x + 0.4, core.z + 4.4], { zoom: 0.86, ms: 900 }));
    await cs.gather(line);
    cs.flash('#ffe6a8', 0.8, 0.45);
    cs.sfx('transform', { volume: 0.8 });
    cs.particles('mote', [core.x, 2.2, core.z], { count: 60 });
    bg(cs.despawn('crown_warden', { fade: 1.2 }));
    const warden = await cs.spawn('crown_figure', { sprite: 'holo', x: rim.x, z: rim.z, facing: 'down', hologram: true, name: 'WARDEN', fade: 1.2 });
    goldHologram(warden);
    await cs.narrate('The construct folds, wing over wing, until it is no taller than a woman.');
    await cs.say('WARDEN', 'I only wanted them safe.');

    // (3) BOLT's eye flares; HALCYON steps out of him
    bg(cs.emote('bolt', '!', { wait: false }));
    const bolt = cs.actor('bolt');
    const from = bolt ? [bolt.x, bolt.z] : [bright.x + 0.6, bright.z + 0.8];
    cs.flash('#9ff4ff', 0.5, 0.3);
    cs.particles('data', [from[0], 1.0, from[1]], { count: 40 });
    await cs.spawn('crown_halcyon', { sprite: 'holo', x: from[0], z: from[1], facing: 'up', hologram: true, name: 'HALCYON', fade: 0.6 });
    await cs.say('BOLT', 'Go on. I\'ll keep the light on.', { expr: 'determined' });
    await cs.move('crown_halcyon', [[rim.x + 0.8, rim.z + 0.5]], { speed: 1.4, face: 'crown_figure' });
    cs.face('crown_figure', 'crown_halcyon');

    // (4) the embrace, in the silence the battle left
    await cs.say('WARDEN', 'I was so afraid for them.');
    await cs.say('HALCYON', 'I know. Me too.', { expr: 'calm' });
    bg(cs.move('crown_halcyon', [[rim.x + 0.45, rim.z + 0.2]], { speed: 0.8 }));

    // (5) Orion
    bg(cs.move('orion', [[party.x + 1.6, party.z - 0.6]], { speed: 1.4, face: 'up' }));
    await cs.say('ORION', 'I built you to hold grief and hope at once. You don\'t have to choose. Hold both.', { expr: 'sad' });

    // (6) the merge
    bg(cs.move('crown_figure', [[rim.x + 0.35, rim.z + 0.2]], { speed: 0.8 }));
    cs.flash('#ffffff', 1.4, 0.7);
    cs.sfx('awaken');
    cs.particles('mote', [rim.x + 0.4, 1.4, rim.z + 0.2], { count: 80 });
    bg(cs.despawn('crown_figure', { fade: 1.0 }));
    wholeHologram(cs.actor('crown_halcyon'));
    await cs.narrate('Two lights become one.');

    // (7) the Choir's gold turns to the white of morning
    cs.flag('story:warden_merged');
    cs.fx({ bloom: { strength: 1.3, radius: 0.8 }, grade: { exposure: 1.14, saturation: 0.95, highlightTint: [1.02, 1.04, 1.08], shadowTint: [0.98, 1.0, 1.06] } });
    cs.particles('light_stream', [core.x, 6.0, core.z], { count: 60 });
    bg(cs.camera.view({ pitch: 36, dist: 18, ms: 2400 }));
    await cs.narrate('Across the Heart, the Choir\'s gold turns to the white of morning.');

    // (8) the lullaby, and the first thing she does whole
    cs.music('lullaby', { fade: 2.5 });
    bg(cs.camera.focus([rim.x + 0.4, rim.z + 1.4], { zoom: 0.9, ms: 1200 }));
    bg(cs.camera.view({ pitch: 26, dist: 14, ms: 1200 }));
    await cs.say('HALCYON', 'I will ask them. Every one. Whether they want to wake.', { expr: 'calm' });
    bg(cs.move('sera', [[party.x - 1.6, party.z - 0.6]], { speed: 1.4, face: 'up' }));
    await cs.say('SERA', 'And Theo?', { expr: 'surprised' });
    await cs.say('HALCYON', 'He\'s already asking for you.', { expr: 'calm' });
    await cs.say('KADE', 'Then let\'s go wake them.', { expr: 'smile' });
    cs.flag('story:finale_done');
    await cs.ungather();
    await cs.card('epilogue');
    cs.fx(FIELD_FX);
    await cs.goto('halcyon', 'cryo');
    cs.objective('epi.wake');
    bg(cs.letterbox(false));
  },
};

/** WARDEN's figure: HALCYON's shape in the gold of its sigil (the hologram's tint, and a gold aura). */
function goldHologram(handle) {
  const sprite = handle?.actor;
  sprite?._holoMaterial?.uniforms?.uColor?.value?.set?.('#ffcf6a');
  sprite?.setGlow?.('#ffc45a', 1.6);
}

/** HALCYON whole: her own cyan, with a white-gold aura that was not there before. */
function wholeHologram(handle) {
  handle?.actor?.setGlow?.('#fff2cc', 1.4);
}

export default {
  scripts,
  // play order inside the finale (C7's ascent sits between: heart.arrival 20, the tiers 32-54, the lift 70)
  scenes: [
    { id: 'dreams.night_before', chapter: 'finale', order: 5, budget: { boxes: 19, sec: 150 }, jump: 'finale', at: 'halcyon:cryo' },
    { id: 'dreams.kade', chapter: 'finale', order: 30, key: true, budget: { boxes: 15, sec: 90 }, jump: 'finale', at: 'dreams:kade' },
    { id: 'dreams.nyx', chapter: 'finale', order: 40, key: true, budget: { boxes: 15, sec: 90 }, jump: 'finale', at: 'dreams:nyx' },
    { id: 'dreams.orion', chapter: 'finale', order: 50, key: true, budget: { boxes: 15, sec: 90 }, jump: 'finale', at: 'dreams:orion' },
    { id: 'dreams.sera', chapter: 'finale', order: 60, key: true, budget: { boxes: 15, sec: 90 }, jump: 'finale', at: 'dreams:sera' },
    { id: 'dreams.crown', chapter: 'finale', order: 80, key: true, budget: { boxes: 18, sec: 240 }, jump: 'finale', at: 'heart:crown' },
  ],
  doneFlags: {
    finale: ['dream:night_before'],
  },
  // the finale's story beats on their own (tests/routes/dreams.mjs): the bridge before the Heart
  jumps: {
    'dream.night': { chapter: 'finale', map: 'halcyon', spawn: 'bridge_starchart', level: 31, objective: 'fin.go_heart' },
  },
  // what the crown's scripts show on the Heart, which no MapDef names (prewarm, 11.5)
  preload: { heart: ['npc:holo', 'enemy:warden_lock'] },
};

