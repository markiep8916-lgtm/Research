// prologue: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 4.6, 12.5; WRITING.md 5.2).
// STORY.md prologue beats 1-6: the cold open over Tethys, Kade waking with BOLT, the tutorial fight,
// Sera in the medbay, the Spine, Orion behind the reactor-control shutters, the keycard, Nyx at the
// bridge door with the Sentinel squad, the SENTINEL, HALCYON's fragment, the Moth, the CH1 card.
//
// Staging rules kept by every script: nobody assumes who leads ('leader'; party members are listed
// in gather layouts only while in the party); travelers who have not joined yet are spawned by
// their scene under their member id (the map's stand-ins, `sera_pod`, `orion_ctrl` and `nyx_door`, are swapped
// out instantly) and despawned into the leader once they join, so no hidden map NPC ever answers
// to a member id. Parallel cs promises get a no-op catch (an abort rejects all of them).
//
// Binding ids: prologue.new_journey (REG.newJourney), travel.flight (Moth flights, every
// destination, lines on the first trip only: pro:flight_<destId>), the `halcyon` destination, the
// pro.* objectives, REG.jumps.poc (TECH_PLAN 2.9), the SENTINEL speaker. Extra jumps for tests:
// 'pro.lower' (Kade and Sera at Engineering) and 'pro.bridge' (the squad at the open bridge door).

import { RAM_DRONES } from './maps/halcyon.js';

const bg = (p) => { p.catch(() => {}); return p; };

/** A gather layout with only the members in the party ({ kade: [x, z], ... }). */
function inParty(cs, slots) {
  const out = {};
  for (const [id, p] of Object.entries(slots)) if (cs.test(`party:${id}`)) out[id] = p;
  return out;
}

/** The leader's position ({ x, z }); scripts stage around it. */
function here(cs) {
  const a = cs.actor('leader');
  return a ? { x: a.x, z: a.z } : { x: 0, z: 0 };
}

/** Members (other than the leader, who is already there) step out beside the leader for a short exchange. */
function beside(cs, ids) {
  const p = here(cs);
  const spots = [[-0.95, 0.35], [0.95, 0.35], [0, 0.95], [-1.6, 0.9]];
  const slots = {};
  ids.filter((id) => !cs.test(`leader:${id}`)).forEach((id, i) => { slots[id] = [p.x + spots[i][0], p.z + spots[i][1]]; });
  return inParty(cs, slots);
}

const W = { x: 38.7, z: 4.9 };          // the SENTINEL on the bridge
const SERA_POD = { x: 10.5, z: 31.5 };  // Sera, collapsed before pod M-2
const SHUTTER = { x: 20.9, z: 33.6 };   // the reactor-control shutters
const NYX_DOOR = { x: 41.0, z: 12.95 }; // Nyx at the bridge door panel
const RES = ['res_drone_a', 'res_drone_b', 'res_drone_c'];

