// Story state facade (TECH_PLAN 4.1, PURE): chapter, objective, flags, completed scripts and the
// journal, over gameState.story / flags / played and the registered content (REG). Every change
// notifies the onChange listeners: ExploreState re-syncs the world and checks its flag triggers,
// the pause menu refreshes the journal. UI side effects (the objective toast, a toast per learned
// skill) go through the ctx handed to bind(); without one (node tests, scriptcheck) they are skipped.
//
// export const story = {
//   bind(ctx)                       extra: main.js hands in ctx (ctx.ui for toasts)
//   chapter, objective              getters
//   test(cond) -> bool              condition language (world/cond.js) over gameState
//   flag(name) -> bool
//   set(name, value = true)         false / null deletes the flag; grants flag-gated skills
//                                   (progression.learnFromFlags) with a toast each; notifies
//   setChapter(id); setObjective(id)   setObjective marks the previous objective done, toasts the new one
//   complete(objectiveId)           extra: marks an objective done (side objectives, favours)
//   played(scriptId) -> bool        completed at least once (gameState.played)
//   markPlayed(ids)                 extra: the cutscene runner records completed scripts
//   journal()                       { chapter, objective, side, done, recaps, chapters } (4.1)
//   partyTalks() -> [{ id, ...PartyTalk }]   extra: the Party Talks available right now (4.5)
//   onChange(fn) -> unsubscribe     fn({ type: 'flag' | 'chapter' | 'objective' | 'played' | 'arrive', ... })
//   notify(change)                  extra: travel announces arrivals ({ type: 'arrive', map, kind, load, scene })
// };
//
// Side objectives (ObjectiveDef.side) show in the journal from their chapter on while not done; an
// optional ObjectiveDef.when (extra field) gates them further.

import { gameState } from '../core/state.js';
import { learnFromFlags } from '../core/progression.js';
import { SKILLS } from '../battle/data.js';
import { testCond } from '../world/cond.js';
import { CHAPTERS, chapterIndex, chapterDef } from '../content/chapters.js';
import { REG } from '../content/registry.js';

const listeners = new Set();
let ctx = null;

function emit(change) {
  for (const fn of [...listeners]) fn(change);
}

function members() {
  return gameState.roster ? Object.values(gameState.roster) : gameState.party;
}

function objectiveEntry(id) {
  const def = id && REG.objectives[id];
  return def ? { id, text: def.text, hint: def.hint || '' } : null;
}

export const story = {
  bind(c) {
    ctx = c;
    return this;
  },

  get chapter() { return gameState.story.chapter; },
  get objective() { return gameState.story.objective; },

  test(cond) {
    return testCond(cond, gameState);
  },

  flag(name) {
    return !!gameState.flags[name];
  },

  set(name, value = true) {
    const flags = gameState.flags;
    const on = value !== false && value != null;
    if (on ? flags[name] === value : !(name in flags)) return;
    if (on) flags[name] = value;
    else delete flags[name];
    if (on) {
      for (const m of members()) {
        for (const id of learnFromFlags(m, flags) || []) {
          ctx?.ui.hud.toast(`${m.name} learned *${SKILLS[id]?.name || id}*`, { icon: 'ultimate' });
        }
      }
    }
    emit({ type: 'flag', name, value: on ? value : null });
  },

  setChapter(id) {
    if (chapterIndex(id) < 0) {
      console.error(`story: unknown chapter "${id}"`);
      return;
    }
    if (gameState.story.chapter === id) return;
    gameState.story.chapter = id;
    emit({ type: 'chapter', name: id });
  },

  setObjective(id) {
    const st = gameState.story;
    if (st.objective === id) return;
    if (st.objective && !st.done.includes(st.objective)) st.done.push(st.objective);
    st.objective = id || null;
    if (id) {
      const def = REG.objectives[id];
      if (def) ctx?.ui.hud.objectiveToast(def.text);
      else console.error(`story: unknown objective "${id}"`);
    }
    emit({ type: 'objective', name: st.objective });
  },

  complete(id) {
    const st = gameState.story;
    if (st.done.includes(id)) return;
    st.done.push(id);
    if (st.objective === id) st.objective = null;
    emit({ type: 'objective', name: st.objective });
  },

  played(scriptId) {
    return (gameState.played || []).includes(scriptId);
  },

  markPlayed(ids) {
    const list = gameState.played;
    let added = false;
    for (const id of ids) {
      if (typeof id !== 'string' || list.includes(id)) continue;
      list.push(id);
      added = true;
    }
    if (added) emit({ type: 'played' });
  },

  journal() {
    const st = gameState.story;
    const ci = chapterIndex(st.chapter);
    const done = new Set(st.done);
    const side = [];
    for (const [id, def] of Object.entries(REG.objectives)) {
      if (!def.side || done.has(id) || chapterIndex(def.chapter) > ci || !testCond(def.when, gameState)) continue;
      side.push({ id, text: def.text, hint: def.hint || '' });
    }
    return {
      chapter: chapterDef(st.chapter),
      objective: objectiveEntry(st.objective),
      side,
      done: st.done.filter((id) => REG.objectives[id]?.chapter === st.chapter).map((id) => ({ id, text: REG.objectives[id].text })),
      recaps: CHAPTERS.slice(0, Math.max(0, ci)).filter((c) => REG.recaps[c.id])
        .map((c) => ({ chapter: c.id, title: c.title, text: REG.recaps[c.id] })),
      chapters: CHAPTERS.map((c, i) => ({
        id: c.id, kicker: c.kicker, title: c.title, state: i < ci ? 'done' : i === ci ? 'current' : 'locked',
      })),
    };
  },

  partyTalks() {
    const inParty = new Set(gameState.party.map((m) => m.id));
    const out = [];
    for (const [id, t] of Object.entries(REG.partyTalks)) {
      if (t.chapter !== gameState.story.chapter || gameState.flags[`ptalk:${id}`]) continue;
      if (!(t.members || []).every((m) => inParty.has(m)) || !testCond(t.when, gameState)) continue;
      out.push({ id, ...t });
    }
    return out;
  },

  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  notify(change) {
    emit(change);
  },
};
