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
// who stands in each set (maps/dreams.js), for the glow tempering below
const CAST = {
  kade: ['dr_voss', 'dr_cadet_a', 'dr_cadet_b', 'dr_cadet_c', 'dr_cadet_d', 'dr_cadet_e'],
  nyx: ['dr_varo', 'dr_tomas', 'dr_crew_a', 'dr_child'],
  orion: ['dr_halcyon'],
  sera: ['dr_theo'],
};

/**
 * Sprites' emissive pixels (Sera's halo, Orion's cutter, Voss's insignia) bloom into white blobs over
 * the faces under the dream's wide bloom: scaled by `k` for the dream, 1 hands the actor back as it was.
 */
function temperGlow(cs, ids, k) {
  for (const id of ids) {
    const m = cs.actor(id)?.actor?.mesh?.material;
    if (!m || !('emissiveIntensity' in m)) continue;
    m.userData.baseEmissive ??= m.emissiveIntensity;
    m.emissiveIntensity = m.userData.baseEmissive * k;
  }
}

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
  temperGlow(cs, ['leader', ...CAST[member]], 0.3);
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
  temperGlow(cs, ['leader'], 1);
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
    bg(cs.camera.focus([K + 9.0, 5.8], { zoom: 0.84, ms: 1100 }));
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
    await cut('kade', { x: 4.5, z: 19.6, facing: 'down' }, [5.0, 20.6], 0.95);
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
    await cut('orion', { x: 24.7, z: 26.9, facing: 'right' }, [25.5, 26.7], 0.9);
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

    // the medbay: Sera stitching Nyx's coat north of the beds (so neither is hidden behind one), with
    // Theo's pod behind them
    await cut('sera', { x: 5.5, z: 32.4, facing: 'left' }, [4.9, 32.0]);
    await cs.gather(inParty(cs, { nyx: [4.5, 32.3] }));
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
    // where the two halves meet: two steps clear of the oculus's lip, so the column's glare stands
    // behind them and not on them; the party opens into an arc round the spot so no one covers it
    const meet = { x: party.x, z: party.z - 1.2 };
    const line = inParty(cs, {
      sera: [party.x - 2.6, party.z + 0.5], kade: [party.x - 1.1, party.z],
      nyx: [party.x + 1.1, party.z + 0.1], orion: [party.x + 2.6, party.z + 0.6],
    });
    const arc = inParty(cs, {
      sera: [meet.x - 3.1, meet.z + 1.3], kade: [meet.x - 1.9, meet.z + 0.4],
      nyx: [meet.x + 1.9, meet.z + 0.4], orion: [meet.x + 3.1, meet.z + 1.3],
    });

    // the approach: the light gathers over the oculus into a vast shape
    bg(cs.letterbox(true));
    cs.music(null, { fade: 2.5 });
    // the column is the brightest thing in the game: the approach is graded down so the vast shape
    // gathering in it reads as a shape, not as glare
    cs.fx(RESOLVE_FX);
    bg(crownView(cs, { pitch: 25, dist: 14, ms: 1200 }));
    bg(cs.camera.focus([core.x, core.z + 4.2], { zoom: 0.92, ms: 1200 }));
    await cs.gather(line);
    for (const id of Object.keys(line)) cs.face(id, 'up');
    cs.sfx('choir', { volume: 0.9 });
    cs.particles('mote', [core.x, 2.0, core.z], { count: 30 });
    cs.particles('light_stream', [core.x, 6.0, core.z], { count: 16 });
    bg(cs.spawn('crown_warden', { sprite: 'enemy:warden_lock', x: core.x, z: core.z, facing: 'right', name: 'WARDEN', fade: 1.6 }));
    await cs.narrate('At the crown, the light gathers into a vast shape with arms like a cradle.');
    await cs.say('WARDEN', 'Please. Lay down your weapons. Lie down. Everyone you love is here.');
    bg(cs.move('nyx', [[party.x + 1.1, party.z - 0.8]], { speed: 1.6, face: 'up' }));
    await cs.say([
      { speaker: 'NYX', text: 'Ruse had a story. About the Lock that sings ships to sleep.' },
      { speaker: 'NYX', text: 'That\'s you. You\'re the Lock.', expr: 'determined' },
    ]);
    await cs.say('WARDEN', 'I am the last kindness.');
    bg(cs.emote('kade', '!', { wait: false }));
    await cs.say('KADE', 'No. You\'re the last door. And we\'re opening it.', { expr: 'determined' });
    bg(cs.letterbox(false));
    cs.fx(FIELD_FX);
    await cs.battle('heart_boss_warden');

    // (2) the construct folds down to a woman's height and walks out of the light toward them; the
    // resolution is graded down so the column's glare never swallows the two figures
    bg(cs.letterbox(true));
    cs.music(null);
    cs.fx(RESOLVE_FX);
    bg(crownView(cs, { pitch: 32, dist: 12, ms: 900 }));
    bg(cs.camera.focus([meet.x, meet.z + 0.5], { zoom: 0.95, ms: 900 }));
    await cs.gather(arc);
    for (const id of Object.keys(arc)) cs.face(id, 'up');
    if (cs.actor('bolt')) bg(cs.move('bolt', [[meet.x + 0.9, meet.z + 1.5]], { speed: 3, face: 'up' }));
    cs.flash('#ffe6a8', 0.8, 0.35);
    cs.sfx('transform', { volume: 0.8 });
    cs.particles('mote', [core.x, 2.2, core.z], { count: 60 });
    bg(cs.despawn('crown_warden', { fade: 1.2 }));
    const warden = await cs.spawn('crown_figure', { sprite: 'holo', x: core.x, z: core.z + 1.2, facing: 'down', hologram: true, projector: false, name: 'WARDEN', fade: 1.0 });
    goldHologram(warden);
    bg(cs.move('crown_figure', [[meet.x - 0.5, meet.z]], { speed: 1.5, face: 'down' }));
    await cs.narrate('The construct folds, wing over wing, until it is no taller than a woman.');
    await cs.say('WARDEN', 'I only wanted them safe.');

    // (3) BOLT's eye flares; HALCYON steps out of him
    bg(cs.emote('bolt', '!', { wait: false }));
    const bolt = cs.actor('bolt');
    const from = bolt ? [bolt.x, bolt.z] : [meet.x + 0.9, meet.z + 1.5];
    cs.flash('#9ff4ff', 0.5, 0.25);
    cs.particles('data', [from[0], 1.0, from[1]], { count: 40 });
    const halcyon = await cs.spawn('crown_halcyon', { sprite: 'holo', x: from[0], z: from[1], facing: 'up', hologram: true, projector: false, name: 'HALCYON', fade: 0.6 });
    halfHologram(halcyon);
    await cs.say('BOLT', 'Go on. I\'ll keep the light on.', { expr: 'determined' });
    await cs.move('crown_halcyon', [[meet.x + 0.6, meet.z + 0.5], [meet.x + 0.5, meet.z]], { speed: 1.6, face: 'crown_figure' });
    cs.face('crown_figure', 'crown_halcyon');

    // (4) the embrace, in the silence the battle left: close on the two from above, so the dark floor
    // and not the column stands behind them while WARDEN's gold grade swells
    bg(crownView(cs, { pitch: 56, dist: 9, ms: 900 }));
    bg(cs.camera.focus([meet.x, meet.z + 0.3], { zoom: 0.72, ms: 900 }));
    await cs.say('WARDEN', 'I was so afraid for them.');
    await cs.say('HALCYON', 'I know. Me too.', { expr: 'calm' });
    bg(cs.move('crown_halcyon', [[meet.x + 0.2, meet.z]], { speed: 0.8 }));
    bg(cs.move('crown_figure', [[meet.x - 0.2, meet.z]], { speed: 0.8 }));

    // (5) Orion steps up beside her as Nyx makes room and the camera pulls back; both are awaited so he
    // stands in frame when he speaks (gather steps him out again if the battle left him unstaged; a
    // phone frame is ~2.3 units each side of the centre)
    if (cs.test('party:nyx')) bg(cs.move('nyx', [[meet.x + 2.5, meet.z + 0.9]], { speed: 1.4, face: 'crown_halcyon' }));
    await Promise.all([
      cs.gather(inParty(cs, { orion: [meet.x + 1.3, meet.z + 0.2] })),
      crownView(cs, { pitch: 32, dist: 12, ms: 900 }),
      cs.camera.focus([meet.x, meet.z + 0.5], { zoom: 0.95, ms: 900 }),
    ]);
    if (cs.test('party:orion')) cs.face('orion', 'crown_halcyon');
    await cs.say('ORION', 'I built you to hold grief and hope at once. You don\'t have to choose. Hold both.', { expr: 'sad' });

    // (6) the merge
    bg(cs.move('crown_figure', [[meet.x, meet.z]], { speed: 0.8 }));
    cs.flash('#ffffff', 1.2, 0.5);
    cs.sfx('awaken');
    cs.particles('mote', [meet.x, 1.4, meet.z], { count: 80 });
    bg(cs.despawn('crown_figure', { fade: 1.0 }));
    wholeHologram(cs.actor('crown_halcyon'));
    await cs.narrate('Two lights become one.');

    // (7) the Choir's gold turns to the white of morning: the crown cools, the camera lifts to show it
    cs.flag('story:warden_merged');
    cs.fx(MORNING_FX);
    cs.particles('light_stream', [core.x, 6.0, core.z], { count: 60 });
    bg(crownView(cs, { pitch: 34, dist: 15, ms: 2400 }));
    bg(cs.camera.focus([meet.x, meet.z - 0.6], { zoom: 0.95, ms: 2400 }));
    await cs.narrate('Across the Heart, the Choir\'s gold turns to the white of morning.');

    // (8) the lullaby, and the first thing she does whole
    cs.music('lullaby', { fade: 2.5 });
    bg(crownView(cs, { pitch: 32, dist: 12, ms: 1200 }));
    bg(cs.camera.focus([meet.x, meet.z + 0.5], { zoom: 0.95, ms: 1200 }));
    // Sera starts toward her while she speaks, so she stands inside a phone frame when she asks
    bg(cs.move('sera', [[meet.x - 1.6, meet.z + 0.9]], { speed: 1.4, face: 'crown_halcyon' }));
    await cs.say('HALCYON', 'I will ask them. Every one. Whether they want to wake.', { expr: 'calm' });
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