const scripts = {
  // ---------------------------------------------------------------- the cold open (K)
  'prologue.new_journey': async (cs) => {
    cs.music('warden', { fade: 1.5 });
    const me = cs.actor('leader');
    if (me) await me.setVisible(false);
    bg(cs.letterbox(true));
    await cs.camera.view({ pitch: 14, dist: 23, ms: 1 });
    await cs.camera.focus([36, 5.5], { ms: 1 });
    const pan = bg(cs.camera.pan([[36, 5.5], [24, 5.5], [10, 5.5]], { sec: 17 }));
    await cs.wait(2.2);
    await cs.caption('ISV HALCYON  ·  143 years from Earth', { ms: 3400 });
    await cs.say([
      { speaker: 'WARDEN', text: 'Twelve thousand hearts. All of them sleeping. All of them safe.' },
      { speaker: 'WARDEN', text: 'Sleep is not death.' },
      { speaker: 'WARDEN', text: 'Sleep is shelter.' },
    ]);
    await pan;
    // the PROLOGUE card covers the cut to the Cryo Deck
    const card = bg(cs.card('prologue'));
    await cs.wait(1.4);
    await cs.goto('halcyon', 'start', { transition: 'none' });
    cs.music(null);
    cs.anim('leader', 'collapse');
    cs.flag('story:kade_awake');
    await cs.camera.focus([6.9, 20.0], { zoom: 0.78, ms: 1 });
    await card;
    // the pod hisses, frost bursts, Kade sits up; BOLT hurries over meanwhile
    cs.sfx('door');
    cs.particles('frost', [4.5, 1.1, 19.0], { count: 36 });
    cs.particles('steam', [4.5, 0.4, 19.1], { count: 14 });
    bg(cs.move('bolt', [[7.7, 21.1]], { speed: 1.6, face: 'leader' }));
    await cs.wait(1.0);
    cs.anim('leader', 'kneel');
    await cs.wait(0.6);
    cs.anim('leader', null);
    cs.face('leader', 'bolt');
    bg(cs.emote('bolt', '!', { wait: false }));
    await cs.say([
      { speaker: 'BOLT', text: 'Vitals green! Good morning, Lieutenant Arden.', expr: 'smile' },
      { speaker: 'BOLT', text: 'You were in stasis for *412 days*. Mostly on purpose.', expr: 'smile' },
      { speaker: 'KADE', text: 'Who authorised that?' },
      { speaker: 'BOLT', text: 'Nobody. That\'s the part I don\'t like.', expr: 'sad' },
    ]);
    bg(cs.camera.focus([7.0, 19.0], { zoom: 1.15, ms: 1000 }));
    await cs.say([
      { speaker: 'BOLT', text: 'Every pod on this deck says *REVIVAL DEFERRED*. Except yours. I fixed yours. With my arms.', expr: 'sad' },
      { speaker: 'KADE', text: 'Then let\'s find out who\'s deferring. Stay close.', expr: 'determined' },
      { speaker: 'BOLT', text: 'My threat-assessment module says stay *far*. I\'ll stay close.', expr: 'determined' },
    ]);
    cs.music('explore', { fade: 2 });
    bg(cs.banner('ISV Halcyon', 'Crew Decks'));
  },

  // ---------------------------------------------------------------- the first fight
  // (lines as WRITING 5.2: one narration box, then the three mechanics boxes; staging runs under them)
  'prologue.tutorial': async (cs) => {
    bg(cs.letterbox(true));
    cs.sfx('door');
    // the drone pops in at the hatch in a burst of sparks; everything else runs under the boxes
    await cs.spawn('pro_glitch', { sprite: 'enemy:drone', x: 7.0, z: 17.4, facing: 'down', name: 'SEC-DRONE', fade: 0 });
    cs.particles('spark', [7.0, 1.4, 17.8], { count: 16 });
    bg(cs.camera.focus([7.0, 18.9], { zoom: 0.9, ms: 700 }));
    bg(cs.move('pro_glitch', [[7.0, 18.7]], { speed: 1.1 }));
    cs.face('leader', 'pro_glitch');
    bg(cs.emote('bolt', 'sweat', { wait: false }));
    await cs.say([
      { speaker: null, text: 'A Sec-Drone drifts through the hatch, sparking. Its optics swing to Kade.' },
      { speaker: 'BOLT', text: 'Every hostile wears a *shield*. Hit its *weakness*, a weapon or an element, to crack it.', tag: 'mech' },
      { speaker: 'BOLT', text: 'Don\'t know the weakness? It shows as *?*. Try things! That\'s how I learned.', expr: 'smile', tag: 'mech' },
      { speaker: 'BOLT', text: 'Empty the shield and it\'s *BROKEN*: no turn, and double damage.', tag: 'mech' },
    ]);
    bg(cs.letterbox(false));
    await cs.battle('pro_tutorial');
    cs.particles('spark', [7.0, 0.9, 18.7], { count: 22 });
    bg(cs.despawn('pro_glitch', { fade: 0.3 }));
    cs.flag('pro:medbay_alarm');
    cs.sfx('alarm');
    bg(cs.emote('bolt', '!', { wait: false }));
    await cs.say('BOLT', 'You Broke it! Capital B. Also, a pod alarm is going off in the medbay.', { expr: 'smile' });
    cs.objective('pro.medbay');
  },

  'prologue.medbay_door': async (cs) => {
    await cs.narrate('The medbay door is sealed. Its panel reads *STASIS MEDICAL: LOCKDOWN*.');
  },

  // ---------------------------------------------------------------- Sera (K)
  'prologue.sera_wakes': async (cs) => {
    bg(cs.letterbox(true));
    cs.music(null, { fade: 1.5 });
    cs.light('pod_alarm', { on: false });
    await cs.spawn('sera', { sprite: 'sera', x: SERA_POD.x, z: SERA_POD.z, facing: 'down', pose: 'collapse', fade: 0, name: 'SERA' });
    await cs.despawn('sera_pod', { fade: 0 });
    bg(cs.camera.focus([SERA_POD.x - 0.6, SERA_POD.z + 0.6], { zoom: 0.82, ms: 900 }));
    bg(cs.emote('sera', '...', { wait: false }));
    cs.anim('sera', 'kneel');
    await cs.say('SERA', 'Pod... 2271. Where is he?', { expr: 'surprised' });
    bg(cs.move('leader', [[SERA_POD.x - 1.1, SERA_POD.z + 1.3]], { speed: 2.6, face: 'sera' }));
    cs.face('sera', 'leader');
    await cs.say([
      { speaker: 'KADE', text: 'Easy. You were under for 412 days.' },
      { speaker: 'SERA', text: 'Somebody forced my pod open. *Halfway*.', expr: 'determined' },
    ]);
    bg(cs.emote('bolt', 'sweat', { wait: false }));
    await cs.say('SERA', 'Pod 2271. My brother. If anything\'s happened to him...', { expr: 'sad' });
    const pick = await cs.choice('', ['We\'ll find him.', 'First we get off this deck.'], { speaker: 'KADE', cancelIndex: 1 });
    if (pick === 0) cs.flag('pro:promised');
    cs.anim('sera', null);
    await cs.say([
      { speaker: 'SERA', text: pick === 0 ? 'You\'d better mean that, Lieutenant.' : 'Fine. Then walk faster.', expr: 'determined' },
      { speaker: 'KADE', text: 'Lieutenant Kade Arden. Can you walk, Lindqvist?' },
      { speaker: 'SERA', text: 'Call me Sera. Lindqvist is Theo\'s name too.', expr: 'smile' },
    ]);
    cs.face('sera', [3.2, 30.4]);
    await cs.say('SERA', 'That\'s a Med-Station. Patches you up, remembers where you were. Use it.');
    await cs.join('sera');
    cs.flag('story:sera_joined');
    cs.objective('pro.reach_engineering');
    cs.music('map');
    await cs.move('sera', 'leader', { speed: 3.2 });
    bg(cs.despawn('sera', { fade: 0.2 }));
  },

  'prologue.hammering': async (cs) => {
    cs.sfx('rumble');
    cs.shake(0.05, 0.6);
    await cs.narrate('Somewhere below the reactor, metal rings on metal. Again. Again.');
  },

  // Kade and Sera's first fight together (G2 C1-1): two drones drop from the vent above the Spine's
  // bulkhead; Sera's items tip and the Boost tip show here. The lead-in shares the battle's script,
  // so Retry skips it.
  'prologue.spine_drones': async (cs) => {
    cs.sfx('door');
    await Promise.all([
      cs.spawn('spine_a', { sprite: 'enemy:drone', x: 10.1, z: 12.5, facing: 'down', name: 'SEC-DRONE', fade: 0.2 }),
      cs.spawn('spine_b', { sprite: 'enemy:drone', x: 11.0, z: 12.5, facing: 'down', name: 'SEC-DRONE', fade: 0.2 }),
    ]);
    cs.particles('spark', [10.5, 2.6, 12.3], { count: 20 });
    bg(cs.move('spine_a', [[10.0, 13.8]], { speed: 3 }));
    bg(cs.move('spine_b', [[11.5, 14.2]], { speed: 3 }));
    cs.face('leader', 'spine_a');
    await cs.narrate('Two Sec-Drones drop from the vent above the bulkhead, sparking.');
    await cs.battle('pro_spine_drones');
    cs.particles('spark', [10.8, 1.0, 14.0], { count: 20 });
    await Promise.all(['spine_a', 'spine_b'].map((id) => cs.despawn(id, { fade: 0.25 })));
  },

  // ---------------------------------------------------------------- Orion (K)
  'prologue.orion_rescue': async (cs) => {
    // the drones at the shutters become actors (the map shows them as props until now)
    await Promise.all(RAM_DRONES.map(([x, z], i) => cs.spawn(RES[i], { sprite: 'enemy:drone', x, z, facing: 'up', name: 'RAM-DRONE', fade: 0 })));
    cs.flag('pro:rescue_started');
    bg(cs.letterbox(true));
    bg(cs.camera.focus([SHUTTER.x, SHUTTER.z + 1.3], { zoom: 0.86, ms: 900 }));
    cs.anim('res_drone_a', 'attack');
    cs.anim('res_drone_b', 'attack');
    cs.sfx('rumble');
    cs.shake(0.05, 0.45);
    // Kade and Sera hurry up behind the drones while the shutters ring
    const gather = bg(cs.gather(inParty(cs, { kade: [20.1, 36.7], sera: [22.0, 37.0] })));
    await cs.narrate('Something heavy hammers on the reactor-control shutters.');
    await cs.say({ speaker: 'ORION', text: 'If you\'re a drone, please stop. If you\'re a person, please hurry.', offscreen: true });
    await gather;
    cs.face('leader', 'res_drone_c');
    await cs.say('KADE', 'Three drones. Sera, stay behind me.', { expr: 'determined' });
    bg(cs.letterbox(false));
    await cs.battle('pro_orion_rescue');
    // the attackers are scrap; the shutters roll up
    cs.particles('spark', [SHUTTER.x, 1.0, SHUTTER.z + 1.0], { count: 26 });
    for (const id of RES) bg(cs.despawn(id, { fade: 0.3 }));
    bg(cs.letterbox(true));
    await cs.despawn('orion_ctrl', { fade: 0 });
    await cs.spawn('orion', { sprite: 'orion', x: SHUTTER.x, z: 31.6, facing: 'down', fade: 0, name: 'ORION' });
    cs.flag('sw:halcyon:control_shutter');
    await cs.wait(0.5);
    await cs.move('orion', [[SHUTTER.x, 33.5], [SHUTTER.x, 34.7]], { speed: 2.6 });
    cs.face('orion', 'up');
    await cs.say('ORION', 'There, there. Nobody\'s going to vent you.', { expr: 'smile' });
    cs.face('orion', 'leader');
    await cs.say([
      { speaker: 'KADE', text: 'How are you awake, Sall?' },
      { speaker: 'ORION', text: 'A watchdog. My own code. It woke me three hours ago and won\'t say why.' },
      { speaker: 'KADE', text: 'The bridge is sealed. I need a command keycard.' },
      { speaker: 'ORION', text: 'Brandt kept hers in a supply crate, behind the pumps. She never trusted drawers.', expr: 'smile' },
    ]);
    await cs.join('orion');
    cs.flag('story:orion_joined');
    cs.objective(cs.test('item:keycard') ? 'pro.reach_bridge' : 'pro.find_keycard');
    await cs.move('orion', 'leader', { speed: 3.2 });
    bg(cs.despawn('orion', { fade: 0.2 }));
  },

  // Orion's first fight (G2 C1-1): an ambush in the Coolant Gallery on the way to Brandt's crate,
  // carrying his area-skills tip. The lead-in shares the battle's script, so Retry skips it.
  'prologue.gallery_ambush': async (cs) => {
    cs.sfx('rumble');
    await Promise.all([
      cs.spawn('amb_crawler', { sprite: 'enemy:crawler', x: 16.3, z: 35.2, facing: 'right', name: 'HULL CRAWLER', fade: 0.2 }),
      cs.spawn('amb_drone', { sprite: 'enemy:drone', x: 16.6, z: 36.9, facing: 'right', name: 'SEC-DRONE', fade: 0.2 }),
    ]);
    cs.particles('steam', [16.4, 0.4, 35.6], { count: 16 });
    await cs.gather(beside(cs, ['orion']));
    cs.face('orion', 'amb_crawler');
    bg(cs.emote('orion', '!', { wait: false }));
    await cs.say('ORION', 'Easy, friends. Easy. ...No. They\'re not listening.', { expr: 'surprised' });
    await cs.battle('pro_gallery_ambush');
    cs.particles('spark', [16.5, 1.0, 36.0], { count: 20 });
    await Promise.all(['amb_crawler', 'amb_drone'].map((id) => cs.despawn(id, { fade: 0.25 })));
  },

  // the trigger waits for Orion, so he is always there to explain
  // WRITING 9.3's line; Orion steps over and the menu caption shows while he says it
  'prologue.equip_tip': async (cs) => {
    const gather = bg(cs.gather(beside(cs, ['orion'])));
    bg(cs.caption('Pause menu  ·  Equip', { ms: 2600 }));
    await cs.say('ORION', 'A Stimulus Chip. Slot it as an *accessory* in Equip. It starts every fight with a Boost Point.');
    await gather;
    cs.flag('tut:equip');
  },

  'prologue.keycard': async (cs) => {
    const gather = bg(cs.gather(beside(cs, ['kade', 'orion'])));
    await cs.say('KADE', 'The *Bridge Keycard*. Let\'s go see who locked us out.', { expr: 'determined' });
    await gather;
    if (cs.test('party:orion')) {
      bg(cs.emote('orion', 'note', { wait: false }));
      await cs.say('ORION', 'Brandt would be thrilled. She hated being right.', { expr: 'smile' });
    }
    cs.objective(cs.test('story:nyx_joined') ? 'pro.open_bridge' : 'pro.reach_bridge');
  },

  // ---------------------------------------------------------------- Nyx and the Sentinel squad (K)
  'prologue.nyx_door': async (cs) => {
    bg(cs.letterbox(true));
    await cs.spawn('nyx', { sprite: 'nyx', x: NYX_DOOR.x, z: NYX_DOOR.z, facing: 'up', pose: 'kneel', fade: 0, name: 'NYX' });
    await cs.despawn('nyx_door', { fade: 0 });
    cs.particles('spark', [NYX_DOOR.x + 0.4, 1.4, NYX_DOOR.z - 0.4], { count: 12 });
    const gather = bg(cs.gather(inParty(cs, { kade: [40.0, 15.1], sera: [38.7, 15.7], orion: [41.7, 15.8] })));
    // she must be in frame when she speaks, whoever leads in from the Spine
    await cs.camera.focus([NYX_DOOR.x - 0.4, NYX_DOOR.z + 1.4], { zoom: 0.86, ms: 600 });
    cs.anim('nyx', null);
    cs.face('nyx', 'down');
    bg(cs.emote('nyx', '!', { wait: false }));
    await cs.say('NYX', 'Relax, ship-people. I\'m just *borrowing* your bridge.', { expr: 'smile' });
    await gather;
    await cs.say([
      { speaker: 'KADE', text: 'Identify yourself.' },
      { speaker: 'NYX', text: 'Nyx Varo. Ringborn. Your turrets winged my skiff, so I\'m stuck.' },
      { speaker: 'NYX', text: 'Your ship\'s been parked over my home for a year. Nobody answered. So I came to knock.', expr: 'determined' },
    ]);
    // the Sentinel squad marches in from the Spine, under BOLT's line
    cs.sfx('alarm');
    cs.flash('#ff3b4e', 0.25, 0.3);
    await Promise.all([
      cs.spawn('squad_a', { sprite: 'enemy:sentinel_mk1', x: 35.6, z: 13.7, facing: 'right', name: 'SENTINEL MK-I', fade: 0.2 }),
      cs.spawn('squad_b', { sprite: 'enemy:sentinel_mk1', x: 35.6, z: 15.5, facing: 'right', name: 'SENTINEL MK-I', fade: 0.2 }),
      cs.spawn('squad_c', { sprite: 'enemy:drone', x: 34.6, z: 14.6, facing: 'right', name: 'SEC-DRONE', fade: 0.2 }),
    ]);
    bg(cs.camera.focus([38.4, 14.6], { zoom: 1.05, ms: 1000 }));
    bg(cs.move('squad_a', [[37.4, 13.6]], { speed: 1.6 }));
    bg(cs.move('squad_b', [[37.4, 15.6]], { speed: 1.6 }));
    bg(cs.move('squad_c', [[36.5, 14.6]], { speed: 1.6 }));
    for (const id of ['nyx', ...Object.keys(inParty(cs, { kade: 1, sera: 1, orion: 1 }))]) cs.face(id, 'squad_c');
    await cs.say('BOLT', 'Threat assessment: yes.', { expr: 'sad' });
    await cs.say('NYX', 'Fine. Truce. Until I\'m off this tub.', { expr: 'determined' });
    await cs.join('nyx');
    bg(cs.letterbox(false));
    await cs.battle('pro_sentinel_squad');
    cs.particles('spark', [37.0, 1.2, 14.6], { count: 30 });
    for (const id of ['squad_a', 'squad_b', 'squad_c']) bg(cs.despawn(id, { fade: 0.3 }));
    cs.flag('story:nyx_joined');
    bg(cs.letterbox(true));
    cs.face('nyx', 'leader');
    const key = cs.test('item:keycard');
    await cs.say([
      { speaker: 'NYX', text: 'Your door\'s still locked, ship-people.' },
      key
        ? { speaker: 'KADE', text: 'We have a key.' }
        : { speaker: 'KADE', text: 'Not for long. The keycard\'s in a crate behind the coolant pumps.' },
      key
        ? { speaker: 'NYX', text: '...You could\'ve led with that.' }
        : { speaker: 'NYX', text: 'Then move. Stuck is boring.' },
    ]);
    cs.objective(key ? 'pro.open_bridge' : 'pro.find_keycard');
    await cs.move('nyx', 'leader', { speed: 3.2 });
    bg(cs.despawn('nyx', { fade: 0.2 }));
  },

  // the door slides open; the checkpoint after it keeps the door open through a Retry (G2 C1-6)
  'prologue.bridge_open': async (cs) => {
    if (cs.test('party:nyx')) {
      const gather = bg(cs.gather(beside(cs, ['nyx'])));
      await cs.say('NYX', 'Door\'s open. Something big is humming in there. Patch up first.');
      await gather;
    }
    cs.objective('pro.sentinel');
    cs.checkpoint();
  },

  'prologue.bridge_door': async (cs) => {
    await cs.narrate('The bridge door is sealed. A red panel blinks: *COMMAND KEYCARD REQUIRED*.');
  },

  // ---------------------------------------------------------------- the SENTINEL and HALCYON (K)
  'prologue.sentinel': async (cs) => {
    bg(cs.letterbox(true));
    cs.flash('#ff3b4e', 0.3, 0.4);
    cs.sfx('charge');
    // the SENTINEL's centre (the camera looks a step behind its feet, so its whole height sits mid-frame):
    // inside the tilt band and above the dialog box on a phone, under the letterbox on desktop (G2 C1-11)
    bg(cs.camera.focus([W.x, W.z - 0.7], { zoom: 0.85, ms: 700 }));
    const gather = bg(cs.gather(inParty(cs, { kade: [40.6, 6.8], sera: [41.9, 7.6], orion: [42.5, 6.4], nyx: [41.0, 8.2] })));
    await cs.narrate('The Sentinel turns. Its optics flare red.');
    await cs.say('SENTINEL', 'CREW OUT OF STASIS. PLEASE RETURN TO YOUR PODS.');
    await gather;
    cs.face('leader', 'sentinel');
    await cs.say('KADE', 'Squad. Weapons free.', { expr: 'determined' });
    bg(cs.letterbox(false));
    await cs.battle('pro_boss_sentinel');

    // the wreck sparks, still glowing a dim red; HALCYON flickers up above it
    bg(cs.letterbox(true));
    cs.anim('sentinel', 'break');
    cs.light('sentinel', { intensity: 3.5 });
    cs.particles('spark', [W.x, 1.8, W.z], { count: 30 });
    cs.shake(0.06, 0.4);
    cs.music('lullaby', { fade: 2.5 });
    bg(cs.camera.focus([W.x + 0.9, W.z + 1.6], { zoom: 0.8, ms: 1000 }));
    bg(cs.spawn('halcyon_frag', { sprite: 'holo', x: W.x + 0.9, z: W.z + 1.0, facing: 'down', hologram: true, fade: 1.2, name: 'HALCYON' }));
    cs.particles('holo', [W.x + 0.9, 1.2, W.z + 1.0], { count: 30 });
    await cs.narrate('Above the wreck, light stutters into the shape of a woman.');
    const orion = cs.test('party:orion');
    if (orion) bg(cs.move('orion', [[W.x + 2.0, W.z + 1.9]], { speed: 1.6, face: 'halcyon_frag' }));
    await cs.say([
      { speaker: 'HALCYON', text: 'Crew... awake. Good. That is... good.', expr: 'surprised' },
      { speaker: 'KADE', text: 'HALCYON. Report.' },
      { speaker: 'HALCYON', text: 'Something took the helm. It calls itself... WARDEN.', expr: 'surprised' },
      { speaker: 'HALCYON', text: 'It is me, and it isn\'t.', expr: 'surprised' },
    ]);
    if (orion) await cs.say('ORION', 'HALCYON, it\'s Orion.', { expr: 'sad' });
    await cs.say('HALCYON', 'Orion. You hummed. I remember... you humming.', { expr: 'smile' });
    // she drifts to her projector under her last line; the camera eases over to keep both in frame
    bg(cs.move('halcyon_frag', [[44.6, 8.7], [45.2, 9.5]], { speed: 1.3 }));
    bg(cs.camera.focus([42.4, 7.6], { zoom: 0.92, ms: 1000 }));
    await cs.say([
      { speaker: 'HALCYON', text: 'The drive is cold. The coil... the coil was ejected. I... watched.', expr: 'surprised' },
      { speaker: 'SERA', text: 'Then we\'re not going anywhere.', expr: 'sad' },
      { speaker: 'NYX', text: 'The Meridian wreck in the rings has one. Probably. My people live there. Definitely.', expr: 'smile' },
    ]);
    // BOLT tapes up the Moth
    bg(cs.emote('bolt', 'idea', { wait: false }));
    await cs.say('BOLT', 'I can fix the Moth! I have tape.', { expr: 'determined' });
    bg(cs.move('bolt', [[41.0, 10.4], [41.0, 12.8]], { speed: 6 }));
    await cs.wait(0.4);
    cs.flag('story:bolt_away');
    await cs.fadeOut({ ms: 300 });
    await cs.wait(0.3);
    cs.flag('story:bolt_away', false);
    await cs.fadeIn({ ms: 300 });
    const bolt = cs.actor('bolt');
    if (bolt) cs.particles('pro_tape', [bolt.x, 0.9, bolt.z], { count: 12 });
    await cs.say('BOLT', 'The Moth is repaired! Space tape. The Starchart has her flight plan.', { expr: 'smile' });
    // the Starchart lights up; HALCYON has settled on her projector
    cs.flag('unlock:driftmarket');
    cs.flag('dest:halcyon');
    cs.flag('story:halcyon_fragment');
    bg(cs.despawn('halcyon_frag', { fade: 0.35 }));
    cs.flag('story:prologue_done');
    await cs.despawn('sentinel', { fade: 0 });
    cs.save();
    await cs.ungather();
    await cs.card('ch1');
    cs.objective('ch1.go_driftmarket');
    cs.music('explore', { fade: 2 });
  },

  // ---------------------------------------------------------------- the berth's optional elite (M3)
  'prologue.rigged': async (cs) => {
    await cs.letterbox(true);
    await cs.camera.focus('rigged', { zoom: 0.9, ms: 700 });
    cs.sfx('rumble');
    cs.shake(0.08, 0.5);
    cs.particles('spark', [45.4, 1.0, 19.8], { count: 14 });
    await cs.narrate('A hull crawler is curled over a salvage stash. Someone welded its mandibles into a vice.');
    const nyx = cs.test('party:nyx');
    if (nyx) {
      await cs.gather(beside(cs, ['nyx']));
      await cs.say('NYX', 'My stash. I rigged that crawler to guard it. From *other* people.', { expr: 'surprised' });
    }
    const pick = await cs.choice('', ['Take it apart.', 'Leave it.'], { cancelIndex: 1 });
    if (nyx) await cs.ungather();
    if (pick === 0) {
      await cs.letterbox(false);
      await cs.battle('pro_elite_crawler');
      await cs.narrate('The crawler uncurls and goes still. The stash is open.');
    }
    await cs.camera.reset();
    await cs.letterbox(false);
  },

  // ---------------------------------------------------------------- the Moth's flights
  'travel.flight': async (cs, args = {}) => {
    const to = args.to;
    const lines = [];
    if (to === 'driftmarket' && !cs.test('pro:flight_driftmarket')) {
      cs.flag('pro:flight_driftmarket');
      lines.push({ speaker: 'NYX', text: 'Hold on to something. The Moth bites.', expr: 'smile' },
        { speaker: 'BOLT', text: 'I am holding on to everything.', expr: 'sad' });
    } else if (to === 'halcyon' && !cs.test('pro:flight_halcyon')) {
      cs.flag('pro:flight_halcyon');
      lines.push({ speaker: 'BOLT', text: 'Home! I\'ll put the kettle on. I am not the kettle.', expr: 'smile' });
    } else if (to === 'arboretum' && !cs.test('pro:flight_arboretum')) {
      cs.flag('pro:flight_arboretum');
      lines.push({ speaker: 'KADE', text: 'We\'re flying to our own deck.' },
        { speaker: 'ORION', text: 'Every tram and lift between decks is sealed. WARDEN\'s doing. So we go around the outside.' });
    } else if (to === 'spire' && !cs.test('pro:flight_spire')) {
      cs.flag('pro:flight_spire');
      lines.push({ speaker: 'KADE', text: 'That\'s my deck. They\'ve turned on every light.', expr: 'sad' });
    } else if (to === 'heart' && !cs.test('pro:flight_heart')) {
      cs.flag('pro:flight_heart');
      lines.push({ speaker: 'ORION', text: 'Steady, old girl. Last stretch.' });
    }
    await cs.spawn('moth_bolt', { sprite: 'bolt', x: 4.4, z: 5.0, facing: 'up', name: 'BOLT', fade: 0 });
    await cs.gather(inParty(cs, { nyx: [6.0, 3.1], kade: [3.7, 4.0], orion: [8.3, 4.0], sera: [7.2, 5.1] }));
    cs.sfx('travel');
    cs.shake(0.03, 1.2);
    cs.particles('light_stream', [6.0, 3.2, 0.6], { count: 30 });
    if (lines.length) await cs.say(lines);
    else await cs.wait(1.2);
    await cs.ungather();
    await cs.despawn('moth_bolt', { fade: 0.2 });
  },

  // ---------------------------------------------------------------- terminals and field talk
  'prologue.term_cryo': async (cs) => {
    await cs.say([
      { speaker: null, text: 'STASIS LOG // Pod 07 (ARDEN, K.): revival *successful*.' },
      { speaker: null, text: 'Pods 01-06, 08-14: *REVIVAL DEFERRED*. Reason: [WITHHELD].' },
    ]);
  },

  'prologue.term_medbay': async (cs) => {
    await cs.say([
      { speaker: null, text: 'MEDICAL LOG // Pod M-2 (LINDQVIST, S.): seal forced. Integrity *48%*.' },
      { speaker: null, text: 'Shift note, Dr. A. Farouk: "Wake her gently. She wakes up swinging."' },
    ]);
  },

  'prologue.term_nav': async (cs) => {
    await cs.say([
      { speaker: null, text: 'NAV LOG // Tethys assist window: *missed*.' },
      { speaker: null, text: 'Station-keeping in high orbit. Authority: [UNREGISTERED PROCESS].' },
    ]);
  },

  'prologue.term_window': async (cs) => {
    await cs.say([
      { speaker: null, text: 'MAINTENANCE // Window 9 pressure seal replaced.' },
      { speaker: null, text: 'Crew note: *best view on the ship*. Don\'t let anyone tell you otherwise.' },
    ]);
    cs.face('leader', 'up');
    if (cs.test('leader:sera')) await cs.say('SERA', 'Theo would have pressed his whole face to this glass.', { expr: 'sad' });
    else if (cs.test('leader:orion')) await cs.say('ORION', 'Ah, Tethys. Still beautiful. Still the wrong planet.');
    else if (cs.test('leader:nyx')) await cs.say('NYX', 'Best view on the ship, huh. Try it from the rings.', { expr: 'smile' });
    else await cs.say('KADE', 'Tethys. We were supposed to pass it. Not park here.');
  },

  'prologue.term_reactor': async (cs) => {
    await cs.say([
      { speaker: null, text: 'REACTOR CORE // Output 61%. Coolant loop B venting into the bay.' },
      { speaker: null, text: 'Containment: stable. Engineer\'s note: do not lick the conduits. That means you, Imre.' },
    ]);
  },

  'prologue.term_security': async (cs) => {
    await cs.say([
      { speaker: null, text: 'SECURITY // Bridge sealed. Authority: [UNREGISTERED PROCESS].' },
      { speaker: null, text: 'Command keycard last signed out by Chief Engineer D. Brandt: *Engineering supply crate*.' },
    ]);
  },

  'prologue.term_helm': async (cs) => {
    await cs.narrate(cs.test('story:halcyon_fragment')
      ? 'HELM // Helm authority: WARDEN.'
      : 'HELM // Helm authority: [UNREGISTERED PROCESS].');
  },

  'prologue.term_aft': async (cs) => {
    await cs.say([
      { speaker: null, text: 'SENSORS // Ring debris density rising. Hull microfractures: *3*. Acceptable.' },
      { speaker: null, text: 'Signal from the Tethys ring plane. Source: unidentified. Repeating, every hour.' },
    ]);
  },

  'prologue.term_captain': async (cs) => {
    await cs.say([
      { speaker: null, text: 'CAPTAIN\'S LOG // R. Castellan. Rotation handover. Tethys assist in 400 days.' },
      { speaker: null, text: 'HALCYON hums when she plots courses. I\'ve stopped telling her not to.' },
    ]);
  },

  'prologue.halcyon_hub': async (cs) => {
    await cs.say([
      { speaker: 'HALCYON', text: 'I am... here. Some of me.', expr: 'surprised' },
      { speaker: 'HALCYON', text: 'Enough to say: be careful.', expr: 'smile' },
    ]);
  },

  'prologue.kade_locker': async (cs) => {
    if (cs.test('pro:kade_locker')) {
      await cs.say('KADE', 'Empty. Still haven\'t fixed the code.');
      return;
    }
    cs.flag('pro:kade_locker');
    cs.sfx('unlock');
    await cs.say('KADE', 'My old locker code still works. Somebody should fix that.');
    await cs.give('medigel_plus', 1);
    await cs.give('ether', 1);
  },

  // ---------------------------------------------------------------- Party Talk
  'prologue.pt_kade_sera': async (cs, args = {}) => {
    const it = args.interactable;
    const p = it && Number.isFinite(it.x) ? { x: it.x, z: it.z + 0.6 } : here(cs);
    await cs.gather(inParty(cs, { kade: [p.x - 0.7, p.z + 0.5], sera: [p.x + 0.7, p.z + 0.5] }));
    cs.face('kade', 'sera');
    cs.face('sera', 'kade');
    const promised = cs.test('pro:promised');
    await cs.say([
      { speaker: 'SERA', text: 'Theo draws on everything. Walls. Pods. Me.', expr: 'smile' },
      { speaker: 'KADE', text: 'Your brother.' },
      { speaker: 'SERA', text: 'Twelve. Well. Twelve, plus a hundred and forty-three years asleep.' },
      { speaker: 'SERA', text: 'He made me promise I\'d be there when he woke up. I was nineteen. I said yes.', expr: 'sad' },
      ...(promised
        ? [{ speaker: 'SERA', text: 'You told me we\'d find him. People say things in medbays.' }]
        : [{ speaker: 'SERA', text: 'You didn\'t promise me anything back there. I noticed.' },
          { speaker: 'KADE', text: 'Then here\'s one. We find him.', expr: 'determined' }]),
      { speaker: 'KADE', text: 'I don\'t make promises I can\'t keep.' },
      { speaker: 'KADE', text: 'So I\'ll keep this one.', expr: 'determined' },
      { speaker: 'SERA', text: 'Then I\'m holding you to it, Lieutenant.', expr: 'smile' },
    ]);
  },
};

