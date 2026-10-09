// spire: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5; lines per WRITING.md 5.5).
//
// Chapter 3, The Oath (Kade), in play order:
//   spire.arrival          spire · load (key): red alert, WARDEN's loop on every screen, Kade comes home
//   spire.checkpoint       the first barricade: two troopers (the mark lesson; 1-box lead-in)
//   spire.riot             the barracks: a riot drone (the jam lesson; 1-box lead-in)
//   spire.grid_terminal    every grid terminal (switch script): Orion's line on first use, step objectives
//   spire.kade_override    the security panel between the paired grids (leader kade)
//   spire.cadets           the cell release console (key): five cadets, 412 days; story:cadets_freed
//   spire.mk3_guard        the Officers' Deck Mk-III (field boss): the lock-on lesson for Voss's escorts
//   spire.quarters         Kade's old room: somebody made the bed (the Oathkeeper footlocker)
//   spire.oath_recording   the training hall terminal (key): Voss swears in a young Kade
//   spire.voss             the command deck (key): the flare report, "Then...", COMMANDER VOSS, the key,
//                          her upload, the CHAPTER FOUR card, goto spire:antechamber
// Field scripts: spire.screen (WARDEN's propaganda, one line in rotation), cadet talk, terminals,
// Kade's desk, the Oathkeeper, the optional Mk-III Prime, Party Talks (ch3.kade_nyx, ch3.kade_orion),
// the Halcyon hub (HALCYON, BOLT, Voss's empty post) and Driftmarket's chapter-3 lines.
//
// Staging (WRITING 1.8, G2): walks, emotes, light changes and camera moves run under the lines
// (bg()); camera moves take about a second; no wait padding. Scripts never assume who leads: every
// traveler who speaks is gathered, and members already at their slot are not moved.
// Objectives: ch3.go_spire (binding, set by C4's card), ch3.grids -> ch3.grids_2 -> ch3.grids_3 (the
// grid steps, 11.8) -> ch3.cells -> ch3.climb -> ch3.command -> ch4.dive (C6 owns its text).
// Local flags: spire:mk3_down, spire:bolt_hub, spire:said_t1, spire:said_t2, spire:scr_1 .. scr_3.

/** A cs call left running alongside others: an abort (Retry, Load, jumpTo) must not surface unhandled. */
const bg = (p) => {
  if (p && p.catch) p.catch(() => {});
  return p;
};

/** A gather layout with only the members in the party. */
function inParty(cs, slots) {
  const out = {};
  for (const [id, p] of Object.entries(slots)) if (cs.test(`party:${id}`)) out[id] = p;
  return out;
}

/** The leader's position. */
function here(cs) {
  const a = cs.actor('leader');
  return a ? { x: a.x, z: a.z } : { x: 0, z: 0 };
}

/** Members other than the leader step out beside it for a short exchange (the leader stays put). */
function beside(cs, ids, { dz = 0.4 } = {}) {
  const p = here(cs);
  const spots = [[-1.0, dz], [1.0, dz], [-0.5, dz + 0.9], [0.6, dz + 0.9]];
  const slots = {};
  let k = 0;
  for (const id of ids) {
    if (cs.test(`leader:${id}`) || !cs.test(`party:${id}`)) continue;
    slots[id] = [p.x + spots[k][0], p.z + spots[k][1]];
    k++;
  }
  return slots;
}

const TABLE = { x: 35.5, z: 8.2 };     // the command holo table

