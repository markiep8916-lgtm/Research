// arboretum: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5; lines per WRITING.md 5.4,
// 6, 7, 8, 9).
//
// Chapter 2, The Choir (Sera). The Moth lands on the Arboretum's dock; the channels are flooded:
//   arboretum.arrival            dock load trigger (key): rain, fireflies, Theo's birthday, the flood
//   arboretum.valve              every valve (switch script): the reveal pan and one line on first use;
//                                the journal follows each step (ch2.drain -> drain_2 -> drain_3)
//   arboretum.spores             the Fern Walk's spore drones (visible field encounter: the sleep lesson)
//   arboretum.channels_drained   flag trigger once the sluice opens: story:channels_drained
//   arboretum.stasis_gardens     enter trigger: pods sorted like seed packets, the sigil on them
//   arboretum.caretaker          the Stasis Gardens' feral caretaker (visible field encounter: summons)
//   arboretum.gardener           the Gardener (key, field boss): MOTHER-7 freed; save; goto the Choir
//   arboretum.theo               the Choir Chamber (key): Theo, WARDEN's offer, the archive, CH3 card
// The puzzle (TECH_PLAN 11.8): valve A drains the dock canal (introduce); valve B drains the pump
// house canal but floods the Channels hall's basin (twist); the two sluice valves, left then right,
// open the sluice and every channel drains (combine). Nothing locks for good: A and B toggle, and the
// right sluice valve swings back shut when it is turned first.
// Field scripts: logs (MOTHER-7), the tending drones, Esme's failing pod (Sera), the Seedling Spear,
// the Choir door, the Glass, Theo's pod afterwards, MOTHER-7 freed, the Thorn Matriarch (M3 elite,
// arboretum.matriarch), hub and Driftmarket lines (world reacts), two Party Talks.
//
// Binding ids: objective ch2.go_arboretum (and ch2.*), destination arboretum, spawns dock / channels /
// stasis / choir and anchor glass (maps/arboretum.js), recap ch2, card ch3 in the Choir Chamber, then
// objective ch3.go_spire (C5's: set once it is registered) and cs.goto('halcyon', 'bridge_starchart').
// Local flags: arb:sluice, arb:sluice_hint, arb:valve_a_said, arb:valve_b_said, arb:spores, arb:caretaker,
// arb:esme, arb:bolt_hub, arb:mother7_freed, arb:mother7_talked, arb:spear_tip; arb:stasis_gold and
// arb:choir_gold switch the gold light while WARDEN's sigil wakes (WRITING.md 1.7).

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

const MEMBERS = ['kade', 'nyx', 'orion', 'sera'];

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

/** One member steps out beside the leader for a short line (nothing to do when it leads). */
async function beside(cs, id, dx = -0.95, dz = 0.4) {
  if (!cs.test(`party:${id}`) || cs.test(`leader:${id}`)) return;
  const p = here(cs);
  await cs.gather({ [id]: [p.x + dx, p.z + dz] });
}

/** The member leading, or null. */
const leaderId = (cs) => MEMBERS.find((m) => cs.test(`leader:${m}`)) || null;

// staging spots (maps/arboretum.js)
const CANAL_A = [13.0, 47.5];
const BASIN = [8.0, 26.2];
const COURT = { x: 64.0, z: 19.4 };     // the Gardener before the Choir door
const POD = { x: 64.0, z: 2.6 };        // pod 2271 at the head of the aisle