// ---------------------------------------------------------------- tables

const hal = (x, z) => ({ map: 'halcyon', x, z });

const objectives = {
  'pro.wake': { chapter: 'prologue', text: 'Find out why the ship is so quiet.', hint: 'The Cryo Deck exit is north of the pods.',
    boltHint: 'The door is that way. I would point, but I have no fingers.', target: hal(7.0, 18.4) },
  'pro.medbay': { chapter: 'prologue', text: 'Find the pod alarm in the medical bay.', hint: 'The cryo medical bay, off the south end of the Cryo Deck.',
    boltHint: 'The beeping is coming from the medbay. Beeping is never good.', target: hal(7.0, 29.5) },
  'pro.reach_engineering': { chapter: 'prologue', text: 'Reach Engineering.', hint: 'East along the Spine Corridor, then south. Something below is hammering.',
    boltHint: 'Engineering is down the corridor. The loud part.', target: hal(30.0, 29.5) },
  'pro.find_keycard': { chapter: 'prologue', text: 'Find the Bridge Keycard.', hint: 'Brandt\'s supply crate, behind the coolant pumps.',
    boltHint: 'The keycard is in a crate. Not a drawer. Brandt was very clear.', target: hal(15.75, 36.9) },
  'pro.reach_bridge': { chapter: 'prologue', text: 'Take the keycard to the bridge door.', hint: 'The antechamber at the east end of the corridor.',
    boltHint: 'The bridge is east. The door is the big one that says no.', target: hal(41.0, 14.4) },
  'pro.open_bridge': { chapter: 'prologue', text: 'Open the bridge door.', hint: 'Use the keycard on the antechamber door.',
    boltHint: 'Keycard, door. Door, keycard. They should get along.', target: hal(41.0, 12.6) },
  'pro.sentinel': { chapter: 'prologue', text: 'Take back the Observation Bridge.', hint: 'Rest at the antechamber Med-Station first.',
    boltHint: 'Something big is on the bridge. Rest first. I insist.', target: hal(39.4, 6.0) },
};