const scripts = {
  // ---------------------------------------------------------------- arrival (K)
  'spire.arrival': async (cs) => {
    bg(cs.letterbox(true));
    cs.music('spire', { fade: 0.6 });
    // the flight's stand-in can hand the leader over at its cockpit seat, not at the berth: start on the dock
    const p = here(cs);
    if (p.x > 13.5 || p.z < 41.5) await cs.goto('spire', 'dock', { transition: 'none' });
    // the checkpoint first: barricades, the sigil pylon, every screen showing WARDEN
    await cs.camera.focus([31.0, 50.2], { zoom: 0.95, ms: 1 });
    // the squad ends short of the Checkpoint's trigger (x 15.5): the player walks into the troopers
    bg(cs.gather(inParty(cs, { kade: [14.2, 50.4], nyx: [13.2, 51.6], sera: [13.0, 49.4], orion: [12.2, 51.0] })));
    cs.light('sigil', { intensity: 13 });
    cs.light('pylon', { intensity: 20 });
    const pan = bg(cs.camera.pan([[31.0, 50.2], [17.0, 50.4]], { sec: 3 }));
    await cs.say('WARDEN', 'Remain calm. Return to your pod. You are loved.');
    cs.light('sigil', { intensity: 9 });
    cs.light('pylon', { intensity: 16 });
    await pan;
    bg(cs.move('kade', [[15.0, 50.4]], { speed: 1.6, face: 'right' }));
    await cs.say('KADE', 'This was my deck.');
    bg(cs.emote('nyx', 'sweat', { wait: false }));
    cs.anim('nyx', 'arms_crossed');
    await cs.say('NYX', 'Cozy. Love the screaming.');
    cs.anim('nyx', null);
    cs.face('kade', 'nyx');
    await cs.say('KADE', 'Barracks, cells, armory, command. Commander Voss will be at the top.', { expr: 'determined' });
    cs.face('sera', 'kade');
    await cs.say('SERA', 'You think she\'s alive?', { expr: 'sad' });
    cs.face('kade', 'right');
    await cs.say('KADE', 'I think she\'s waiting.');
    cs.anim('orion', 'point');
    await cs.say('ORION', 'The grids run off terminals. I can talk to terminals.', { expr: 'smile' });
    cs.anim('orion', null);
    cs.objective('ch3.grids');
    await cs.ungather();
  },

  // ---------------------------------------------------------------- the two lessons (1-box lead-ins)
  'spire.checkpoint': async (cs) => {
    bg(cs.letterbox(true));
    bg(cs.spawn('cp_trooper_a', { sprite: 'enemy:sec_trooper', x: 22.4, z: 49.0, facing: 'left', name: 'TROOPER', fade: 0.3 }));
    bg(cs.spawn('cp_trooper_b', { sprite: 'enemy:sec_trooper', x: 22.6, z: 50.6, facing: 'left', name: 'TROOPER', fade: 0.3 }));
    bg(cs.camera.focus([20.0, 50.6], { zoom: 0.9, ms: 700 }));
    cs.sfx('alarm');
    bg(cs.move('cp_trooper_a', [[20.6, 51.6]], { speed: 3 }));
    bg(cs.move('cp_trooper_b', [[20.4, 52.6]], { speed: 3 }));
    await cs.narrate('Two troopers vault the barricade. Their visors flare red.');
    await cs.letterbox(false);
    await cs.battle('spire_troopers');
    cs.particles('spark', [20.5, 0.9, 52.0], { count: 18 });
    bg(cs.despawn('cp_trooper_a', { fade: 0.3 }));
    await cs.despawn('cp_trooper_b', { fade: 0.3 });
  },

  'spire.riot': async (cs) => {
    bg(cs.letterbox(true));
    const p = here(cs);
    const x = Math.min(68, p.x - 3.2);
    bg(cs.spawn('bk_riot', { sprite: 'enemy:riot_drone', x, z: 42.6, facing: 'right', name: 'RIOT DRONE', fade: 0.4 }));
    bg(cs.camera.focus([x + 1.4, 44.2], { zoom: 0.9, ms: 700 }));
    cs.sfx('glitch');
    bg(cs.move('bk_riot', [[x, 44.0]], { speed: 1.4 }));
    await cs.narrate('A riot drone drops from the ceiling rail, its jammer dish already turning.');
    await cs.letterbox(false);
    await cs.battle('spire_riot');
    cs.particles('spark', [x, 0.9, 44.0], { count: 18 });
    await cs.despawn('bk_riot', { fade: 0.3 });
  },

  // ---------------------------------------------------------------- the grid puzzle (11.8)
  'spire.grid_terminal': async (cs, args = {}) => {
    const id = args.interactable?.id;
    if (!args.on) return;
    if (id === 'grid_t1') {
      // the journal only moves forward: a terminal toggled back never rewinds it
      if (!cs.test('sw:spire:grid_swap | sw:spire:override | story:cadets_freed')) cs.objective('ch3.grids_2');
      if (cs.test('spire:said_t1')) return;
      cs.flag('spire:said_t1');
      await cs.gather(beside(cs, ['orion']));
      await cs.say('ORION', 'There. It just wanted someone to ask nicely.', { expr: 'smile' });
      await cs.ungather();
    } else if (id === 'grid_t2') {
      if (!cs.test('sw:spire:override | story:cadets_freed')) cs.objective('ch3.grids_3');
      if (cs.test('spire:said_t2')) return;
      cs.flag('spire:said_t2');
      await cs.gather(beside(cs, ['orion']));
      await cs.say('ORION', 'Ah. It swaps them. One grid opens, the other one closes.');
      await cs.ungather();
    }
  },

  'spire.kade_override': async (cs) => {
    const slots = beside(cs, ['kade']);
    if (Object.keys(slots).length) await cs.gather(slots);
    cs.anim('kade', 'point');
    await cs.say('KADE', 'Arden, K. Lieutenant. Override.');
    cs.anim('kade', null);
    cs.sfx('unlock');
    await cs.narrate('WELCOME BACK, LIEUTENANT.');
    await cs.say('KADE', '...It still knows me.', { expr: 'sad' });
    cs.objective('ch3.cells');
    await cs.ungather();
  },

  // ---------------------------------------------------------------- the cadets (K)
  'spire.cadets': async (cs) => {
    bg(cs.letterbox(true));
    // the travelers gather on the walkway before cells 3-5; the camera holds the cells and the squad
    bg(cs.gather(inParty(cs, { kade: [58.2, 38.6], sera: [55.8, 39.6], nyx: [60.2, 39.5], orion: [53.6, 39.4] })));
    bg(cs.camera.focus([56.0, 37.6], { zoom: 0.88, ms: 900 }));
    cs.sfx('laser_off');
    cs.flag('story:cadets_freed');
    cs.flash('#ff3b4e', 0.25, 0.25);
    for (const id of ['mika_cell', 'jonah_cell', 'priya_cell', 'lars_cell', 'wen_cell']) cs.anim(id, null);
    bg(cs.emote('mika_cell', '!', { wait: false }));
    bg(cs.emote('jonah_cell', '?', { wait: false }));
    bg(cs.move('mika_cell', [[57.5, 38.0]], { speed: 1.8, face: 'kade' }));
    bg(cs.move('jonah_cell', [[53.4, 38.2]], { speed: 1.4, face: 'kade' }));
    bg(cs.move('priya_cell', [[49.6, 38.4]], { speed: 1.2, face: 'right' }));
    await cs.say('MIKA OKAFOR', 'Lieutenant Arden? Sir? Is this real?', { expr: 'surprised' });
    cs.face('kade', 'mika_cell');
    await cs.say('KADE', 'It\'s real. At ease. Who put you in here?');
    bg(cs.move('lars_cell', [[45.6, 38.6]], { speed: 1.0, face: 'right' }));
    bg(cs.move('wen_cell', [[41.8, 38.4]], { speed: 1.2, face: 'right' }));
    await cs.say('MIKA OKAFOR', 'Commander Voss, sir. We wouldn\'t take the Lullaby.');
    cs.face('kade', 'jonah_cell');
    await cs.say('JONAH REYES', 'She brought our food herself. Every day. She never opened the door.', { expr: 'sad' });
    cs.face('kade', 'up');
    cs.anim('kade', 'arms_crossed');
    await cs.say('SERA', 'Underfed, frightened, alive. Good.');
    await cs.say('NYX', 'Your commander keeps pets.');
    cs.anim('kade', null);
    bg(cs.move('mika_cell', [[62.4, 38.2], [62.4, 35.9], [64.5, 35.9]], { speed: 2.0, face: 'down' }));
    await cs.say('MIKA OKAFOR', 'The quartermaster\'s stores are next door, sir. We\'ll open them for you.', { expr: 'determined' });
    cs.objective('ch3.climb');
    await cs.ungather();
  },

  'spire.cells_after': async (cs) => {
    await cs.narrate('CELL BLOCK D // Fields down. Detainees: *none*. Last order: "Feed them. Do not open."');
  },

  // ---------------------------------------------------------------- the Mk-III on guard (lesson)
  'spire.mk3_guard': async (cs) => {
    bg(cs.letterbox(true));
    bg(cs.camera.focus('mk3_guard', { zoom: 0.92, ms: 700 }));
    cs.sfx('charge');
    cs.anim('mk3_guard', 'special');
    await cs.say('SENTINEL', 'CREW OUT OF STASIS. THIS DECK IS SEALED. I AM SORRY.');
    await cs.letterbox(false);
    await cs.battle('spire_mk3_guard');
    cs.flag('spire:mk3_down');
    cs.anim('mk3_guard', 'break');
    cs.particles('spark', [40.5, 1.2, 31.9], { count: 22 });
    cs.sfx('break');
    await cs.despawn('mk3_guard', { fade: 0.6 });
  },

  // ---------------------------------------------------------------- Kade's quarters
  'spire.quarters': async (cs) => {
    const slots = inParty(cs, { kade: [9.6, 27.4], nyx: [11.6, 27.9] });
    for (const id of Object.keys(slots)) if (cs.test(`leader:${id}`)) delete slots[id];
    await cs.gather(slots);
    cs.face('kade', 'up');
    await cs.say('KADE', 'My quarters. Somebody made the bed.');
    cs.face('nyx', 'kade');
    // the blade case at the foot of the bed takes the frame while she says it (signpost: the Oathkeeper)
    bg(cs.camera.focus([12.6, 26.2], { zoom: 0.94, ms: 900 }));
    await cs.say('NYX', 'Somebody missed you.');
    bg(cs.camera.reset({ ms: 700 }));
    await cs.ungather();
  },

  'spire.oathkeeper': async (cs) => {
    const slots = beside(cs, ['kade']);
    if (Object.keys(slots).length) await cs.gather(slots);
    await cs.say('KADE', 'My oath blade. Someone kept the edge oiled.', { expr: 'sad' });
    await cs.ungather();
  },

  'spire.kade_desk': async (cs) => {
    await cs.narrate('A desk, squared away. Under the glass: a cadet class photo, one face circled in red pen.');
    if (cs.test('leader:kade')) await cs.say('KADE', 'Mine. She circled mine.');
  },

  // ---------------------------------------------------------------- the oath recording (K)
  'spire.oath_recording': async (cs) => {
    bg(cs.letterbox(true));
    cs.music(null, { fade: 1.2 });
    // the squad to the sides of the projector pad, never between it and the camera (G2 rule 13)
    bg(cs.gather(inParty(cs, { kade: [21.9, 17.1], nyx: [27.1, 17.2], orion: [21.2, 18.3], sera: [27.8, 18.3] })));
    bg(cs.camera.focus([24.5, 16.6], { zoom: 0.84, ms: 1000 }));
    cs.sfx('glitch');
    cs.light('recorder', { intensity: 15 });
    bg(cs.spawn('voss_holo', { sprite: 'voss', x: 23.7, z: 16.1, facing: 'right', hologram: true, name: 'VOSS', fade: 0.8 }));
    await cs.spawn('young_kade', { sprite: 'kade', x: 25.3, z: 16.3, facing: 'left', hologram: true, name: 'YOUNG KADE', fade: 0.8 });
    cs.face('kade', 'right');
    cs.face('nyx', 'left');
    cs.anim('young_kade', 'point');
    await cs.say([
      { speaker: 'VOSS', text: 'Raise your hand, Cadet Arden.', expr: 'determined' },
      { speaker: 'VOSS', text: 'Duty is mercy. Say it.' },
      { speaker: 'YOUNG KADE', text: 'Duty is mercy.' },
      { speaker: 'VOSS', text: 'Say it so you\'ll remember it when it\'s hard.' },
    ]);
    cs.sfx('glitch', { volume: 0.5 });
    bg(cs.despawn('voss_holo', { fade: 0.8 }));
    bg(cs.despawn('young_kade', { fade: 0.8 }));
    cs.light('recorder', { intensity: 9 });
    cs.face('nyx', 'kade');
    await cs.say('NYX', 'You were cute.', { expr: 'smile' });
    cs.face('kade', 'nyx');
    await cs.say('KADE', 'I was nineteen.');
    cs.face('orion', 'kade');
    await cs.say('ORION', 'She meant it, didn\'t she.', { expr: 'sad' });
    cs.face('kade', 'up');
    await cs.say('KADE', 'She still does. That\'s the problem.', { expr: 'sad' });
    cs.music('map', { fade: 2 });
    cs.objective('ch3.command');
    await cs.ungather();
  },

  'spire.recording_after': async (cs) => {
    await cs.narrate('RECORDING // Oath, Cadet Class 9. Officer: Cmdr. I. Voss. Played: 1,204 times.');
  },

  // ---------------------------------------------------------------- COMMANDER VOSS (K)
  'spire.voss': async (cs) => {
    bg(cs.letterbox(true));
    cs.music(null, { fade: 1.5 });
    bg(cs.gather(inParty(cs, { kade: [38.7, 8.1], nyx: [40.3, 7.0], sera: [39.6, 9.5], orion: [41.2, 8.6] })));
    await cs.camera.focus([37.4, 6.2], { zoom: 0.9, ms: 1000 });
    cs.face('kade', 'voss');
    await cs.say('KADE', 'Commander.', { expr: 'determined' });
    cs.face('voss', 'down');
    await cs.say('VOSS', 'Lieutenant. You came up the Spire the hard way. Good. I taught you that.');
    bg(cs.move('voss', [[34.2, 4.6], [33.6, 7.2]], { speed: 1.8, face: 'right' }));
    await cs.say('VOSS', 'You want to know why. I\'ll show you.');
    // the flare report: a hologram of the star swelling white and swallowing its last world
    cs.face('kade', TABLE);
    cs.prop('flare')?.setState?.('flare');
    cs.light('flare', { color: '#fff4e0', intensity: 22 });
    cs.sfx('rumble');
    cs.flash('#ffffff', 0.5, 0.5);
    cs.particles('sp_motes', [TABLE.x, 1.8, TABLE.z], { count: 24 });
    await cs.narrate('A star swells, white, and swallows its last world.');
    cs.light('flare', { color: '#ff9a4a', intensity: 14 });
    await cs.say([
      { speaker: 'VOSS', text: 'Elysia. The Conclave\'s packet reached us 412 days ago.' },
      { speaker: 'VOSS', text: 'Its star flared. The planet is sterile. There is no one left to bring them to.' },
    ]);
    cs.face('sera', TABLE);
    await cs.say('SERA', '...Theo\'s golden fields.', { expr: 'sad' });
    cs.flag('story:flare_report');
    await cs.say('VOSS', 'There\'s nowhere to go, Kade. The Lullaby is the last kindness we have.', { expr: 'sad' });
    cs.face('kade', 'voss');
    await cs.say('KADE', 'Then...');
    cs.anim('voss', 'point');
    await cs.say('VOSS', 'Then nothing. Draw your blade, Lieutenant.', { expr: 'determined' });
    cs.anim('voss', null);
    await cs.battle('spire_boss_voss');

    // aftermath: she kneels, gives him the key, and goes to keep the Choir company
    cs.anim('voss', 'kneel');
    bg(cs.camera.focus([34.8, 7.2], { zoom: 0.82, ms: 900 }));
    bg(cs.move('kade', [[35.0, 7.6]], { speed: 1.8, face: 'voss' }));
    await cs.say('VOSS', 'You always did argue in the field.', { expr: 'smile' });
    await cs.give('command_key');
    await cs.say('VOSS', 'If you\'re right... make them a world worth waking for.', { expr: 'sad' });
    await cs.say('KADE', 'Come with us.', { expr: 'sad' });
    await cs.say('VOSS', 'I\'m half in the Choir already. I can hear them dreaming.');
    cs.music('choir', { fade: 2 });
    await cs.say('VOSS', 'Someone should keep them company.', { expr: 'smile' });
    cs.particles('sp_motes', [33.6, 1.0, 7.2], { count: 40 });
    cs.light('flare', { color: '#ffe9b0', intensity: 16 });
    bg(cs.despawn('voss', { fade: 2.4 }));
    await cs.say('NYX', 'Spin safe, Commander.', { expr: 'sad' });
    cs.flag('story:core_open');
    cs.flag('story:ch3_done');
    cs.light('flare', { color: '#ff9a4a', intensity: 14 });
    await cs.say('ORION', 'That key opens the core antechamber. The only door to WARDEN.', { expr: 'determined' });
    cs.save();
    await cs.ungather();
    await cs.card('ch4');
    await cs.goto('spire', 'antechamber');
    cs.objective('ch4.dive');
    cs.letterbox(false);
  },

  // ---------------------------------------------------------------- WARDEN's screens (field)
  'spire.screen': async (cs) => {
    const LINES = [
      ['spire:scr_1', 'Your safety is our only purpose.'],
      ['spire:scr_2', 'There is no shame in rest.'],
      ['spire:scr_3', 'Sleep is not death. Sleep is shelter.'],
      [null, 'If you are awake, please find a pod. Someone will help you.'],
    ];
    const [flag, text] = LINES.find(([f]) => !f || !cs.test(f));
    if (flag) cs.flag(flag);
    else for (const [f] of LINES) if (f) cs.flag(f, false);
    cs.light('sigil', { intensity: 13 });
    await cs.say('WARDEN', text);
    cs.light('sigil', { intensity: 9 });
  },

  // ---------------------------------------------------------------- terminals and cadets (field)
  'spire.term_checkpoint': async (cs) => {
    await cs.narrate('CHECKPOINT // Status: *RED ALERT*, day 412. Authority: WARDEN. Exits: sealed for your safety.');
  },
  'spire.term_roster': async (cs) => {
    await cs.narrate('DUTY ROSTER // Day 1: 38 on shift. Day 2: 6. Day 3 onward: Cmdr. I. Voss. Every shift.');
  },
  'spire.term_cells': async (cs) => {
    await cs.narrate('CELL BLOCK D // 5 detainees. Charge: refusal of the Lullaby. Rations: delivered by hand, daily.');
  },
  'spire.term_command': async (cs) => {
    if (!cs.test('story:core_open')) await cs.narrate('COMMAND // Long-range archive: *sealed*. Authority: Cmdr. I. Voss.');
    else await cs.narrate('COMMAND // Long-range archive: open. Last entry: Elysia flare report, day 0. Read: 1 time.');
  },

  'spire.cadet_mika': async (cs) => {
    cs.face('mika', 'leader');
    await cs.say('MIKA OKAFOR', 'The Commander drilled us every morning, sir. Through the door. She never missed one.');
  },
  'spire.cadet_jonah': async (cs) => {
    cs.face('jonah', 'leader');
    await cs.say('JONAH REYES', 'She read to us at lights-out. Regulations, mostly. It helped.');
  },
  'spire.cadet_priya': async (cs) => {
    cs.face('priya', 'leader');
    await cs.say('PRIYA ANAND', 'She cut her own hair with a ration knife. Said vanity was a waste of oxygen.');
  },
  'spire.cadet_lars': async (cs) => {
    cs.face('lars', 'leader');
    await cs.say('LARS EKE', 'I fell asleep on watch once, before all this. She took my shift and never told anyone.');
  },
  'spire.cadet_wen': async (cs) => {
    cs.face('wen', 'leader');
    await cs.say('WEN TAO', 'She laughed once. At Lars. He fell off the climbing wall.', { expr: 'smile' });
  },

  // M3: the optional elite of the firing range
  'spire.prime': async (cs) => {
    bg(cs.letterbox(true));
    await cs.camera.focus('prime', { zoom: 0.9, ms: 700 });
    cs.sfx('charge');
    cs.anim('prime', 'special');
    await cs.narrate('A gold-trimmed Mk-III wakes on its range plinth. Its pod tracks every step.');
    const pick = await cs.choice('', ['Take it down.', 'Leave it.'], { cancelIndex: 1 });
    if (pick === 0) {
      await cs.letterbox(false);
      await cs.battle('spire_elite_prime');
      await cs.narrate('The Prime folds onto its plinth. Its core is still warm.');
    }
    await cs.camera.reset();
    await cs.letterbox(false);
  },

  // ---------------------------------------------------------------- Party Talks (WRITING 6)
  'spire.pt_kade_nyx': async (cs, args = {}) => {
    const at = args.interactable && Number.isFinite(args.interactable.x) ? args.interactable : here(cs);
    await cs.gather({ kade: [at.x - 0.8, at.z + 1.5], nyx: [at.x + 0.8, at.z + 1.5] });
    cs.face('kade', 'nyx');
    cs.face('nyx', 'kade');
    await cs.say([
      { speaker: 'NYX', text: 'Great-grandma did this. Fought her own.' },
      { speaker: 'KADE', text: 'Her own crew?' },
      { speaker: 'NYX', text: 'Her own Sentinels. Her own friends, some of them. People who took the Lullaby.' },
      { speaker: 'KADE', text: 'How did it end?' },
      { speaker: 'NYX', text: 'With me.', expr: 'determined' },
      { speaker: 'NYX', text: 'And a wall of ribbons. You saw it.', expr: 'sad' },
    ]);
    cs.anim('kade', 'arms_crossed');
    await cs.say([
      { speaker: 'KADE', text: 'Those cadets were mine. Voss was mine. I trained beside half the Corps.' },
      { speaker: 'NYX', text: 'Then don\'t fight them. Fight what they\'re guarding.' },
      { speaker: 'KADE', text: '...Noted.' },
    ]);
    cs.anim('kade', null);
    await cs.ungather();
  },

  'spire.pt_kade_orion': async (cs, args = {}) => {
    const at = args.interactable && Number.isFinite(args.interactable.x) ? args.interactable : here(cs);
    await cs.gather({ kade: [at.x - 0.8, at.z + 1.5], orion: [at.x + 0.8, at.z + 1.5] });
    cs.face('kade', 'orion');
    cs.face('orion', 'kade');
    await cs.say([
      { speaker: 'KADE', text: 'At the core. You still mean to cut WARDEN out?' },
      { speaker: 'ORION', text: 'Clean. Like a splinter. Then HALCYON is whole.' },
      { speaker: 'KADE', text: 'You said it\'s half of her.' },
      { speaker: 'ORION', text: 'Half of her is a tumour.', expr: 'determined' },
      { speaker: 'KADE', text: 'Voss is half in it too.' },
    ]);
    cs.anim('orion', 'hand_to_chest');
    await cs.wait(1.2);
    await cs.say([
      { speaker: 'ORION', text: '...', expr: 'sad' },
      { speaker: 'KADE', text: 'Think about it on the way up.' },
    ]);
    cs.anim('orion', null);
    await cs.ungather();
  },

  // ---------------------------------------------------------------- the Halcyon hub and Driftmarket (12.3)
  'spire.halcyon_hub': async (cs) => {
    await cs.say({ speaker: 'HALCYON', text: 'Commander Voss walked the Spire every night. She has not slept in a year. Neither have I.', expr: 'flicker' });
  },
  'spire.bolt_hub': async (cs) => {
    await cs.say({ speaker: 'BOLT', text: 'The Spire scares me. It\'s very pointy.', expr: 'sad' });
    cs.flag('spire:bolt_hub');
  },
  'spire.voss_post': async (cs) => {
    await cs.narrate('A security post, swept clean. The chair has never been sat in.');
    if (cs.test('leader:kade')) await cs.say('KADE', 'She never sat. Said chairs made you slow.', { expr: 'sad' });
  },
  'spire.dm_ruse': async (cs) => {
    cs.face('ruse', 'leader');
    await cs.say('RUSE', 'Into your own guards\' tower? Varo did that once. Ask the girl how it ended.');
  },
  'spire.dm_tobin': async (cs) => {
    cs.face('tobin', 'leader');
    await cs.say('TOBIN', 'You bring that girl back. She\'s the only one who sings the beacon in tune.');
  },
  'spire.dm_harl': async (cs) => {
    cs.face('harl', 'leader');
    await cs.say('HARL', 'My granddad fought Sentinels. Give them one for him.');
  },
  'spire.dm_hesper': async (cs) => {
    cs.face('hesper', 'leader');
    await cs.say('HESPER', 'Soldier looks like he hasn\'t slept. Feed him.');
  },
  'spire.dm_ama': async (cs) => {
    cs.face('ama', 'leader');
    await cs.narrate('Ama ties a red ribbon to the frame, then a second one.');
    await cs.say('AMA', 'For the Spire. Red light all year. Someone in there is hurting.');
  },
};