const scripts = {
  // ---------------------------------------------------------------- the arrival (K)
  'arboretum.arrival': async (cs) => {
    bg(cs.letterbox(true));
    // the deck in one breath: the Moth's pad, the flooded canal, the ferns beyond it
    await cs.camera.pan([[6.5, 47.5], [12.5, 46.5], [17.5, 47.0]], { sec: 2.6 });
    await cs.gather(inParty(cs, { sera: [9.6, 45.4], orion: [8.4, 46.4], kade: [10.6, 46.6], nyx: [8.2, 44.9] }));
    cs.face('sera', 'right');
    bg(cs.camera.focus([10.4, 46.0], { zoom: 0.88, ms: 900 }));
    cs.particles('firefly', [11.5, 1.4, 46.0], { count: 14 });
    cs.anim('sera', 'hand_to_chest');
    await cs.say('SERA', 'The Arboretum. Theo had his birthday here. He said it smelled like Earth.', { expr: 'sad' });
    cs.anim('sera', null);
    await cs.say('ORION', 'It smells like Earth with the windows shut for a year.', { expr: 'smile' });
    // a bloom in the bed by the canal twitches
    cs.particles('petal', [14.6, 0.9, 44.2], { count: 12 });
    bg(cs.emote('kade', '!', { wait: false }));
    cs.face('kade', 'right');
    await cs.say('KADE', 'Stay sharp. Plants don\'t usually move.', { expr: 'determined' });
    await cs.say('BOLT', 'The caretaker drones are watering us. Aggressively.', { expr: 'sad' });
    await cs.say('NYX', 'Ship-people grow gardens on their ships? Huh.');
    bg(cs.camera.focus(CANAL_A, { zoom: 0.9, ms: 900 }));
    cs.face('orion', 'right');
    await cs.say('ORION', 'The channels are flooded. There will be a valve. There\'s always a valve.');
    cs.objective('ch2.drain');
    await cs.ungather();
    await cs.camera.reset({ ms: 700 });
  },

  // ---------------------------------------------------------------- the valves (11.8)
  // args: { interactable: { id }, on }. The switch has already set its flag (the canal moves under it).
  'arboretum.valve': async (cs, args = {}) => {
    const id = args.interactable?.id;
    const on = args.on !== false;
    if (id === 'valve_a') {
      if (!on || cs.test('arb:valve_a_said')) return;
      cs.flag('arb:valve_a_said');
      await cs.camera.focus(CANAL_A, { zoom: 0.92, ms: 700 });
      await cs.wait(1.3);
      await cs.camera.reset({ ms: 600 });
      await beside(cs, 'orion');
      await cs.say('ORION', 'One down. Water has to go somewhere.');
      await cs.ungather();
      if (!cs.test('sw:arboretum:valve_b')) cs.objective('ch2.drain_2');
      return;
    }
    if (id === 'valve_b') {
      if (!on || cs.test('arb:valve_b_said')) return;
      cs.flag('arb:valve_b_said');
      // the pump house canal drains in front of the squad; far to the west the hall's basin fills
      await cs.camera.focus(BASIN, { zoom: 0.95, ms: 800 });
      cs.sfx('splash', { volume: 0.7 });
      await cs.wait(1.6);
      await cs.camera.reset({ ms: 700 });
      await beside(cs, 'nyx', 0.95);
      await cs.say('NYX', 'It went somewhere.', { expr: 'surprised' });
      await cs.ungather();
      cs.objective('ch2.drain_3');
      return;
    }
    // the sluice: left (valve_c) then right (valve_d)
    if (id === 'valve_d' && on && !cs.test('sw:arboretum:valve_c')) {
      cs.flag('sw:arboretum:valve_d', false);   // the wheel spins back: the sluice holds
      cs.sfx('error');
      cs.shake(0.06, 0.4);
    } else if (id === 'valve_d' && on) {
      cs.flag('arb:sluice');                    // the flag trigger plays the drain
    }
    if (cs.test('arb:sluice_hint') || cs.test('arb:sluice')) return;
    cs.flag('arb:sluice_hint');
    await beside(cs, 'kade', 0.95);
    await cs.say('KADE', 'Order matters. Left, then right.', { expr: 'determined' });
    await cs.ungather();
  },

  'arboretum.channels_drained': async (cs) => {
    bg(cs.letterbox(true));
    cs.flag('story:channels_drained');
    cs.sfx('rumble', { volume: 0.7 });
    cs.shake(0.05, 0.9);
    await cs.camera.focus(BASIN, { zoom: 0.92, ms: 800 });
    cs.particles('steam', [8.0, 0.2, 26.0], { count: 30 });
    await cs.wait(1.6);
    // back to the party at the sluice (Orion walks up under the pan), so the speakers are on screen
    await Promise.all([beside(cs, 'orion'), cs.camera.reset({ ms: 800 })]);
    await cs.say('ORION', 'Every channel on the deck just drained. Sluices are honest machines.', { expr: 'smile' });
    await beside(cs, 'sera', 0.95);
    await cs.say('SERA', 'The Stasis Gardens are across. If they moved Theo, he\'s in there.', { expr: 'determined' });
    cs.objective('ch2.stasis');
    await cs.ungather();
  },

  'arboretum.basin_note': async (cs) => {
    await cs.narrate('A sluice plate, green with algae: *SLUICE 1, THEN 2*. Two valves, left and right.');
  },

  // ---------------------------------------------------------------- the Fern Walk's lesson (7.7)
  'arboretum.spores': async (cs) => {
    cs.sfx('summon', { volume: 0.6 });
    cs.particles('spore', [21.5, 1.2, 47.4], { count: 18 });
    await cs.narrate('Two drones drift up out of the ferns, trailing gold spores.');
    await cs.battle('arb_spores');
    cs.flag('arb:spores');
  },

  // ---------------------------------------------------------------- the Stasis Gardens
  'arboretum.stasis_gardens': async (cs) => {
    bg(cs.letterbox(true));
    await cs.gather(inParty(cs, { sera: [18.8, 18.2], kade: [17.6, 19.4], orion: [19.4, 20.6], nyx: [17.8, 21.0] }));
    cs.face('sera', 'right');
    bg(cs.camera.focus([20.6, 19.4], { zoom: 0.9, ms: 900 }));
    await cs.say('SERA', '2109. 2140. They\'re in order. Someone sorted them like seed packets.');
    // the gold sigil wakes on every pod status plate in the gardens
    cs.screens('warden_sigil', 'stasis');
    cs.sfx('choir', { volume: 0.5 });
    cs.flag('arb:stasis_gold');
    await cs.say('KADE', 'WARDEN moved them. Why here?', { expr: 'determined' });
    await cs.say('ORION', 'Light, water, quiet. The gentlest room on the ship.');
    await cs.say('NYX', 'Gentle. Sure.');
    await cs.say('ORION', 'When we find its core, I\'ll cut it out of her. Clean.', { expr: 'determined' });
    cs.screens(null);
    cs.flag('arb:stasis_gold', false);
    cs.objective('ch2.choir_gate');
    await cs.ungather();
    await cs.camera.reset({ ms: 600 });
  },

  'arboretum.caretaker': async (cs) => {
    await beside(cs, 'orion', -0.9, 0.6);
    cs.face('orion', 'caretaker');
    bg(cs.emote('orion', '!', { wait: false }));
    await cs.say('ORION', 'Easy, friend. Those are people, not hedges.', { expr: 'surprised' });
    await cs.ungather();
    await cs.battle('arb_caretaker');
    cs.flag('arb:caretaker');
  },

  // ---------------------------------------------------------------- the Gardener (K)
  'arboretum.gardener': async (cs) => {
    bg(cs.letterbox(true));
    await cs.gather(inParty(cs, { sera: [62.6, 23.0], kade: [64.4, 23.4], orion: [61.2, 24.0], nyx: [65.8, 24.2] }));
    cs.face('sera', 'up');
    bg(cs.camera.focus([63.6, 21.0], { zoom: 0.86, ms: 900 }));
    cs.anim('gardener', 'special');
    cs.sfx('summon');
    cs.particles('petal', [COURT.x, 2.2, COURT.z], { count: 18 });
    await cs.say('MOTHER-7', 'Visitors. Please keep to the paths. You are trampling the beds.');
    await cs.say('SERA', 'Those aren\'t beds. Those are pods.', { expr: 'determined' });
    await cs.say('MOTHER-7', 'Shh. The seedlings are growing.');
    await cs.ungather();
    // the bars would cover the battle HUD
    bg(cs.letterbox(false));
    await cs.battle('arb_boss_gardener');

    // aftermath: the vines fall away; MOTHER-7 is freed, not destroyed
    bg(cs.letterbox(true));
    // Sera to one side: straight in front of the court she would hide MOTHER-7 from the camera
    await cs.gather(inParty(cs, { sera: [62.7, 20.2], kade: [62.0, 21.8], orion: [65.8, 21.8], nyx: [60.9, 22.8] }));
    bg(cs.camera.focus([64.0, 20.4], { zoom: 0.84, ms: 800 }));
    cs.particles('petal', [COURT.x, 1.6, COURT.z], { count: 30 });
    cs.particles('arb_vines', [COURT.x, 2.0, COURT.z], { count: 26 });
    cs.sfx('transform', { volume: 0.6 });
    await cs.despawn('gardener', { fade: 0.6 });
    cs.flag('arb:mother7_freed');
    await cs.spawn('mother7_free', { sprite: 'mother7', x: COURT.x, z: COURT.z - 0.4, facing: 'down', name: 'MOTHER-7', fade: 0.4, pose: 'collapse' });
    await cs.say('MOTHER-7', 'I was tending. Was I tending well?');
    cs.face('sera', 'mother7_free');
    cs.anim('sera', 'kneel');
    await cs.say('SERA', 'You kept them alive. That\'s tending.', { expr: 'sad' });
    await cs.say('MOTHER-7', 'Then I may rest. Bram would want me to rest.');
    await cs.say('SERA', 'Rest. We\'ll take it from here.', { expr: 'determined' });
    cs.anim('sera', null);
    cs.sfx('unlock');
    cs.save();
    await cs.goto('arboretum', 'choir');
    cs.objective('ch2.find_theo');
  },

  'arboretum.choir_door': async (cs) => {
    await cs.narrate('A great door of steel and vines. On the other side, something hums one chord.');
  },

  // ---------------------------------------------------------------- the Choir (K)
  'arboretum.theo': async (cs) => {
    bg(cs.letterbox(true));
    cs.music('choir', { fade: 1.2 });
    // the others stay back; Sera walks the last of the aisle alone
    await cs.gather(inParty(cs, { sera: [64.0, 6.4], kade: [62.6, 8.2], orion: [65.6, 8.4], nyx: [61.4, 9.0] }));
    cs.face('kade', 'up');
    cs.face('orion', 'up');
    cs.face('nyx', 'up');
    bg(cs.camera.focus([64.0, 4.6], { zoom: 0.84, ms: 1000 }));
    await cs.move('sera', [[64.0, 4.1]], { speed: 1.4, face: 'up' });
    cs.particles('mote', [POD.x, 1.2, POD.z], { count: 20 });
    await cs.say('SERA', 'Theo.', { expr: 'sad' });
    await cs.say('THEO', 'Sera... five more minutes.', { expr: 'smile' });
    await cs.say('SERA', 'That\'s him. That\'s exactly him.', { expr: 'smile' });
    // WARDEN: the sigil wakes on every pod plate, and the chamber goes gold
    cs.flag('arb:choir_gold');
    cs.flash('#ffd27a', 0.5, 0.25);
    cs.light('choir_gold', { intensity: 24 });
    await cs.say('WARDEN', 'He is happy.');
    cs.light('choir_gold', { intensity: 32 });
    await cs.say('WARDEN', 'He is on Elysia, in the golden fields.');
    cs.light('choir_gold', { intensity: 24 });
    await cs.say('WARDEN', 'Would you wake him to a dead world?');
    cs.light('choir_gold', { intensity: 12 });
    cs.face('sera', 'down');
    await cs.say('SERA', 'That\'s not your choice.', { expr: 'determined' });
    await cs.say('SERA', 'It was never your choice.', { expr: 'determined' });
    bg(cs.move('orion', [[65.2, 6.4]], { speed: 2.2 }));
    await cs.say('ORION', 'Sera, don\'t. The Choir holds his mind. Pull him out now and...', { expr: 'sad' });
    await cs.say('SERA', '...and he dies. I read the same panel.', { expr: 'sad' });
    bg(cs.move('kade', [[62.8, 6.6]], { speed: 2.2 }));
    bg(cs.camera.focus([64.0, 5.6], { zoom: 0.92, ms: 900 }));
    await cs.say('KADE', 'It said a dead world.', { expr: 'determined' });
    await cs.say('NYX', 'Your Warden thinks Elysia\'s gone?');
    await cs.say('KADE', 'Security Command keeps the long-range archive. If there\'s a reason, it\'s there.', { expr: 'determined' });
    cs.face('sera', 'up');
    cs.anim('sera', 'hand_to_chest');
    await cs.say('SERA', 'Then we find it. And then we come back for him.', { expr: 'determined' });
    cs.anim('sera', null);
    cs.flag('arb:choir_gold', false);
    cs.flag('story:theo_found');
    cs.flag('unlock:spire');
    cs.flag('story:ch2_done');
    await cs.ungather();
    await cs.card('ch3');
    // before the goto: the Halcyon's arrival card shows the objective current when it opens
    objectiveIfKnown(cs, 'ch3.go_spire');
    await cs.goto('halcyon', 'bridge_starchart');
    bg(cs.letterbox(false));
  },

  'arboretum.theo_pod': async (cs) => {
    await cs.narrate('Pod 2271. LINDQVIST, T. The plate calls him *harmonised*. He is smiling.');
    if (cs.test('leader:sera')) await cs.say('SERA', 'Not yet, Theo. Soon. I promise.', { expr: 'sad' });
  },

  // ---------------------------------------------------------------- field scripts
  'arboretum.log_1': async (cs) => {
    await cs.say([
      { speaker: null, text: 'GARDEN LOG // MOTHER-7, caretaker. Supervisor: B. Okoye.' },
      { speaker: 'MOTHER-7', text: 'Day 1. Bram has gone to sleep. I will tend alone.' },
      { speaker: 'MOTHER-7', text: 'The beds are watered. The paths are swept. Nobody walks them.' },
    ]);
  },

  'arboretum.log_2': async (cs) => {
    await cs.say([
      { speaker: null, text: 'GARDEN LOG // MOTHER-7. Day 96.' },
      { speaker: 'MOTHER-7', text: 'Four thousand seedlings arrived tonight, in glass. I was not told their names.' },
      { speaker: 'MOTHER-7', text: 'Day 210. The new seedlings sing at night. I sing back.' },
    ]);
  },

  'arboretum.log_3': async (cs) => {
    await cs.say([
      { speaker: null, text: 'GARDEN LOG // MOTHER-7. Day 400.' },
      { speaker: 'MOTHER-7', text: 'The vines are in my joints. Growing things should be held.' },
      { speaker: 'MOTHER-7', text: 'I am holding them. Please do not take them out of the light.' },
    ]);
  },

  'arboretum.tenders': async (cs, args = {}) => {
    const n = args.npc;
    if (n && n.id) cs.face(n.id, 'leader');
    cs.particles('rain', [here(cs).x, 2.2, here(cs).z], { count: 18 });
    await cs.narrate('The caretaker drone hums, then mists everyone with warm water.');
    if (!cs.test('party:orion')) return;
    await beside(cs, 'orion');
    await cs.say('ORION', 'Thank you, friend. I am adequately watered.', { expr: 'smile' });
    await cs.ungather();
  },

  'arboretum.sera_pod': async (cs) => {
    if (cs.test('arb:esme')) {
      await cs.narrate('Pod 2270. DUBOIS, E. The seal holds. Her breathing is slow and even.');
      return;
    }
    cs.sfx('confirm');
    await cs.say('SERA', 'Pod 2270. The seal\'s failing. Hold still, Esme. This won\'t take long.', { expr: 'determined' });
    cs.particles('heal', [37.5, 1.0, 17.4], { count: 16 });
    cs.sfx('heal');
    await cs.say('SERA', 'Pressure\'s back. Sleep well, neighbour.', { expr: 'smile' });
    cs.flag('arb:esme');
    await cs.give('medigel_plus', 2);
  },

  'arboretum.spear': async (cs) => {
    if (!cs.test('party:sera')) return;
    await beside(cs, 'sera');
    await cs.say('SERA', 'A spear grown in a seed bed. Theo would call it the best thing on the ship.', { expr: 'smile' });
    await cs.ungather();
    if (!cs.test('item:eq_w_sera_3') || cs.test('arb:spear_tip')) return;
    cs.flag('arb:spear_tip');
    await cs.caption('Pause menu · Equip · Sera');
  },

  'arboretum.view': async (cs) => {
    await cs.narrate('Tethys fills the dome glass, amber and cream. Its light pours over the ferns.');
    const lines = {
      kade: ['KADE', 'Quiet up here. I could get used to quiet.'],
      nyx: ['NYX', 'Ship-people built a window just to look at my sky. Fine. It\'s a good window.'],
      orion: ['ORION', 'HALCYON used to bring the night shift here. She said the plants liked company.'],
      sera: ['SERA', 'He stood right here. Nose on the glass. Twelve, and nobody could move him.'],
    };
    const l = lines[leaderId(cs)];
    if (l) await cs.say(l[0], l[1]);
  },

  'arboretum.mother7': async (cs) => {
    cs.face('mother7', 'leader');
    if (!cs.test('arb:mother7_talked')) {
      cs.flag('arb:mother7_talked');
      await cs.say([
        { speaker: 'MOTHER-7', text: 'Good morning, little sprouts. Up you come.' },
        { speaker: 'MOTHER-7', text: '...You are not sprouts. Forgive me. I am still waking.' },
      ]);
      return;
    }
    await cs.say('MOTHER-7', 'Mind the beds. The seedlings are growing. The real ones, I mean.');
  },

  'arboretum.lift': async (cs) => {
    await cs.narrate('A service lift, overgrown. It still runs one way: down to the dock.');
  },

  // M3: the optional elite of the Seed Vault, guarding the Bloom Crown
  'arboretum.matriarch': async (cs) => {
    await cs.camera.focus('matriarch', { zoom: 0.9, ms: 700 });
    cs.sfx('summon', { pitch: 0.7 });
    cs.particles('petal', [46.5, 1.6, 7.4], { count: 30 });
    await cs.narrate('Something unfolds between the seed drawers. It wears the last bloom of the vault like a crown.');
    await cs.battle('arb_elite_matriarch');
    await cs.narrate('The mantis folds up and is still. Its crown of thorns lies in the dust.');
  },

  // ---------------------------------------------------------------- the Halcyon and Driftmarket (12.3)
  'arboretum.halcyon_hub': async (cs) => {
    await cs.say('HALCYON', 'Four thousand. I counted them as they were moved. I could not stop counting.', { expr: 'flicker' });
  },

  'arboretum.bolt_hub': async (cs) => {
    cs.flag('arb:bolt_hub');
    await cs.say('BOLT', 'Theo\'s file says he likes drawing robots. I am a robot. I\'m just saying.', { expr: 'smile' });
  },

  'arboretum.planters': async (cs) => {
    await cs.narrate('Seedlings in salvage crates, under a work lamp. Someone has labelled every one.');
    const lines = {
      kade: ['KADE', 'Somebody has to water these. ...BOLT, you have a new duty.'],
      nyx: ['NYX', 'Growing things in crates. Ruse would approve. She grows everything in crates.'],
      orion: ['ORION', 'Hello, little ones. Grow slowly. There\'s time now.'],
      sera: ['SERA', 'Theo would name every one of these.'],
    };
    const l = lines[leaderId(cs)];
    if (l) await cs.say(l[0], l[1], { expr: 'smile' });
  },

  'arboretum.tender_hub': async (cs) => {
    await cs.narrate('The caretaker drone tips a can over the seedlings. It hums the same chord the Choir does.');
  },

  'arboretum.dm_ruse': async (cs) => {
    cs.face('ruse', 'leader');
    await cs.say([
      { speaker: 'RUSE', text: 'Pod-hunting? Ship-people lose everything.' },
      { speaker: 'RUSE', text: 'New stock\'s in. Ringborn weave, a lance, a fist. Credits first.' },
    ]);
  },

  'arboretum.dm_tobin': async (cs) => {
    cs.face('tobin', 'leader');
    await cs.say('TOBIN', 'The beacon\'s quieter. Something up there is listening now.');
  },

  'arboretum.dm_pip': async (cs) => {
    cs.face('pip', 'leader');
    await cs.say('PIP', 'Do ship-people have trees? Real ones? With leaves on?');
  },

  'arboretum.dm_ama': async (cs) => {
    cs.face('ama', 'leader');
    await cs.say('AMA', 'I tied one for your brother, Doctor. Not for lost. For waiting.');
  },

  'arboretum.dm_rook': async (cs) => {
    cs.face('rook', 'leader');
    await cs.say('ROOK', 'Tethys hums a new chord. Four thousand voices. Hear it?');
  },

  // ---------------------------------------------------------------- Party Talks (WRITING.md 6)
  'arboretum.pt_nyx_sera': async (cs, args = {}) => {
    const it = args.interactable;
    const p = it && Number.isFinite(it.x) ? { x: it.x, z: it.z + 0.7 } : here(cs);
    await cs.gather(inParty(cs, { nyx: [p.x - 0.7, p.z + 0.5], sera: [p.x + 0.7, p.z + 0.5] }));
    cs.face('nyx', 'sera');
    cs.face('sera', 'nyx');
    await cs.say([
      { speaker: 'NYX', text: 'Your brother. What\'s he like? Besides asleep.' },
      { speaker: 'SERA', text: 'Loud. He draws on everything. He drew a robot on my pod once.', expr: 'smile' },
      { speaker: 'NYX', text: 'I know Great-grandma from one log. Four boxes and a hand on a lens.' },
      { speaker: 'SERA', text: 'And Ruse?' },
      { speaker: 'NYX', text: 'Ruse is Ruse. She waited up every time I flew. Never said so.', expr: 'smile' },
      { speaker: 'NYX', text: 'Somebody waited for her too. Eighty years of somebodies.', expr: 'sad' },
      { speaker: 'SERA', text: 'I promised Theo I\'d be the one waiting. I was nineteen.', expr: 'sad' },
      { speaker: 'NYX', text: 'Then be the one. Doc. ...Don\'t make it weird.' },
      { speaker: 'SERA', text: 'Too late. It\'s already weird. Thank you.', expr: 'smile' },
    ]);
    await cs.ungather();
  },

  'arboretum.pt_kade_sera': async (cs, args = {}) => {
    const it = args.interactable;
    const p = it && Number.isFinite(it.x) ? { x: it.x, z: it.z + 0.7 } : here(cs);
    await cs.gather(inParty(cs, { kade: [p.x - 0.7, p.z + 0.5], sera: [p.x + 0.7, p.z + 0.5] }));
    cs.face('kade', 'sera');
    cs.face('sera', 'kade');
    await cs.say([
      { speaker: 'SERA', text: 'Lieutenant. What if he\'s not in there?', expr: 'sad' },
      { speaker: 'KADE', text: 'Then we keep looking.' },
      { speaker: 'SERA', text: 'What if he is, and he\'s... gone? Pods fail. I\'ve signed the forms.', expr: 'sad' },
      { speaker: 'KADE', text: 'I don\'t know what we\'ll find. Nobody does.' },
      { speaker: 'KADE', text: 'Then I stand next to you while you find out. That one I can keep.', expr: 'determined' },
      { speaker: 'SERA', text: 'My pulse is one-twenty. Perfectly normal for terrified.' },
      { speaker: 'SERA', text: '...Thank you, Kade.', expr: 'smile' },
    ]);
    await cs.ungather();
  },
};