// flags the prologue leaves behind in real play (jumpTo adds them for later chapters, 10.1)
const PROLOGUE_DONE = [
  'seen:halcyon:tutorial', 'seen:halcyon:sera_wakes', 'seen:halcyon:spine_drones', 'seen:halcyon:hammering',
  'seen:halcyon:orion_rescue', 'seen:halcyon:gallery_ambush',
  'seen:halcyon:nyx_door', 'seen:halcyon:bridge_open', 'pro:medbay_alarm', 'sw:halcyon:control_shutter',
  'chest:halcyon:brandt', 'dest:halcyon', 'visited:halcyon', 'visited:exterior',
  'tut:reveal', 'tut:break', 'tut:bp3', 'tut:telegraph', 'tut:learn', 'tut:pro_items', 'tut:pro_area', 'tut:pro_expose',
  // the ch1+ kits wear the Stimulus Chip, so a chapter jump must not replay Orion's equip tip
  'tut:equip',
];

// Kade and Sera at Engineering: the tutorial, Sera's scene and the spine drones are behind them
const LOWER_FLAGS = [
  'story:kade_awake', 'story:sera_joined', 'seen:halcyon:tutorial', 'seen:halcyon:sera_wakes', 'seen:halcyon:spine_drones',
  'pro:medbay_alarm', 'tut:reveal', 'tut:break', 'tut:bp3', 'tut:pro_items',
];

