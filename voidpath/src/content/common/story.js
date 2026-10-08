// common: shared story tables (PURE, TECH_PLAN 2.4, 4.5, 7.7, 8.5; WRITING.md 2.8, 5.1, 9.1, 9.2,
// 9.5). Every location may rely on these:
//
//   speakers    KADE, NYX, ORION, SERA (party portraits), BOLT, HALCYON, WARDEN (gold sigil, slow
//               text, choir sfx, the 'warden' mood: soft-gold grade and sigil screens while it speaks)
//   companions  bolt: follows from story:kade_awake on every map with companions (moth, exterior and
//               dreams excluded by being transit / scene maps); a script parks him with
//               cs.flag('story:bolt_away') and brings him back with cs.flag('story:bolt_away', false)
//   scripts     common.bolt_talk     BOLT says the current objective's boltHint (eye variant by
//                                    mood), else his line for the current chapter
//               common.leader_hint   args { member, interactable }: one narration box naming the
//                                    traveler who can use it; an interactable may carry `leaderHint`
//                                    (its own text, with the name emphasised) to replace the default
//   tips        every global battle tip of TECH_PLAN 7.7 (encounter tips belong to their encounter)
//
// Hub lines for BOLT on the Halcyon go in extends.halcyon.talk.bolt (they come before this
// companion talk); the companion talk itself stays the fallback.

import { gameState } from '../../core/state.js';
import { REG } from '../registry.js';

// BOLT's line per chapter when the current objective has no boltHint (WRITING.md 9.2)
const BOLT_FALLBACK = {
  prologue: 'I don\'t know where we\'re going. But I know where we\'ve been. That\'s half.',
  ch1: 'Driftmarket smells like soup and rust. I don\'t have a nose. I just know.',
  ch2: 'Theo is somewhere green. Green is good. Mostly.',
  ch3: 'The Spire is up. Everything about the Spire is up.',
  ch4: 'HALCYON\'s mind is very big. I feel small. I am small. It\'s fine.',
  finale: 'My threat-assessment module stopped answering. I think it\'s scared too.',
  epilogue: 'Nothing to do. I\'ve never had nothing to do. I\'m practising.',
};

// the eye BOLT makes for a hint: worried for warnings, determined for orders, happy otherwise.
// Scripts name the shared expressions (sad, smile); BOLT's aliases draw them as worried and happy, so
// the prewarm never pairs a BOLT-only eye with another speaker's portrait.
function boltEye(text) {
  if (/sorry|careful|never good|rest first|be quiet|scared|insist/i.test(text)) return 'sad';
  if (/\b(go|up|turn|pull|follow)\b/i.test(text)) return 'determined';
  return 'smile';
}

const LEADER_HINT = {
  kade: 'A security lock. *Kade\'s* override could open it.',
  nyx: 'A stubborn lock. *Nyx* could crack it.',
  orion: 'A sulking machine. *Orion* could talk it round.',
  sera: 'Someone is hurt here. *Sera* could help.',
};

const scripts = {
  'common.bolt_talk': async (cs) => {
    const story = gameState.story || {};
    const hint = REG.objectives[story.objective]?.boltHint;
    const text = hint || BOLT_FALLBACK[story.chapter] || BOLT_FALLBACK.prologue;
    await cs.say('BOLT', text, { expr: hint ? boltEye(text) : 'smile' });
  },

  'common.leader_hint': async (cs, args = {}) => {
    const member = args.member || 'kade';
    const own = args.interactable && args.interactable.leaderHint;
    await cs.narrate(own || LEADER_HINT[member] || `*${String(member).toUpperCase()}* could handle this.`);
  },
};

const line = (speaker, text) => ({ speaker, text });

// Global tips (TECH_PLAN 7.7, WRITING.md 9.1): at most 3 boxes, one instruction per box.
const tips = {
  reveal: { lines: [line('BOLT', 'A *weakness*! Hits of that type crack the shield. I\'ll remember it for next time.')] },
  break: { lines: [line('BOLT', '*BROKEN*! It skips its turns and takes double damage. Now hit it with everything.')] },
  bp3: {
    lines: [
      line('BOLT', 'Three *Boost Points*! Boost before you act: more hits, stronger skills.'),
      line('BOLT', 'Boost on a *Broken* foe. That\'s the whole trick. Mostly.'),
    ],
  },
  telegraph: { lines: [line('KADE', 'It\'s charging. Next round, it fires. *Defend*, or Break it first.')] },
  untargetable: { lines: [line('NYX', 'Eel\'s under. Can\'t hit what isn\'t there. *Defend*, heal, wait for it.')] },
  'status:sleep': { lines: [line('SERA', 'Spores. A sleeper loses turns. A *Stim* wakes them. So does a hit. I prefer the Stim.')] },
  summon: { lines: [line('ORION', 'It\'s calling little friends. Silence the caller first, or we\'ll be here all day.')] },
  'status:marked': { lines: [line('KADE', 'They\'ve *marked* one of us. Every gun follows the mark. *Provoke* pulls it to me.')] },
  'status:jam': { lines: [line('ORION', 'Our skills are *jammed*. Basic attacks still work. A Stim clears the static.')] },
  weakShift: { lines: [line('NYX', 'It shuffled its weak points. After every Break. Check the plates again.')] },
  ultimateReady: { lines: [line('BOLT', 'An *ultimate* is ready! It costs 3 BP. Once per battle. Save it for a Break.')] },
  learn: { lines: [line('BOLT', 'New skill learned! It\'s in the skill list. I checked twice.')] },
};

export default {
  scripts,
  speakers: {
    KADE: { portrait: 'kade', accent: '#ffb54a' },
    NYX: { portrait: 'nyx', accent: '#3fd6d2' },
    ORION: { portrait: 'orion', accent: '#b98cff' },
    SERA: { portrait: 'sera', accent: '#ff7cbd' },
    BOLT: { portrait: 'bolt', accent: '#7fe3ff' },
    HALCYON: { portrait: 'holo', accent: '#6fe9ff' },
    WARDEN: { sigil: 'warden_sigil', accent: '#ffd27a', textSpeed: 0.6, sfx: 'choir', mood: 'warden' },
  },
  companions: {
    bolt: { sprite: 'bolt', name: 'BOLT', talk: 'common.bolt_talk', follow: 'story:kade_awake & !story:bolt_away' },
  },
  tips,
};