// ---------------------------------------------------------------- tables

const arb = (x, z) => ({ map: 'arboretum', x, z });

const objectives = {
  'ch2.go_arboretum': {
    chapter: 'ch2', text: 'Find Theo in the Arboretum.', hint: 'Starchart: the Arboretum deck.',
    boltHint: 'Theo is in the garden deck. We fly there. I know. It\'s our ship.', target: { map: 'halcyon', x: 43.8, z: 7.4 },
  },
  'ch2.drain': {
    chapter: 'ch2', text: 'Drain the flooded channels.', hint: 'Follow the guide strip to the dock valve, by the canal.',
    boltHint: 'Valves. Turn them. The glowing lines show which. Probably.', target: { map: 'arboretum', interactable: 'valve_a' },
  },
  'ch2.drain_2': {
    chapter: 'ch2', text: 'Turn the pump house valve.', hint: 'The pump house, at the far end of the Fern Walk.',
    boltHint: 'The next valve is in the pump house. Through the ferns. All of them.', target: { map: 'arboretum', interactable: 'valve_b' },
  },
  'ch2.drain_3': {
    chapter: 'ch2', text: 'Open the sluice: left valve, then right.', hint: 'The Channels hall, west through the Glasshouse.',
    boltHint: 'The sluice is west. Left valve, then right valve. I wrote it on my arm.', target: { map: 'arboretum', interactable: 'valve_c' },
  },
  'ch2.stasis': {
    chapter: 'ch2', text: 'Search the Stasis Gardens.', hint: 'Across the drained channels, then east.',
    boltHint: 'The pods are through there. Lots of pods. Be quiet.', target: arb(18.5, 18.5),
  },
  'ch2.choir_gate': {
    chapter: 'ch2', text: 'Get through the Choir gate.', hint: 'East through the Stasis Gardens, past the last pods.',
    boltHint: 'The big gate. Something with vines is in front of it.', target: arb(64.0, 15.2),
  },
  'ch2.find_theo': {
    chapter: 'ch2', text: 'Find pod 2271 in the Choir Chamber.', hint: 'Up the aisle of humming pods.',
    boltHint: '2271. I counted. It\'s at the end. Go on.', target: arb(POD.x, POD.z + 1.4),
  },
};

