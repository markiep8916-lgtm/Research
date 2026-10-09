// heart: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5; lines per WRITING.md 5.7, 6,
// 7, 9).
//
// The finale's ascent, in play order (the Starchart's `before` is C8's dreams.night_before, the
// flight is the prologue's travel.flight):
//   heart.arrival        heart · load on the Moth's pier (key): the cathedral, WARDEN's apology, up
//   dreams.kade          (C8) the causeway onto the first ring
//   heart.pylon          every pylon (switch script): a narration line on first use, the step objective
//   heart.wardens        the Choir Guardian and a seraph hold the first lift (the cradle-rings lesson)
//   heart.warden_tier    the Second and Third Tiers' lift arrivals: one line of WARDEN each
//   dreams.nyx           (C8) the Second Tier's east arc
//   heart.echoes_t2      the Choirlit Echoes of the Rings and the Garden (elite fight, the lift pad)
//   dreams.orion         (C8) the Third Tier's east arc
//   heart.echoes_t3      the Choirlit Echoes of the Spire and the Vault (elite fight, the processional)
//   dreams.sera          (C8) the processional
//   heart.crown_lift     the crown lift: "Beyond this point there is no way back.", then the ride
//   dreams.crown         (C8) the Crown: WARDEN, the battle, the resolution, the EPILOGUE card
// Field scripts: the column, chest lines, Nyx's cache (leader-gated), the Bellwarden (M3), two Party
// Talks (fin.kade_orion, fin.nyx_sera) and Driftmarket's finale lines.
//
// Staging (WRITING 1.8, G2): walks, emotes, light changes and camera moves run under the lines (bg());
// camera moves take about a second; no wait padding. Scripts never assume who leads: every traveler
// who speaks is gathered (members already standing in place are not moved). WARDEN speaks only where
// sigil screens are in frame (G2 rule 14), over the Heart's gold light.
// Objectives: fin.go_heart (binding, the vault's card) -> fin.ascend -> fin.t1_lift -> fin.t2 ->
// fin.t2_lift -> fin.t3 -> fin.t3_one_a / fin.t3_one_b -> fin.crown -> (C8's crown: epi.wake).
// Local flags: heart:wardens_down, heart:echoes_t2_down, heart:echoes_t3_down, heart:bell_down,
// heart:cache, heart:said_t1 .. heart:said_t3.

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

/** Where a talk or an interactable is: the one that started the script, else the leader. */
function spot(cs, args = {}) {
  const n = args.npc || args.interactable || args.boss || args.chest;
  if (n && Number.isFinite(n.x)) return { x: n.x, z: n.z };
  return here(cs);
}