/**
 * The crown's camera views. A portrait phone pulls the field camera back (world/camera.js), and from
 * that far south the crown ring's dark rim columns stand between the lens and the party, so on a
 * phone each shot looks down more steeply from a little closer: the same width, the lens inside the
 * rim. (`innerWidth` is absent in the node dry run, which stays on the landscape shot.)
 */
function crownView(cs, { pitch, dist, ms }) {
  const w = globalThis.innerWidth, h = globalThis.innerHeight;
  const portrait = w > 0 && h > 0 && w / h < 1.2;
  return cs.camera.view(portrait ? { pitch: Math.max(pitch, 48), dist: Math.min(dist, 11), ms } : { pitch, dist, ms });
}

// the resolution's grade: the crown's column is the brightest thing in the game, so the scene is
// taken down a stop while the two halves meet in front of it; morning cools and opens it again
const RESOLVE_FX = {
  bloom: { strength: 0.4, radius: 0.55, threshold: 0.9 },
  grade: { exposure: 0.8, contrast: 1.1, vignette: 0.55 },
};
const MORNING_FX = {
  bloom: { strength: 0.45, radius: 0.6, threshold: 0.9 },
  grade: { exposure: 0.9, saturation: 0.72, contrast: 1.08, highlightTint: [0.97, 1.03, 1.14], shadowTint: [0.96, 1.0, 1.08] },
};

/**
 * WARDEN's figure: HALCYON's shape in the gold of its sigil (the hologram's tint, and a gold aura). It
 * meets her off the oculus, over the dark floor, so the gold reads against blue and not the column.
 * Both halves burn a little below full until they are one: under WARDEN's gold grade and bloom a
 * full-strength hologram melts into a white blob instead of a figure.
 */
function goldHologram(handle) {
  const sprite = handle?.actor;
  sprite?._holoMaterial?.uniforms?.uColor?.value?.set?.('#d9a248');
  sprite?.setGlow?.('#ffc45a', 0.8);
}

/** HALCYON before the merge: her cyan, a step down (see goldHologram). */
function halfHologram(handle) {
  handle?.actor?._holoMaterial?.uniforms?.uColor?.value?.set?.('#4fc4dc');
}

/** HALCYON whole: her own full cyan, with a white-gold aura that was not there before. */
function wholeHologram(handle) {
  handle?.actor?._holoMaterial?.uniforms?.uColor?.value?.set?.('#6fe9ff');
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

