// Chapter table (PURE, TECH_PLAN 4.1): order, chapter cards, where each chapter starts, and the
// binding beats every completed chapter guarantees. Importing this module hands the chapter order
// to the condition language (world/cond.js), so 'chapter>=ch2' terms work everywhere.
//
// export const CHAPTERS          [{ id, kicker, title, traveler, levels: [start, end] }] in play order
// export const CHAPTER_IDS       ids in play order
// export const CHAPTER_START     { [chapterId]: { map, spawn, party: [ids] | 'all', objective } }
// export const CHAPTER_FLAGS     { [chapterId]: [flag] } guaranteed once that chapter is complete
// export const PARTY_ALL         ['kade', 'sera', 'orion', 'nyx'] (join order = default formation)
// export function chapterIndex(id) -> number (-1 when unknown)
// export function chapterDef(id) -> CHAPTERS entry | null
// export function startParty(id) -> member ids of CHAPTER_START[id].party ('all' expanded)
// export function flagsBefore(id) -> CHAPTER_FLAGS of every chapter before `id`, in order

import { setChapterOrder } from '../world/cond.js';

export const CHAPTERS = [
  { id: 'prologue', kicker: 'PROLOGUE', title: 'WAKING', traveler: null, levels: [1, 7] },
  { id: 'ch1', kicker: 'CHAPTER ONE', title: 'RINGBORN', traveler: 'nyx', levels: [7, 12] },
  { id: 'ch2', kicker: 'CHAPTER TWO', title: 'THE CHOIR', traveler: 'sera', levels: [12, 17] },
  { id: 'ch3', kicker: 'CHAPTER THREE', title: 'THE OATH', traveler: 'kade', levels: [17, 22] },
  { id: 'ch4', kicker: 'CHAPTER FOUR', title: 'ECHOES', traveler: 'orion', levels: [22, 27] },
  { id: 'finale', kicker: 'FINAL CHAPTER', title: 'VOIDPATH', traveler: null, levels: [27, 32] },
  { id: 'epilogue', kicker: 'EPILOGUE', title: 'IONE', traveler: null, levels: [32, 32] },
];

export const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

export const PARTY_ALL = ['kade', 'sera', 'orion', 'nyx'];

export const CHAPTER_START = {
  prologue: { map: 'halcyon', spawn: 'start', party: ['kade'], objective: 'pro.wake' },
  ch1: { map: 'halcyon', spawn: 'bridge_starchart', party: 'all', objective: 'ch1.go_driftmarket' },
  ch2: { map: 'halcyon', spawn: 'bridge_starchart', party: 'all', objective: 'ch2.go_arboretum' },
  ch3: { map: 'halcyon', spawn: 'bridge_starchart', party: 'all', objective: 'ch3.go_spire' },
  ch4: { map: 'spire', spawn: 'antechamber', party: 'all', objective: 'ch4.dive' },
  finale: { map: 'halcyon', spawn: 'bridge_starchart', party: 'all', objective: 'fin.go_heart' },
  epilogue: { map: 'halcyon', spawn: 'cryo', party: 'all', objective: 'epi.wake' },
};

export const CHAPTER_FLAGS = {
  prologue: ['story:kade_awake', 'story:sera_joined', 'story:orion_joined', 'story:nyx_joined',
    'story:bridge_unlocked', 'defeated:pro_boss_sentinel', 'story:halcyon_fragment',
    'unlock:driftmarket', 'story:prologue_done'],
  ch1: ['story:ruse_met', 'story:maw_lore', 'story:varo_log', 'story:meridian_power',
    'defeated:shoals_boss_maw', 'ult:nyx', 'story:ringborn_seeding', 'story:nyx_for_real',
    'story:coil_installed', 'story:warden_speaks', 'unlock:arboretum', 'story:ch1_done'],
  ch2: ['story:channels_drained', 'defeated:arb_boss_gardener', 'ult:sera', 'story:theo_found',
    'unlock:spire', 'story:ch2_done'],
  ch3: ['story:cadets_freed', 'defeated:spire_boss_voss', 'ult:kade', 'story:flare_report',
    'story:core_open', 'story:ch3_done'],
  ch4: ['story:memory_launch', 'story:memory_lullaby', 'story:memory_severance', 'story:bolt_seed',
    'defeated:vault_boss_echo', 'ult:orion', 'story:halcyon_restored', 'story:ione_revealed',
    'unlock:heart', 'story:ch4_done'],
  finale: ['story:dream_kade', 'story:dream_nyx', 'story:dream_orion', 'story:dream_sera',
    'defeated:heart_boss_warden', 'story:warden_merged', 'story:finale_done'],
  epilogue: ['story:revival_authorized', 'story:game_clear', 'unlock:ione'],
};

setChapterOrder(CHAPTER_IDS);

export function chapterIndex(id) {
  return CHAPTER_IDS.indexOf(id);
}

export function chapterDef(id) {
  return CHAPTERS.find((c) => c.id === id) || null;
}

export function startParty(id) {
  const party = CHAPTER_START[id]?.party;
  if (party === 'all') return [...PARTY_ALL];
  return Array.isArray(party) ? [...party] : [];
}

export function flagsBefore(id) {
  const i = chapterIndex(id);
  if (i < 0) return [];
  return CHAPTER_IDS.slice(0, i).flatMap((c) => CHAPTER_FLAGS[c]);
}