/** Members other than the leader step out beside it (south of it, facing the camera's way). */
function beside(cs, ids, { dz = 0.5 } = {}) {
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

/** Objectives owned by later chapters are set once their owner has registered them. */
const objective = (cs, id, known) => cs.objective(known ? id : null);

const TIER_LINES = {
  warden_t2: 'Higher. You are so tired. Higher still.',
  warden_t3: 'Every step you take, I am sorry for.',
};

const scripts = {
  // ---------------------------------------------------------------- arrival (K)
  'heart.arrival': async (cs) => {
    bg(cs.letterbox(true));
    // a load elsewhere (a jump, a Continue) still opens on the pier
    const p = here(cs);
    if (p.x > 11.5 || p.z < 35 || p.z > 51) await cs.goto('heart', 'dock', { transition: 'none' });
    cs.music('heart', { fade: 0.8 });
    // the establishing tilt: straight down at the pier and the abyss, then up the cathedral
    await cs.camera.view({ pitch: 66, dist: 12, ms: 1 });
    bg(cs.camera.focus([9.5, 42.5], { ms: 1 }));
    const gather = bg(cs.gather(inParty(cs, { kade: [7.0, 42.2], nyx: [5.6, 41.4], sera: [6.0, 44.6], orion: [4.6, 43.4] })));
    cs.particles('hr_motes', [13.0, 1.4, 42.5], { count: 50 });
    const tilt = bg(cs.camera.view({ pitch: 38, dist: 19, ms: 2600 }));
    bg(cs.camera.focus([12.5, 42.0], { ms: 2600 }));
    await cs.say('WARDEN', 'You came all this way.');
    await gather;
    await tilt;
    await cs.say('WARDEN', 'I am so sorry. I cannot let you take them.');
    cs.face('kade', 'right');
    await cs.say('KADE', 'We\'re not taking them. We\'re waking them.', { expr: 'determined' });
    cs.anim('sera', 'look_up');
    bg(cs.camera.view({ pitch: 44, dist: 16, ms: 1000 }));
    await cs.say('SERA', 'Thousands. It\'s holding thousands.', { expr: 'sad' });
    cs.anim('sera', null);
    await cs.say([
      { speaker: 'NYX', text: 'Big place for a lullaby.' },
      { speaker: 'ORION', text: 'Up. The crown is at the top. That\'s where it lives.', expr: 'determined' },
    ]);
    if (cs.actor('bolt')) {
      bg(cs.emote('bolt', 'sweat', { wait: false }));
      await cs.say({ speaker: 'BOLT', text: 'Going up is my least favourite direction.', expr: 'worried' });
    }
    cs.objective('fin.ascend');
    await cs.ungather();
  },

  // ---------------------------------------------------------------- the pylons (switch scripts, 11.8)
  'heart.pylon': async (cs, args = {}) => {
    const id = args.interactable && args.interactable.id;
    if (!args.on) return;
    if (id === 'pylon_t1' && !cs.test('heart:said_t1')) {
      cs.flag('heart:said_t1');
      await cs.narrate('The pylon warms under the hand. Light runs out across the shaft.');
      cs.objective('fin.t1_lift');
    } else if (id === 'pylon_t2' && !cs.test('heart:said_t2')) {
      cs.flag('heart:said_t2');
      await cs.narrate('Far across the tier, a bridge of light reaches out to the lift.');
      cs.objective('fin.t2_lift');
    } else if ((id === 'pylon_t3a' || id === 'pylon_t3b') && !cs.test('heart:said_t3')) {
      const both = cs.test('sw:heart:t3a') && cs.test('sw:heart:t3b');
      if (both) {
        cs.flag('heart:said_t3');
        await cs.narrate('Both pylons sing. The processional fills with light.');
        cs.objective('fin.crown');
      } else {
        await cs.narrate('One pylon lit. The processional stays dark.');
        cs.objective(cs.test('sw:heart:t3a') ? 'fin.t3_one_b' : 'fin.t3_one_a');
      }
    }
  },

  // ---------------------------------------------------------------- the Choir's Wardens (the first lift)
  'heart.wardens': async (cs) => {
    bg(cs.emote('wardens', '!', { wait: false }));
    bg(cs.camera.focus('wardens', { zoom: 0.92, ms: 800 }));
    cs.sfx('choir', { volume: 0.7 });
    if (cs.test('party:orion')) {
      await cs.gather(beside(cs, ['orion']));
      await cs.say('ORION', 'Those aren\'t Sentinels. They\'re part of the song. Sorry, friends.', { expr: 'determined' });
    }
    await cs.battle('heart_wardens');
    cs.flag('heart:wardens_down');
    cs.particles('hr_motes', [28.0, 1.2, 35.5], { count: 40 });
    await cs.ungather();
  },

  // ---------------------------------------------------------------- WARDEN at the lift arrivals
  'heart.warden_tier': async (cs, args = {}) => {
    const id = (args.trigger && args.trigger.id) || 'warden_t2';
    cs.sfx('choir', { volume: 0.6 });
    const p = here(cs);
    cs.particles('hr_motes', [p.x, 1.6, p.z - 1.0], { count: 30 });
    await cs.say('WARDEN', TIER_LINES[id] || TIER_LINES.warden_t2);
  },

  // ---------------------------------------------------------------- the Choirlit Echoes (elite fights)
  'heart.echoes_t2': async (cs) => {
    bg(cs.letterbox(true));
    bg(cs.camera.focus('echoes_t2', { zoom: 0.9, ms: 900 }));
    cs.sfx('choir', { volume: 0.8 });
    await cs.gather(beside(cs, ['nyx', 'orion']));
    await cs.say([
      { speaker: 'NYX', text: 'A rime golem. From the Shoals. Since when are they gold?', expr: 'surprised' },
      { speaker: 'ORION', text: 'Since it remembered them. It\'s singing us our own fights.', expr: 'sad' },
    ]);
    await cs.battle('heart_elite_rings');
    cs.flag('heart:echoes_t2_down');
    cs.particles('hr_motes', [46.0, 1.4, 47.4], { count: 50 });
    await cs.ungather();
  },

  'heart.echoes_t3': async (cs) => {
    bg(cs.letterbox(true));
    bg(cs.camera.focus('echoes_t3', { zoom: 0.9, ms: 900 }));
    cs.sfx('choir', { volume: 0.8 });
    await cs.gather(beside(cs, ['kade', 'sera']));
    await cs.say([
      { speaker: 'KADE', text: 'A Spire trooper. And the Vault\'s firewall.', expr: 'determined' },
      { speaker: 'SERA', text: 'It\'s showing us everything we\'ve beaten.' },
      { speaker: 'KADE', text: 'Then it knows how this ends.' },
    ]);
    await cs.battle('heart_elite_spire');
    cs.flag('heart:echoes_t3_down');
    cs.particles('hr_motes', [47.0, 1.4, 16.0], { count: 50 });
    await cs.ungather();
  },

  // ---------------------------------------------------------------- M3: the Bellwarden (optional elite)
  'heart.bellwarden': async (cs) => {
    bg(cs.camera.focus('bellwarden', { zoom: 0.92, ms: 800 }));
    await cs.narrate('A great bell hangs in the guardian\'s chest. It has not rung in 412 days.');
    await cs.battle('heart_elite_bell');
    cs.flag('heart:bell_down');
  },

  // ---------------------------------------------------------------- the crown lift (no way back)
  'heart.crown_lift': async (cs) => {
    const pick = await cs.choice('Beyond this point there is no way back.', ['Ride to the crown.', 'Not yet.'], { cancelIndex: 1 });
    if (pick !== 0) return;
    bg(cs.letterbox(true));
    cs.sfx('lift');
    const p = here(cs);
    cs.particles('light_stream', [p.x, 4, p.z], { count: 30 });
    cs.particles('hr_fall', [p.x, 5, p.z], { count: 30 });
    await cs.camera.view({ pitch: 62, dist: 21, ms: 1100 });
    cs.music(null, { fade: 1.2 });
    await cs.goto('heart', 'crown', { transition: 'fade' });
    cs.particles('light_stream', [17.6, 4, 22.6], { count: 24 });
    await cs.camera.reset({ ms: 900 });
  },
  'heart.crown_wait': async (cs) => {
    await cs.narrate('The crown lift is dark. Something below still waits for you.');
  },

  // ---------------------------------------------------------------- field scripts
  'heart.column': async (cs) => {
    await cs.narrate('A column of gold light falls the length of the shaft and never lands.');
    await cs.narrate('Pods hang along it in rings, all the way down. Each one is lit. Each one is somebody.');
  },

  'heart.nyx_cache': async (cs) => {
    if (cs.test('heart:cache')) {
      await cs.narrate('Empty, except for a red ribbon tied round the latch.');
      return;
    }
    cs.flag('heart:cache');
    cs.sfx('unlock');
    await cs.say('NYX', 'Lock\'s ship-made. Lock-picker\'s ring-made. Guess who wins.', { expr: 'smile' });
    await cs.give('revive_plus', 2);
    await cs.give('ether_plus', 2);
  },

  'heart.chest_dawnspear': async (cs, args = {}) => {
    if (!cs.test('party:sera')) return;
    await cs.gather(beside(cs, ['sera']));
    await cs.say('SERA', 'A lance that hums like an alarm clock. I approve.', { expr: 'smile' });
    await cs.ungather();
  },
  'heart.chest_mantle': async (cs) => {
    if (!cs.test('party:orion')) return;
    await cs.gather(beside(cs, ['orion']));
    await cs.say('ORION', 'Woven from the Choir\'s light. It\'s warm. It shouldn\'t be.', { expr: 'surprised' });
    await cs.ungather();
  },

  // ---------------------------------------------------------------- Party Talks (WRITING 6)
  'heart.pt_kade_orion': async (cs, args = {}) => {
    const at = spot(cs, args);
    await cs.gather(inParty(cs, { kade: [at.x - 0.8, at.z + 1.5], orion: [at.x + 0.8, at.z + 1.5] }));
    cs.face('kade', 'orion');
    cs.face('orion', 'kade');
    await cs.say([
      { speaker: 'ORION', text: 'You went quiet after the dream.' },
      { speaker: 'KADE', text: 'She said she was proud of me. She never said that. Not once.', expr: 'sad' },
      { speaker: 'ORION', text: 'And after? No WARDEN. No Commander. Nobody to report to.' },
      { speaker: 'KADE', text: 'I\'ve never not had orders.' },
      { speaker: 'ORION', text: 'Then make some. For yourself.', expr: 'smile' },
      { speaker: 'KADE', text: '...Noted. You first.' },
      { speaker: 'ORION', text: 'I\'m going to teach her to paint.', expr: 'smile' },
      { speaker: 'KADE', text: 'HALCYON?' },
      { speaker: 'ORION', text: 'She\'s watched Tethys for 412 days. She should have something to show for it.' },
      { speaker: 'KADE', text: 'Copy. Paint first. Then the rest.', expr: 'smile' },
    ]);
    await cs.ungather();
  },

  'heart.pt_nyx_sera': async (cs, args = {}) => {
    const at = spot(cs, args);
    await cs.gather(inParty(cs, { nyx: [at.x - 0.8, at.z + 1.5], sera: [at.x + 0.8, at.z + 1.5] }));
    cs.face('nyx', 'sera');
    cs.face('sera', 'nyx');
    await cs.say([
      { speaker: 'NYX', text: 'Ione\'s cold. Just so you know. Ruse says the ice sings.' },
      { speaker: 'SERA', text: 'Theo will want to see everything. Twice.', expr: 'smile' },
      { speaker: 'NYX', text: 'Kid\'s never seen a sky that isn\'t a window.' },
      { speaker: 'SERA', text: 'He\'ll draw it on the walls. On you, if you stand still.' },
      { speaker: 'NYX', text: 'I\'ll show him the Moth. If he\'s nice to me.' },
      { speaker: 'SERA', text: 'He won\'t be. He\'s twelve.' },
      { speaker: 'NYX', text: '...Then I\'ll show him anyway.', expr: 'smile' },
    ]);
    await cs.ungather();
  },

  // ---------------------------------------------------------------- Driftmarket, the finale (WRITING 7)
  'heart.dm_ruse': async (cs) => {
    cs.face('ruse', 'leader');
    await cs.say('RUSE', 'Your ship answered the beacon. Took her long enough.');
    await cs.say('RUSE', 'Come back owing me.');
  },
  'heart.dm_tobin': async (cs) => {
    cs.face('tobin', 'leader');
    await cs.say('TOBIN', 'Your ship sang back. Just a bar. I cried like a kid.');
  },
  'heart.dm_pip': async (cs) => {
    cs.face('pip', 'leader');
    await cs.say('PIP', 'Hold out your hand. That\'s a ribbon. For luck. Don\'t lose it.');
  },
  'heart.dm_rook': async (cs) => {
    cs.face('rook', 'leader');
    await cs.say('ROOK', 'Go quiet up there. Listen before you fight.');
  },
  'heart.dm_oona': async (cs) => {
    cs.face('oona', 'leader');
    await cs.say('OONA', 'When you\'re done, we fly you home. Every skiff we have.');
  },
};

// ---------------------------------------------------------------- objectives (WRITING 9.3: the Journal
// follows each step of the climb)

const objectives = {
  'fin.go_heart': {
    chapter: 'finale', text: 'Fly to the Heart.', hint: 'Starchart: the Heart. The way back closes at the crown.',
    boltHint: 'The Heart is the middle of everything. We should rest first.',
  },
  'fin.ascend': {
    chapter: 'finale', text: 'Climb the Heart.', hint: 'A pylon at the north end of the west arc lights the bridge across the shaft.',
    boltHint: 'Up. Then up again. The pylon first. It\'s the bright one.', target: { map: 'heart', interactable: 'pylon_t1' },
  },
  'fin.t1_lift': {
    chapter: 'finale', text: 'Ride the lift to the Second Tier.', hint: 'Across the bridge, then north-east to the lift pad.',
    boltHint: 'The lift is past the bridge. Something big is standing by it. Sorry.', target: { map: 'heart', interactable: 'lift_t1' },
  },
  'fin.t2': {
    chapter: 'finale', text: 'Cross the Second Tier.', hint: 'Over the north bridge to the pylon on the west arc.',
    boltHint: 'North bridge, then the pylon. I counted the steps. I lost count.', target: { map: 'heart', interactable: 'pylon_t2' },
  },
  'fin.t2_lift': {
    chapter: 'finale', text: 'Ride the lift to the Third Tier.', hint: 'The new bridge at the south end of the west arc.',
    boltHint: 'The bridge it made goes to the lift. South end. Please hurry.', target: { map: 'heart', interactable: 'lift_t2' },
  },
  'fin.t3': {
    chapter: 'finale', text: 'Light both pylons of the Third Tier.', hint: 'Two pylons on the south arc open the processional west.',
    boltHint: 'Two pylons, both on. Like a handshake. A very bright handshake.', target: { map: 'heart', interactable: 'pylon_t3a' },
  },
  'fin.t3_one_a': {
    chapter: 'finale', text: 'Light the other pylon.', hint: 'The east one, on the south arc.',
    boltHint: 'One more pylon. The east one. I believe in you. Mostly.', target: { map: 'heart', interactable: 'pylon_t3a' },
  },
  'fin.t3_one_b': {
    chapter: 'finale', text: 'Light the other pylon.', hint: 'The west one, on the south arc.',
    boltHint: 'One more pylon. The west one. Then the long bridge.', target: { map: 'heart', interactable: 'pylon_t3b' },
  },
  'fin.crown': {
    chapter: 'finale', text: 'Reach the crown.', hint: 'The crown lift, past the Sanctum. Rest there first.',
    boltHint: 'The crown. Where it sings from. I\'ll be right behind you.', target: { map: 'heart', interactable: 'crown_lift' },
  },
};

// ---------------------------------------------------------------- tables

const NIGHT = ['dream:night_before', 'dest:heart', 'visited:heart'];
const T1 = [...NIGHT, 'seen:heart:arrival', 'story:dream_kade', 'seen:heart:dream_kade', 'sw:heart:t1', 'heart:said_t1',
  'heart:wardens_down', 'chest:heart:dawnspear', 'tut:cradle'];
const T2 = [...T1, 'seen:heart:warden_t2', 'story:dream_nyx', 'seen:heart:dream_nyx', 'sw:heart:t2', 'heart:said_t2',
  'heart:echoes_t2_down', 'chest:heart:mantle'];
const T3 = [...T2, 'seen:heart:warden_t3', 'story:dream_orion', 'seen:heart:dream_orion', 'sw:heart:t3a', 'sw:heart:t3b',
  'heart:said_t3', 'heart:echoes_t3_down'];

export default {
  scripts,
  // play order inside the finale (C8: night_before 5, the dreams 30-60, the crown 80)
  scenes: [
    { id: 'heart.arrival', chapter: 'finale', order: 20, key: true, budget: { boxes: 8, sec: 80 }, jump: 'fin.heart', at: 'heart:dock' },
    { id: 'heart.wardens', chapter: 'finale', order: 32, budget: { boxes: 1, sec: 10 } },
    { id: 'heart.pt_kade_orion', chapter: 'finale', order: 34, budget: { boxes: 10, sec: 75 }, jump: 'fin.tier2', at: 'heart:t2_west' },
    { id: 'heart.warden_tier', chapter: 'finale', order: 38, budget: { boxes: 1, sec: 8 }, jump: 'fin.tier2', at: 'heart:tier2' },
    { id: 'heart.echoes_t2', chapter: 'finale', order: 44, budget: { boxes: 2, sec: 20 } },
    { id: 'heart.pt_nyx_sera', chapter: 'finale', order: 46, budget: { boxes: 8, sec: 60 }, jump: 'fin.tier2', at: 'heart:t2_west' },
    { id: 'heart.echoes_t3', chapter: 'finale', order: 54, budget: { boxes: 3, sec: 25 } },
    { id: 'heart.crown_lift', chapter: 'finale', order: 70, budget: { boxes: 1, sec: 10 }, jump: 'fin.crown', at: 'heart:sanctum' },
  ],
  objectives,
  destinations: [
    {
      id: 'heart', name: 'The Heart', subtitle: 'ISV Halcyon · Core', order: 4,
      desc: 'The centre of the ship, where WARDEN holds the helm and the Choir.',
      map: 'heart', spawn: 'dock', unlock: 'unlock:heart', visible: '!story:finale_done',
      before: 'dreams.night_before', warn: 'The way back closes at the crown.',
    },
  ],
  extends: {
    driftmarket: {
      talk: {
        ruse: [{ when: 'chapter>=finale & chapter<epilogue', script: 'heart.dm_ruse' }],
        tobin: [{ when: 'chapter>=finale & chapter<epilogue', script: 'heart.dm_tobin' }],
        pip: [{ when: 'chapter>=finale & chapter<epilogue', script: 'heart.dm_pip' }],
        rook: [{ when: 'chapter>=finale & chapter<epilogue', script: 'heart.dm_rook' }],
        oona: [{ when: 'chapter>=finale & chapter<epilogue', script: 'heart.dm_oona' }],
      },
    },
  },
  jumps: {
    // on the Moth's pier, the night behind them (the load trigger plays the arrival)
    'fin.heart': { chapter: 'finale', map: 'heart', spawn: 'dock', level: 27, objective: 'fin.go_heart', flags: NIGHT },
    // the Second Tier's lift arrival, Kade's dream behind them
    'fin.tier2': {
      chapter: 'finale', map: 'heart', spawn: 'tier2', level: 28, objective: 'fin.t2', flags: T1,
      items: { eq_w_sera_4: 1, eq_x_keepsake_kade: 1 },
    },
    // the Third Tier's lift arrival
    'fin.tier3': {
      chapter: 'finale', map: 'heart', spawn: 'tier3', level: 30, objective: 'fin.t3', flags: T2,
      items: { eq_w_sera_4: 1, eq_a_5: 1, eq_x_keepsake_kade: 1, eq_x_keepsake_nyx: 1 },
    },
    // the Sanctum, every dream behind them: the last rest, the crown lift ahead
    'fin.crown': {
      chapter: 'finale', map: 'heart', spawn: 'sanctum', level: 31, objective: 'fin.crown',
      flags: [...T3, 'story:dream_sera', 'seen:heart:dream_sera'],
      items: { eq_w_sera_4: 1, eq_a_5: 1, eq_x_keepsake_kade: 1, eq_x_keepsake_nyx: 1, eq_x_keepsake_orion: 1, eq_x_keepsake_sera: 1 },
    },
  },
  doneFlags: {
    finale: [...T3, 'story:dream_sera', 'seen:heart:dream_sera', 'chest:heart:mantle', 'seen:heart:crown'],
  },
  partyTalks: {
    'fin.kade_orion': { chapter: 'finale', members: ['kade', 'orion'], title: 'After', when: 'story:dream_kade', script: 'heart.pt_kade_orion' },
    'fin.nyx_sera': { chapter: 'finale', members: ['nyx', 'sera'], title: 'Shore Leave', when: 'story:dream_kade', script: 'heart.pt_nyx_sera' },
  },
};