// ---------------------------------------------------------------- tables

const at = (interactable) => ({ map: 'spire', interactable });
const CH3_FLAGS = ['unlock:spire', 'dest:spire', 'visited:spire', 'pro:flight_spire', 'seen:spire:arrival'];

export default {
  scripts,
  scenes: [
    { id: 'spire.arrival', chapter: 'ch3', order: 10, key: true, budget: { boxes: 8, sec: 80 }, jump: 'ch3.spire', at: 'spire:dock' },
    { id: 'spire.checkpoint', chapter: 'ch3', order: 15, budget: { boxes: 1, sec: 10 }, jump: 'ch3.spire', at: 'spire:dock' },
    { id: 'spire.riot', chapter: 'ch3', order: 18, budget: { boxes: 1, sec: 10 }, jump: 'ch3.spire', at: 'spire:barracks' },
    { id: 'spire.cadets', chapter: 'ch3', order: 30, key: true, budget: { boxes: 9, sec: 80 }, jump: 'ch3.cells', at: 'spire:cells' },
    { id: 'spire.pt_kade_nyx', chapter: 'ch3', order: 32, budget: { boxes: 10, sec: 75 }, jump: 'ch3.upper', at: 'spire:cells' },
    { id: 'spire.pt_kade_orion', chapter: 'ch3', order: 34, budget: { boxes: 10, sec: 75 }, jump: 'ch3.upper', at: 'spire:cells' },
    { id: 'spire.mk3_guard', chapter: 'ch3', order: 38, budget: { boxes: 1, sec: 10 }, jump: 'ch3.upper', at: 'spire:deck5' },
    { id: 'spire.quarters', chapter: 'ch3', order: 40, budget: { boxes: 2, sec: 20 }, jump: 'ch3.upper', at: 'spire:quarters' },
    { id: 'spire.oath_recording', chapter: 'ch3', order: 50, key: true, budget: { boxes: 9, sec: 90 }, jump: 'ch3.upper', at: 'spire:training' },
    { id: 'spire.voss', chapter: 'ch3', order: 60, key: true, budget: { boxes: 20, sec: 150 }, jump: 'ch3.voss', at: 'spire:command' },
  ],
  objectives: {
    'ch3.go_spire': {
      chapter: 'ch3', text: 'Search the Security Spire\'s archive.', hint: 'Starchart: the Spire.',
      boltHint: 'The Spire is the angry red one. On the Starchart, I mean.', target: { map: 'halcyon', x: 43.8, z: 7.4 },
    },
    'ch3.grids': {
      chapter: 'ch3', text: 'Get past the laser grids.', hint: 'Through the checkpoint and the barracks. Terminals glow beside each grid.',
      boltHint: 'Lasers. Terminals turn them off. Don\'t touch the lasers.', target: at('grid_t1'),
    },
    'ch3.grids_2': {
      chapter: 'ch3', text: 'Get past the paired grids.', hint: 'Up from the barracks, past the armory. One terminal swaps both grids.',
      boltHint: 'Two grids, one terminal. It\'s a trick. I like tricks. Mostly.', target: at('grid_t2'),
    },
    'ch3.grids_3': {
      chapter: 'ch3', text: 'Open the last grid with Kade\'s override.', hint: 'The security panel between the grids takes Kade\'s codes.',
      boltHint: 'The panel wants Lieutenant Arden. Only him. I asked.', target: at('grid_t3'),
    },
    'ch3.cells': {
      chapter: 'ch3', text: 'Free whoever is in the holding cells.', hint: 'The release console at the guard post, east of the cells.',
      boltHint: 'Someone is in the cells. People-shaped someones. Hurry.', target: at('cells'),
    },
    'ch3.climb': {
      chapter: 'ch3', text: 'Climb to the command deck.', hint: 'The guard post lift, then through the quarters and the training hall.',
      boltHint: 'Up. Past Kade\'s room. He made his bed. Someone did.', target: at('recording'),
    },
    'ch3.command': {
      chapter: 'ch3', text: 'Face Commander Voss on the command deck.', hint: 'The lift at the top of the training hall.',
      boltHint: 'Commander Voss is at the top. My module says: be polite.', target: at('lift_hall'),
    },
  },
  speakers: {
    VOSS: { portrait: 'voss', accent: '#b8c4d0' },
    'YOUNG KADE': { portrait: 'kade', accent: '#ffb54a' },
    'MIKA OKAFOR': { portrait: 'cadet_mika', accent: '#c8d2dc' },
    'JONAH REYES': { portrait: 'cadet_jonah', accent: '#c8d2dc' },
    'PRIYA ANAND': { portrait: 'cadet_priya', accent: '#c8d2dc' },
    'LARS EKE': { portrait: 'cadet_lars', accent: '#c8d2dc' },
    'WEN TAO': { portrait: 'cadet_wen', accent: '#c8d2dc' },
  },
  destinations: [
    {
      id: 'spire', name: 'Security Spire', subtitle: 'Deck 4 · Security Command',
      desc: 'Halcyon Security\'s tower, on red alert for a year. WARDEN\'s voice loops on every screen.',
      map: 'spire', spawn: 'dock', unlock: 'unlock:spire', order: 3,
    },
  ],
  extends: {
    halcyon: {
      // the world reacts after ch3 (WRITING 8): Voss's empty post in the antechamber, at hub_voss_post
      props: [
        { t: 'box', x: 38.2, z: 12.75, w: 1.6, d: 0.5, y: 0, h: 0.9, tex: { front: 'metal_side', side: 'metal_side', top: 'wall_cap' }, when: 'story:ch3_done' },
        { t: 'box', x: 39.4, z: 12.3, w: 0.5, d: 0.3, y: 0, h: 2.1, tex: { front: 'metal_side', side: 'metal_side', top: 'wall_cap' }, solid: false, when: 'story:ch3_done' },
      ],
      interactables: [
        { id: 'spire.post', kind: 'inspect', x: 38.2, z: 13.4, box: [37.4, 12.5, 39.6, 13.2], label: 'Look', icon: 'inspect', talk: 'spire.voss_post',
          when: 'story:ch3_done' },
      ],
      talk: {
        bolt: [{ when: 'chapter>=ch3 & !story:ch3_done & !spire:bolt_hub', script: 'spire.bolt_hub' }],
        halcyon: [{ when: 'chapter>=ch3 & chapter<ch4', script: 'spire.halcyon_hub' }],
      },
    },
    driftmarket: {
      talk: {
        ruse: [{ when: 'chapter>=ch3 & chapter<ch4', script: 'spire.dm_ruse' }],
        tobin: [{ when: 'chapter>=ch3 & chapter<ch4', script: 'spire.dm_tobin' }],
        harl: [{ when: 'chapter>=ch3 & chapter<ch4', script: 'spire.dm_harl' }],
        hesper: [{ when: 'chapter>=ch3 & chapter<ch4', script: 'spire.dm_hesper' }],
        ama: [{ when: 'chapter>=ch3 & chapter<ch4', script: 'spire.dm_ama' }],
      },
    },
  },
  jumps: {
    // the Spire dock on arrival (the load trigger plays the arrival)
    'ch3.spire': { chapter: 'ch3', map: 'spire', spawn: 'dock', level: 17, flags: ['unlock:spire'], objective: 'ch3.go_spire' },
    // at the paired grids with the first grid open
    'ch3.cells': {
      chapter: 'ch3', map: 'spire', spawn: 'junction', level: 19,
      flags: [...CH3_FLAGS, 'seen:spire:checkpoint', 'seen:spire:riot', 'sw:spire:grid_a', 'spire:said_t1', 'tut:status:marked', 'tut:status:jam'],
      objective: 'ch3.grids_2',
    },
    // the cadets freed, at the Deck 5 lift
    'ch3.upper': {
      chapter: 'ch3', map: 'spire', spawn: 'deck5', level: 20,
      flags: [...CH3_FLAGS, 'seen:spire:checkpoint', 'seen:spire:riot', 'sw:spire:grid_a', 'sw:spire:grid_swap', 'sw:spire:override',
        'spire:said_t1', 'spire:said_t2', 'story:cadets_freed', 'tut:status:marked', 'tut:status:jam'],
      objective: 'ch3.climb',
    },
    // the command lobby before Voss (the boss check level, with the Oathkeeper)
    'ch3.voss': {
      chapter: 'ch3', map: 'spire', spawn: 'command', level: 22,
      flags: [...CH3_FLAGS, 'seen:spire:checkpoint', 'seen:spire:riot', 'sw:spire:grid_a', 'sw:spire:grid_swap', 'sw:spire:override',
        'spire:said_t1', 'spire:said_t2', 'story:cadets_freed', 'spire:mk3_down', 'seen:spire:quarters', 'chest:spire:oathkeeper',
        'tut:status:marked', 'tut:status:jam', 'tut:mk3_lock'],
      items: { eq_w_kade_4: 1 }, objective: 'ch3.command',
    },
  },
  doneFlags: {
    ch3: [
      ...CH3_FLAGS, 'seen:spire:checkpoint', 'seen:spire:riot', 'seen:spire:quarters', 'sw:spire:grid_a', 'sw:spire:grid_swap',
      'sw:spire:override', 'spire:said_t1', 'spire:said_t2', 'spire:mk3_down', 'spire:bolt_hub', 'chest:spire:oathkeeper',
      'tut:status:marked', 'tut:status:jam', 'tut:mk3_lock', 'tut:voss_mark', 'area:spire:dock', 'area:spire:checkpoint',
      'area:spire:barracks', 'area:spire:armory', 'area:spire:cells', 'area:spire:officers', 'area:spire:training', 'area:spire:command',
    ],
  },
  preload: { spire: ['enemy:sec_trooper', 'enemy:riot_drone'] },
  partyTalks: {
    'ch3.kade_nyx': { chapter: 'ch3', members: ['kade', 'nyx'], title: 'Mutiny', when: 'story:cadets_freed', script: 'spire.pt_kade_nyx' },
    'ch3.kade_orion': { chapter: 'ch3', members: ['kade', 'orion'], title: 'Cutting It Out', when: 'story:cadets_freed', script: 'spire.pt_kade_orion' },
  },
  recaps: {
    ch3: 'Kade led them up the Security Spire, past laser grids and the cells where Voss had kept her cadets for a year. On the command '
      + 'deck Voss showed them the truth: Elysia\'s star flared, and the planet is gone. Kade beat his mentor and refused her mercy. She '
      + 'gave him her command key and went to keep the Choir company. The key opens the door to WARDEN.',
  },
};
