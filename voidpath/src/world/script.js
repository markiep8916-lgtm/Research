// Field dialog: NPC lines, terminal logs and one-liners. Plain data; explore.js plays them.
// Lines follow ui.dialog.show(): { speaker, text, portrait } objects, *emphasis* in amber.

const bolt = (text) => ({ speaker: 'BOLT', text, portrait: 'bolt' });
const holo = (text) => ({ speaker: 'HALCYON', text, portrait: 'holo' });
const log = (text) => ({ speaker: null, text });

export const BOLT_INTRO = [
  bolt('Vitals green! Good morning, Commander KADE. You were in stasis for *412 days*. Mostly on purpose.'),
  { speaker: 'KADE', text: 'Status report, BOLT. Why is the ship this quiet?' },
  bolt('The defence grid went rogue while you slept. Sec-Drones patrol the *Spine Corridor* and something big has sealed the bridge.'),
  bolt('Uploading combat protocols! Every hostile unit wears a *shield*. Hit its *weaknesses* (a weapon or an element) to crack it. Unknown ones show as *?*.'),
  bolt('Empty the shield and the target is *BROKEN*: it loses its turn and takes *double damage*.'),
  bolt('You also bank a *Boost Point* every round. Spend up to three to strike again and again, or to amplify a skill.'),
  { speaker: 'NYX', text: 'Break it, then Boost it. Got it, tin can.' },
  bolt('Precisely! The *Med-Station* restores the squad and logs a checkpoint. The Bridge Keycard was last scanned in *Engineering*.'),
];

export const BOLT_REPEAT = [
  [bolt('Remember: find the *weakness*, *Break* the shield, then *Boost*. In that order. Please.')],
  [bolt('The Bridge Keycard should be in an *Engineering* supply crate. South off the Spine Corridor.')],
  [bolt('I would come with you, but my threat-assessment module says *no*. Loudly.')],
];

export const BOLT_KEYCARD = [
  bolt('You found the keycard! The bridge is at the *east end* of the Spine Corridor. Rest at the antechamber Med-Station first!'),
];

export const HALCYON_INTRO = [
  holo('Command crew detected. I am *HALCYON*, the mind of this ship. What is left of it.'),
  holo('The *SENTINEL* was built to guard this bridge. Its directives are corrupted, and it will not let you pass.'),
  holo('Its armour adapts: after every *Break* it recovers with a stronger shield. Break it, then strike with everything you have.'),
  { speaker: 'ORION', text: 'Then we shut it down. Gently, if possible.' },
];

export const HALCYON_AFTER = [
  holo('The Sentinel is offline. Thank you, Commander. Helm control is yours again.'),
  holo('Plotting a course away from the gas giant. For the first time in 412 days... we are *moving*.'),
];

export const SENTINEL_CONFRONT = [
  { speaker: null, text: 'The SENTINEL turns. Its optics flare *red*.' },
  { speaker: 'SENTINEL', text: 'INTRUDERS ON THE COMMAND DECK. PURGE PROTOCOL ENGAGED.' },
  { speaker: 'KADE', text: 'Squad, weapons free!' },
];

export const DOOR_LOCKED = [
  log('The bridge door is sealed tight. A red panel blinks: *COMMAND KEYCARD REQUIRED*.'),
];

export const KEYCARD_FOUND = [
  { speaker: 'KADE', text: 'The *Bridge Keycard*. Let\'s go see who locked us out.' },
];

export const TERMINALS = {
  term_cryo: [
    log('STASIS LOG // Pod 07 (KADE): revival *successful*.'),
    log('Pods 01-06, 08-14: revival deferred. Reason: *[DATA CORRUPTED]*.'),
  ],
  term_nav: [
    log('NAV LOG // Orbit around *Thessaly IV* decaying 0.02% per cycle.'),
    log('Recommend manual course correction from the *Observation Bridge*.'),
  ],
  term_window: [
    log('MAINTENANCE // Window 9 pressure seal replaced.'),
    log('Crew note: *best view on the ship*, don\'t let anyone tell you otherwise.'),
  ],
  term_reactor: [
    log('REACTOR CORE // Output 61%. Coolant loop B venting into the bay.'),
    log('Containment field: *stable*. Mostly. Do not lick the conduits.'),
  ],
  term_security: [
    log('SECURITY // Bridge sealed by HALCYON under protocol *SENTINEL*.'),
    log('Override requires a command keycard. Last check-out: Chief Engineer Osei, *Engineering* supply cache.'),
  ],
  term_helm: [
    log('HELM // Station locked. Awaiting authorised command crew.'),
  ],
  term_aft: [
    log('SENSORS // Ring debris density rising. Hull microfractures: *3*. Acceptable.'),
    log('Unidentified signal on the far side of Thessaly IV. Source: *unknown*. Repeating.'),
  ],
  term_captain: [
    log('CAPTAIN\'S LOG, final entry: *If anyone wakes up: HALCYON is not the enemy.*'),
    log('*The Sentinel is.*'),
  ],
};

export const MED_PROMPT = 'Restore the squad and log a checkpoint?';