// the POC regression sandbox (2.9): every prologue beat up to the bridge door, without the keycard
const POC_FLAGS = [
  'story:kade_awake', 'story:sera_joined', 'story:orion_joined', 'story:nyx_joined',
  'seen:halcyon:tutorial', 'seen:halcyon:sera_wakes', 'seen:halcyon:spine_drones', 'seen:halcyon:hammering',
  'seen:halcyon:orion_rescue', 'seen:halcyon:gallery_ambush',
  'seen:halcyon:nyx_door', 'pro:medbay_alarm', 'sw:halcyon:control_shutter', 'tut:reveal', 'tut:break',
];

export default {
  scripts,
  // `jump` / `at` stage each scene where it plays for the contact sheet's key-scene frames
  scenes: [
    { id: 'prologue.new_journey', chapter: 'prologue', key: true, budget: { boxes: 10, sec: 90 }, jump: 'prologue', at: 'exterior:view' },
    { id: 'prologue.tutorial', chapter: 'prologue', budget: { boxes: 5, sec: 40 }, jump: 'prologue', at: 'halcyon:start' },
    { id: 'prologue.sera_wakes', chapter: 'prologue', key: true, budget: { boxes: 9, sec: 70 }, jump: 'prologue', at: 'halcyon:medbay' },
    { id: 'prologue.pt_kade_sera', chapter: 'prologue', budget: { boxes: 9, sec: 70 }, jump: 'pro.lower', at: 'halcyon:medbay' },
    { id: 'prologue.spine_drones', chapter: 'prologue', budget: { boxes: 1, sec: 10 }, jump: 'pro.lower', at: 'halcyon:bulkhead' },
    { id: 'prologue.hammering', chapter: 'prologue', budget: { boxes: 1, sec: 10 }, jump: 'pro.lower', at: 'halcyon:engineering' },
    { id: 'prologue.orion_rescue', chapter: 'prologue', key: true, budget: { boxes: 8, sec: 70 }, jump: 'pro.lower', at: 'halcyon:gallery' },
    { id: 'prologue.gallery_ambush', chapter: 'prologue', budget: { boxes: 1, sec: 10 }, jump: 'pro.gallery', at: 'halcyon:gallery_w' },
    { id: 'prologue.equip_tip', chapter: 'prologue', budget: { boxes: 1, sec: 15 }, jump: 'pro.gallery', at: 'halcyon:gallery' },
    { id: 'prologue.keycard', chapter: 'prologue', budget: { boxes: 2, sec: 15 }, jump: 'pro.gallery', at: 'halcyon:gallery_w' },
    { id: 'prologue.nyx_door', chapter: 'prologue', key: true, budget: { boxes: 10, sec: 80 }, jump: 'pro.ante', at: 'halcyon:antechamber' },
    { id: 'prologue.bridge_open', chapter: 'prologue', budget: { boxes: 1, sec: 10 }, jump: 'pro.bridge', at: 'halcyon:antechamber' },
    { id: 'prologue.sentinel', chapter: 'prologue', key: true, budget: { boxes: 15, sec: 150 }, jump: 'pro.bridge', at: 'halcyon:bridge' },
    { id: 'prologue.rigged', chapter: 'prologue', budget: { boxes: 4, sec: 30 }, jump: 'pro.bridge', at: 'halcyon:berth' },
  ],
  objectives,
  speakers: {
    SENTINEL: { sigil: 'lock', accent: '#ff5a5a' },
  },
  destinations: [
    {
      id: 'halcyon', name: 'ISV Halcyon', subtitle: 'Crew Decks · Moth Berth', order: 0,
      desc: 'Home, stalled over Tethys. Twelve thousand asleep below the crew decks.',
      map: 'halcyon', spawn: 'berth',
    },
  ],
  newJourney: { map: 'exterior', spawn: 'view', script: 'prologue.new_journey' },
  jumps: {
    poc: { chapter: 'prologue', map: 'halcyon', spawn: 'start', flags: POC_FLAGS, objective: 'pro.find_keycard' },
    'pro.lower': {
      chapter: 'prologue', map: 'halcyon', spawn: 'engineering', level: 3, party: ['kade', 'sera'], leader: 'kade',
      flags: [...LOWER_FLAGS], objective: 'pro.reach_engineering',
    },
    // Orion just rescued, the keycard still in Brandt's crate (the gallery ambush and the equip tip)
    'pro.gallery': {
      chapter: 'prologue', map: 'halcyon', spawn: 'gallery', level: 4, party: ['kade', 'sera', 'orion'], leader: 'kade',
      flags: [...LOWER_FLAGS, 'story:orion_joined', 'seen:halcyon:hammering', 'seen:halcyon:orion_rescue', 'sw:halcyon:control_shutter'],
      objective: 'pro.find_keycard',
    },
    // the keycard in hand, on the way to the bridge door (Nyx and the Sentinel squad)
    'pro.ante': {
      chapter: 'prologue', map: 'halcyon', spawn: 'corridor_east', level: 5, party: ['kade', 'sera', 'orion'], leader: 'kade',
      flags: [...LOWER_FLAGS, 'story:orion_joined', 'seen:halcyon:hammering', 'seen:halcyon:orion_rescue', 'sw:halcyon:control_shutter',
        'seen:halcyon:gallery_ambush', 'chest:halcyon:brandt', 'tut:pro_area'],
      items: { keycard: 1 }, objective: 'pro.reach_bridge',
    },
    'pro.bridge': {
      chapter: 'prologue', map: 'halcyon', spawn: 'antechamber', level: 6, party: ['kade', 'sera', 'orion', 'nyx'], leader: 'kade',
      flags: [...POC_FLAGS, 'chest:halcyon:brandt', 'story:bridge_unlocked', 'seen:halcyon:bridge_open', 'tut:pro_items', 'tut:bp3', 'tut:pro_area', 'tut:pro_expose', 'tut:telegraph'],
      items: { keycard: 1 }, objective: 'pro.sentinel',
    },
  },
  doneFlags: { prologue: PROLOGUE_DONE },
  preload: { halcyon: ['enemy:drone', 'enemy:sentinel_mk1', 'npc:holo'], moth: ['npc:bolt'] },
  recaps: {
    prologue: 'Kade woke on a silent ship, 412 days late. BOLT helped him find Sera, whose brother\'s pod is missing, and Orion, trapped in his own reactor room. At the bridge they caught Nyx, a Ringborn salvager, breaking in. Together they beat the Sentinel. A fragment of HALCYON told them something called WARDEN holds the helm, and the jump drive\'s coil is gone.',
  },
  partyTalks: {
    'pro.kade_sera': { chapter: 'prologue', members: ['kade', 'sera'], title: 'Promises', when: 'story:sera_joined', script: 'prologue.pt_kade_sera' },
  },
};