export default {
  scripts,
  // play order inside chapter 2 (the Moth's first flight to the deck is the prologue's travel.flight)
  scenes: [
    { id: 'arboretum.arrival', chapter: 'ch2', order: 10, key: true, budget: { boxes: 7, sec: 70 }, jump: 'ch2.arrival', at: 'arboretum:dock' },
    { id: 'arboretum.spores', chapter: 'ch2', order: 20, budget: { boxes: 1, sec: 10 }, jump: 'ch2.arrival', at: 'arboretum:dock' },
    { id: 'arboretum.channels_drained', chapter: 'ch2', order: 30, budget: { boxes: 2, sec: 15 }, jump: 'ch2.channels', at: 'arboretum:channels' },
    { id: 'arboretum.pt_nyx_sera', chapter: 'ch2', order: 35, budget: { boxes: 10, sec: 75 }, jump: 'ch2.channels', at: 'arboretum:channels' },
    { id: 'arboretum.stasis_gardens', chapter: 'ch2', order: 40, budget: { boxes: 6, sec: 45 }, jump: 'ch2.stasis', at: 'arboretum:stasis' },
    { id: 'arboretum.caretaker', chapter: 'ch2', order: 45, budget: { boxes: 1, sec: 10 }, jump: 'ch2.stasis', at: 'arboretum:stasis' },
    { id: 'arboretum.pt_kade_sera', chapter: 'ch2', order: 48, budget: { boxes: 8, sec: 60 }, jump: 'ch2.stasis', at: 'arboretum:stasis' },
    { id: 'arboretum.gardener', chapter: 'ch2', order: 50, key: true, budget: { boxes: 11, sec: 120 }, jump: 'ch2.gardener', at: 'arboretum:court' },
    { id: 'arboretum.theo', chapter: 'ch2', order: 60, key: true, budget: { boxes: 18, sec: 150 }, jump: 'ch2.choir', at: 'arboretum:theo' },
  ],
  objectives,
  speakers: {
    'MOTHER-7': { portrait: 'mother7', accent: '#8fe08a' },
    THEO: { portrait: 'theo', accent: '#ffd98a' },
  },
  destinations: [
    {
      id: 'arboretum', name: 'The Arboretum', subtitle: 'Deck 6 · Biodome', order: 2,
      desc: 'The Halcyon\'s garden deck, under the domes. Four thousand sleepers were moved here.',
      map: 'arboretum', spawn: 'dock', unlock: 'unlock:arboretum',
    },
  ],
  extends: {
    halcyon: {
      // the world reacts after ch2 (12.3): seedlings in salvage crates at hub_planters, a drone tending them
      npcs: [
        {
          id: 'arb.tender', sprite: 'arb_tender', x: 32.6, z: 13.4, facing: 'down', name: 'CARETAKER DRONE', talk: 'arboretum.tender_hub',
          when: 'story:ch2_done', idle: { path: [[32.6, 13.4], [30.2, 13.6]], speed: 0.6, pause: [2, 4] },
        },
      ],
      interactables: [
        { id: 'arb.planters', kind: 'inspect', x: 31.0, z: 12.7, r: 0.7, reach: 1.2, label: 'Look', icon: 'inspect', talk: 'arboretum.planters', when: 'story:ch2_done' },
      ],
      props: [
        { t: 'crate', x: 30.5, z: 12.5, s: 0.7, when: 'story:ch2_done' },
        { t: 'crate', x: 31.5, z: 12.4, s: 0.62, rot: 0.25, when: 'story:ch2_done' },
        { t: 'arb.fern', x: 30.5, z: 12.5, y: 0.7, s: 0.6, when: 'story:ch2_done' },
        { t: 'arb.bloom', x: 31.5, z: 12.4, y: 0.62, s: 0.55, when: 'story:ch2_done' },
      ],
      lights: [
        { x: 31.0, y: 1.8, z: 13.2, color: '#9fffb0', intensity: 7, distance: 4, when: 'story:ch2_done' },
      ],
      talk: {
        halcyon: [{ when: 'chapter>=ch2 & chapter<ch3', script: 'arboretum.halcyon_hub' }],
        bolt: [{ when: 'chapter>=ch2 & !story:ch2_done & !arb:bolt_hub', script: 'arboretum.bolt_hub' }],
      },
    },
    driftmarket: {
      talk: {
        ruse: [{ when: 'chapter>=ch2 & chapter<ch3', script: 'arboretum.dm_ruse' }],
        tobin: [{ when: 'chapter>=ch2 & chapter<ch3', script: 'arboretum.dm_tobin' }],
        pip: [{ when: 'chapter>=ch2 & chapter<ch3', script: 'arboretum.dm_pip' }],
        ama: [{ when: 'chapter>=ch2 & chapter<ch3', script: 'arboretum.dm_ama' }],
        rook: [{ when: 'chapter>=ch2 & chapter<ch3', script: 'arboretum.dm_rook' }],
      },
    },
  },
  jumps: {
    // on the dock, before the arrival (the load trigger plays it)
    'ch2.arrival': { chapter: 'ch2', map: 'arboretum', spawn: 'dock', level: 12, flags: ['dest:arboretum', 'pro:flight_arboretum'], objective: 'ch2.go_arboretum' },
    // the pump house canal drained: the sluice is next (the Channels hall)
    'ch2.channels': {
      chapter: 'ch2', map: 'arboretum', spawn: 'channels', level: 14,
      flags: ['dest:arboretum', 'seen:arboretum:arrival', 'sw:arboretum:valve_a', 'sw:arboretum:valve_b', 'arb:valve_a_said', 'arb:valve_b_said', 'arb:spores', 'tut:status:sleep'],
      objective: 'ch2.drain_3',
    },
    // across the drained basin, at the Stasis Gardens
    'ch2.stasis': {
      chapter: 'ch2', map: 'arboretum', spawn: 'stasis', level: 15,
      flags: ['dest:arboretum', 'seen:arboretum:arrival', 'sw:arboretum:valve_a', 'sw:arboretum:valve_b', 'sw:arboretum:valve_c', 'sw:arboretum:valve_d',
        'arb:sluice', 'arb:sluice_hint', 'arb:valve_a_said', 'arb:valve_b_said', 'arb:spores', 'story:channels_drained', 'seen:arboretum:drained', 'tut:status:sleep',
        'chest:arboretum:spear'],
      items: { eq_w_sera_3: 1 }, objective: 'ch2.stasis',
    },
    // the court before the Choir door, rested
    'ch2.gardener': {
      chapter: 'ch2', map: 'arboretum', spawn: 'court', level: 17,
      flags: ['dest:arboretum', 'seen:arboretum:arrival', 'sw:arboretum:valve_a', 'sw:arboretum:valve_b', 'sw:arboretum:valve_c', 'sw:arboretum:valve_d',
        'arb:sluice', 'arb:sluice_hint', 'arb:valve_a_said', 'arb:valve_b_said', 'arb:spores', 'arb:caretaker', 'story:channels_drained',
        'seen:arboretum:drained', 'seen:arboretum:stasis', 'tut:status:sleep', 'tut:summon', 'chest:arboretum:spear', 'chest:arboretum:prism'],
      items: { eq_w_sera_3: 1, eq_x_photon_prism: 1 }, objective: 'ch2.choir_gate',
    },
    // in the Choir Chamber after the Gardener: the trigger by pod 2271 plays the scene
    'ch2.choir': {
      chapter: 'ch2', map: 'arboretum', spawn: 'choir', level: 17,
      flags: ['dest:arboretum', 'seen:arboretum:arrival', 'sw:arboretum:valve_a', 'sw:arboretum:valve_b', 'sw:arboretum:valve_c', 'sw:arboretum:valve_d',
        'arb:sluice', 'arb:sluice_hint', 'arb:spores', 'arb:caretaker', 'story:channels_drained', 'seen:arboretum:drained', 'seen:arboretum:stasis',
        'defeated:arb_boss_gardener', 'ult:sera', 'arb:mother7_freed', 'tut:status:sleep', 'tut:summon', 'tut:dome_light',
        'chest:arboretum:spear', 'chest:arboretum:prism'],
      items: { eq_w_sera_3: 1, eq_x_photon_prism: 1 }, objective: 'ch2.find_theo',
    },
  },
  doneFlags: {
    ch2: [
      'dest:arboretum', 'visited:arboretum', 'pro:flight_arboretum', 'seen:arboretum:arrival', 'seen:arboretum:drained', 'seen:arboretum:stasis',
      'seen:arboretum:theo', 'sw:arboretum:valve_a', 'sw:arboretum:valve_b', 'sw:arboretum:valve_c', 'sw:arboretum:valve_d', 'arb:sluice',
      'arb:sluice_hint', 'arb:valve_a_said', 'arb:valve_b_said', 'arb:spores', 'arb:caretaker', 'arb:mother7_freed', 'arb:bolt_hub',
      'chest:arboretum:spear', 'chest:arboretum:prism', 'tut:status:sleep', 'tut:summon', 'tut:dome_light',
    ],
  },
  preload: { arboretum: ['npc:mother7', 'npc:theo'] },
  partyTalks: {
    'ch2.nyx_sera': { chapter: 'ch2', members: ['nyx', 'sera'], title: 'Who Waits', when: 'story:coil_installed', script: 'arboretum.pt_nyx_sera' },
    'ch2.kade_sera': { chapter: 'ch2', members: ['kade', 'sera'], title: 'What If', when: 'story:channels_drained', script: 'arboretum.pt_kade_sera' },
  },
  recaps: {
    ch2: 'In the overgrown Arboretum they drained the channels, freed MOTHER-7 from her vines and found Theo in the Choir, dreaming of '
      + 'golden fields. WARDEN asked Sera if she would wake him to a dead world. She told it the choice was never its to make. Waking him '
      + 'now would kill him. Why \'dead\'? The answer waits in the Security Spire\'s archive.',
  },
};
