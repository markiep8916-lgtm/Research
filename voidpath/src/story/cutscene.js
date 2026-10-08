// Cutscene runner (TECH_PLAN 4.2, 4.3): runs story scripts `async (cs, args) => {}` against the
// field. There is no queue: run() is the one top-level entry (triggers, talk, interactables, game
// flows) and nested work (cs.run, flights, shops, the Starchart) runs inside the current script,
// so an outer script can never wait on something queued behind itself.
//
// export class CutsceneRunner {
//   constructor(ctx)
//   run(scriptIdOrFn, args) -> Promise<script return value>   rejects (with console.error) while a
//                             script is active; an AbortError or a script error resolves undefined
//   get active(); get depth()
//   abortAll()                game over, Retry, Load, Title and New Journey: pending cs calls reject
//                             with an AbortError (swallowed), no seen:/ptalk: flags, queued saves dropped,
//                             locks, letterbox, menu, fxOverride, exemptions and dialogs released
//   fast                      debug.skip: dialog auto-advances, waits x0.05, walks x6, tweens instant
//   update()                  extra, every frame before ui.update: hold-to-skip, flight skip, leader stand-in
//   rethrow(err)              extra: how script errors surface after cleanup (default: thrown async)
//   queue(kind) -> bool       extra: 'checkpoint' | 'save' queued until the outermost script ends
//                             (false when no script runs: the caller applies it now)
//   touched                   extra: Set of actor ids the running script touched (exempt from `when`, 3.8)
//   choices                   extra: debug answers for the next cs.choice calls
//   autoSkip                  extra: script id that runs in instant mode up to its first cs.battle (Retry)
//   skippable(fn, ready)      extra: travel's flight; Confirm switches it to instant once ready()
//   get instant()             extra: the running script is in instant (player skip) mode
// }
// export class AbortError
//
// While the outermost script runs: explore lock 'cutscene', ui.menuEnabled false, prompt and danger
// gauge hidden, input context 'dialog'. When it ends normally: seen:/ptalk: flags, gameState.played,
// queued checkpoint and save at the leader's position (game.flushQueue), camera follow, letterbox off,
// fxOverride cleared, a cs.scene leader restored, touched actors released (World.syncFlags), music
// restored if the script changed it, locks released.
//
// The leader is a Player, not an NpcActor: when a script moves, poses or addresses the leader as an
// actor, a stand-in NpcActor (id '__leader') with the leader's sprite takes its place and the hidden
// Player follows it, so the camera and tilt-shift keep tracking; the Player comes back at the end.
// Party members who are not leading step out of the leader as NpcActors ('party:<id>').

import { gameState, addItem, removeItem, healParty, joinParty, leaveParty, setLeader as setStateLeader } from '../core/state.js';
import { shopStock } from '../core/shop.js';
import { ITEMS, ENCOUNTERS } from '../battle/data.js';
import { makeRng, injectCSS } from '../core/util.js';
import { REG } from '../content/registry.js';
import { chapterDef } from '../content/chapters.js';
import { story } from './story.js';
import { travel } from './travel.js';

export class AbortError extends Error {
  constructor() {
    super('cutscene aborted');
    this.name = 'AbortError';
  }
}

const isAbort = (e) => !!e && e.name === 'AbortError';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

const PARTY_SPEAKERS = { KADE: 'kade', NYX: 'nyx', ORION: 'orion', SERA: 'sera' };
const LEADER_PROXY = '__leader';
const PARTY_ACTOR = 'party:';

// Speaker moods (ui.registerSpeaker mood): a look applied while that speaker's lines are shown.
const MOODS = {
  warden: {
    fx: {
      bloom: { strength: 1.2 },
      grade: { exposure: 1.1, saturation: 0.9, contrast: 1.04, shadowTint: [1.02, 0.96, 0.84], highlightTint: [1.14, 1.02, 0.78], vignette: 0.56 },
    },
    screens: 'warden_sigil',
  },
};
// cs.memory: replayed memories in HALCYON's mind (cyan-violet grade, chromatic edge, scanlines)
const MEMORY_FX = {
  bloom: { strength: 1.25 },
  grade: {
    saturation: 0.8, contrast: 1.16, exposure: 1.08, aberration: 0.005, grain: 0.07, vignette: 0.64,
    shadowTint: [0.8, 0.7, 1.26], highlightTint: [0.78, 1.1, 1.2],
  },
};

const CSS = `
.vp-cs-fade { position: absolute; inset: 0; z-index: 25; pointer-events: none; opacity: 0; background: #000; }
.vp-cs-scan { position: absolute; inset: 0; z-index: 24; pointer-events: none; opacity: 0; transition: opacity .6s linear;
  background: repeating-linear-gradient(180deg, rgba(120,230,255,.1) 0 1px, transparent 1px 3px); mix-blend-mode: screen; }
.vp-cs-scan.is-on { opacity: 1; }
`;

function mergeFx(a, b) {
  if (!a) return b ? { ...b } : null;
  if (!b) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a[k]) ? { ...a[k], ...v } : v;
  return out;
}

class Session {
  constructor(id) {
    this.id = id;                 // outermost script id
    this.aborted = false;
    this.depth = 0;
    this.rejects = new Set();     // pending cs promises (abortAll rejects them)
    this.played = [];             // every completed script id (outermost and nested)
    this.flags = [];              // seen:/ptalk: flags, set when the outermost script completes
    this.queue = { checkpoint: false, save: false };
    this.gathered = new Map();    // memberId -> NpcActor stepped out of the leader
    this.proxy = null;            // NpcActor standing in for the leader
    this.leaderRestore = null;    // cs.scene: the leader to restore at the end
    this.musicChanged = false;
    this.fx = null;               // cs.fx / cs.memory override
    this.moodFx = null;           // speaker mood on top of it
    this.screens = null;          // cs.screens texture (and group)
    this.letterbox = false;
    this.faded = false;
    this.memory = false;
    this.instant = false;         // player skip: the rest of the script resolves at once
    this.autoInstant = false;     // instant only up to the first cs.battle (Retry)
    this.choosing = false;
  }
}

export class CutsceneRunner {
  constructor(ctx) {
    this.ctx = ctx;
    this.fast = false;
    this.choices = [];
    this.autoSkip = null;
    this.touched = new Set();
    this._session = null;
    this._hinted = false;
    this._skippable = null;
    this._fadeEl = null;
    this._scanEl = null;
    // script errors surface asynchronously (#vp-fatal) after the cleanup; tests replace this
    this.rethrow = (err) => setTimeout(() => { throw err; });
  }

  get active() { return !!this._session; }
  get depth() { return this._session ? this._session.depth : 0; }
  get instant() { return !!this._session?.instant; }
  /** Id of the outermost running script (null when none). */
  get current() { return this._session ? this._session.id : null; }

  // ------------------------------------------------------------------ entry points

  run(scriptIdOrFn, args = {}) {
    if (this._session) {
      const msg = 'cutscenes.run while a script is active: use cs.run';
      console.error(msg);
      return Promise.reject(new Error(msg));
    }
    const { fn, id, named } = this._script(scriptIdOrFn);
    if (!fn) return Promise.resolve(undefined);
    const s = new Session(id);
    this._session = s;
    this._begin(s);
    return this._exec(s, fn, id, args, named).then((value) => {
      if (this._session === s) this._end(s);
      return value;
    }, (err) => {
      if (this._session === s) this.abortAll();
      if (!isAbort(err)) {
        console.error(`cutscenes: script "${id}" failed:`, err);
        this.rethrow(err);
      }
      return undefined;
    });
  }

  abortAll() {
    const s = this._session;
    if (s) this._stop(s);
    else this.ctx.ui.dialog.clear();
    this._explore()?.unlockAll();
    this.ctx.ui.menuEnabled = true;
  }

  queue(kind) {
    const s = this._session;
    if (!s) return false;
    s.queue[kind] = true;
    return true;
  }

  /**
   * Run `fn(w)` (travel's flight) so that once ready() holds, Confirm switches the rest of it to
   * instant mode and wakes w.wake (the flight's minimum-time wait). Resolves true when skipped.
   */
  async skippable(fn, ready) {
    const outer = this._session;
    const prev = outer ? outer.instant : false;
    const w = { ready, skipped: false, wake: null };
    this._skippable = w;
    try {
      await fn(w);
    } finally {
      if (this._skippable === w) this._skippable = null;
      if (outer && this._session === outer) outer.instant = prev;
    }
    return w.skipped;
  }

  update() {
    const s = this._session;
    const { input, ui } = this.ctx;
    const w = this._skippable;
    if (w && !w.skipped && input.pressed('confirm') && w.ready()) {
      w.skipped = true;
      if (s) this._goInstant(s);
      w.wake?.();
    }
    const canSkip = !!s && !s.instant && story.played(s.id);
    input.setSkippable?.(canSkip);   // touch players hold the B button
    if (!s) return;
    if (s.proxy) this._followProxy(s);
    // hold Cancel for 1 s to skip the rest of a script the player has already completed
    const held = canSkip ? input.heldFor('cancel') : 0;
    if (held >= 0.4 && !this._hinted) {
      this._hinted = true;
      ui.hud.skipHint(true);
    }
    if (held >= 1) {
      this._resetHold();
      this._goInstant(s);
      this.ctx.audio.sfx('skip');
    } else if (held === 0) this._resetHold();
  }

  // ------------------------------------------------------------------ lifecycle

  /** { fn, id, named }: registered scripts by id; inline functions are run but never recorded as played. */
  _script(ref) {
    if (typeof ref === 'function') return { fn: ref, id: ref.name || 'inline', named: false };
    const fn = REG.scripts[ref];
    if (!fn) console.error(`cutscenes: unknown script "${ref}"`);
    return { fn, id: ref, named: true };
  }

  async _exec(s, fn, id, args, named) {
    const map = args.map ?? this._explore()?.mapId;
    s.depth++;
    try {
      const value = await fn(new Cs(this, s, id, args, named), args);
      if (s.aborted) throw new AbortError();
      if (named) s.played.push(id);
      if (args.trigger?.once) s.flags.push(`seen:${map}:${args.trigger.id}`);
      if (args.seen) s.flags.push(args.seen);
      if (args.ptalk) s.flags.push(`ptalk:${args.ptalk}`);
      return value;
    } finally {
      s.depth--;
    }
  }

  _begin(s) {
    const { ui, input } = this.ctx;
    this._explore()?.lock('cutscene');
    ui.menuEnabled = false;
    ui.hud.setPrompt(null);
    ui.hud.setDanger(0);
    input.setContext('dialog');
    if (this.autoSkip && this.autoSkip === s.id) {
      s.instant = true;
      s.autoInstant = true;
    }
    this.autoSkip = null;
  }

  _end(s) {
    this._session = null;
    this._dropProxy(s);   // the Player takes the stand-in's place before its position is saved
    for (const f of s.flags) story.set(f);
    story.markPlayed(s.played);
    this.ctx.game.flushQueue(s.queue, s.id);
    this._release(s, true);
  }

  /** Abort or error: reject every pending call and release everything; nothing is recorded. */
  _stop(s) {
    s.aborted = true;
    if (this._session === s) this._session = null;
    for (const reject of [...s.rejects]) reject();
    s.rejects.clear();
    this.ctx.ui.dialog.clear();
    this._release(s, false);
  }

  _release(s, normal) {
    const { ui, input, game } = this.ctx;
    const ex = this._explore();
    this._resetHold();
    this._dropProxy(s);
    for (const a of s.gathered.values()) this._vanish(a, 0.3);
    s.gathered.clear();
    if (s.letterbox) ui.hud.letterbox(false);
    if (s.faded) this._fade(s, false, 300, null);
    if (s.memory) this._scanlines(false);
    if (s.leaderRestore && s.leaderRestore !== gameState.leader && gameState.party.some((m) => m.id === s.leaderRestore)) {
      this._leaderNow(s.leaderRestore);
    }
    if (ex) {
      if (s.fx || s.moodFx) ex.fxOverride = null;
      if (s.screens || s.moodFx) ex.world?.setScreens(null);
      if (ex.world) ex.camera.reset({ ms: normal && !this._quick(s) ? 600 : 1 });
      this.touched.clear();
      ex.world?.syncFlags();
      if (normal && s.musicChanged && game.name === 'explore') ex.restoreMusic();
      ex.unlock('cutscene');
    } else this.touched.clear();
    ui.menuEnabled = true;
    if (game.name === 'explore' && !game.inBattle) {
      input.setContext('explore');
      ui.hud.setVisible(true);
    }
  }

  // ------------------------------------------------------------------ helpers (shared with Cs)

  _wrap(s, promise) {
    if (s.aborted) return Promise.reject(new AbortError());
    return new Promise((resolve, reject) => {
      const abort = () => reject(new AbortError());
      s.rejects.add(abort);
      promise.then((v) => { s.rejects.delete(abort); resolve(v); }, (e) => { s.rejects.delete(abort); reject(e); });
    });
  }

  _explore() {
    return this.ctx.game?.states?.explore || null;
  }

  _world() {
    return this._explore()?.world || null;
  }

  _quick(s) { return s.instant || this.fast; }
  /** Wait scale: instant 0, debug fast x0.05. */
  _waitMs(s, ms) { return s.instant ? 0 : this.fast ? ms * 0.05 : ms; }
  /** Camera and tween time: snap in instant and fast mode. */
  _tweenMs(s, ms) { return this._quick(s) ? 1 : ms; }
  /** Fades, cards, emotes and captions: at most 0.3 s in instant and fast mode. */
  _capMs(s, ms) { return this._quick(s) ? Math.min(ms, 300) : ms; }

  _goInstant(s) {
    s.instant = true;
    if (!s.choosing) this.ctx.ui.dialog.clear();
  }

  _resetHold() {
    if (this._hinted) {
      this._hinted = false;
      this.ctx.ui.hud.skipHint(false);
    }
  }

  // leader stand-in ----------------------------------------------------------

  _proxy(s) {
    if (s.proxy) return s.proxy;
    const ex = this._explore();
    const p = ex?.player;
    if (!ex?.world || !p) return null;
    const id = gameState.leader;
    s.proxy = ex.world.spawnNpc({
      id: LEADER_PROXY, sprite: id, x: p.x, z: p.z, facing: p.facing,
      name: gameState.party.find((m) => m.id === id)?.name || id.toUpperCase(),
    });
    p.actor.object3d.visible = false;
    return s.proxy;
  }

  _followProxy(s) {
    const p = this._explore()?.player;
    const a = s.proxy;
    if (p && (p.x !== a.x || p.z !== a.z || p.facing !== a.facing)) p.setPosition(a.x, a.z, a.facing);
  }

  _dropProxy(s) {
    const a = s.proxy;
    if (!a) return;
    s.proxy = null;
    const ex = this._explore();
    if (ex?.player) {
      ex.player.setPosition(a.x, a.z, a.facing);
      ex.player.actor.object3d.visible = true;
    }
    if (ex?.world?.npc(LEADER_PROXY) === a) ex.world.removeNpc(LEADER_PROXY);
  }

  _leaderNow(id) {
    const s = this._session;
    if (s) this._dropProxy(s);
    setStateLeader(id);
    this._explore()?.setLeader(id);
  }

  _vanish(actor, sec) {
    const world = this._world();
    if (!world) return Promise.resolve();
    return actor.setVisible(false, { fade: sec }).then(() => {
      if (world.npc(actor.id) === actor) world.removeNpc(actor.id);
    });
  }

  // actors -------------------------------------------------------------------

  /** NpcActor for an id (leader -> stand-in; a non-leading member steps out when `step`). */
  _actor(s, id, { step = false } = {}) {
    if (id && typeof id === 'object') return id;
    const world = this._world();
    if (!world) return null;
    if (id === 'leader' || id === gameState.leader) return this._proxy(s);
    const own = world.npc(id);
    if (own) {
      this.touched.add(id);
      return own;
    }
    if (gameState.party.some((m) => m.id === id)) {
      const out = s.gathered.get(id) || (step ? this._stepOut(s, id) : null);
      if (out) this.touched.add(out.id);
      return out;
    }
    return null;
  }

  _need(s, id) {
    const a = this._actor(s, id, { step: true });
    if (!a) console.error(`cutscenes: "${s.id}" addresses actor "${id}", which is not on this map`);
    return a;
  }

  _stepOut(s, memberId) {
    const ex = this._explore();
    const from = s.proxy || ex.player;
    const a = ex.world.spawnNpc({
      id: PARTY_ACTOR + memberId, sprite: memberId, x: from.x, z: from.z, facing: from.facing,
      name: gameState.party.find((m) => m.id === memberId)?.name || memberId.toUpperCase(),
    });
    s.gathered.set(memberId, a);
    return a;
  }

  /** { x, z } of a target: actor id, 'leader', [x, z], { x, z } or a map anchor name. */
  _point(s, target) {
    if (Array.isArray(target)) return { x: target[0], z: target[1] };
    if (isObj(target) && 'x' in target) return target;
    if (typeof target === 'string') {
      const anchor = this._world()?.anchors?.[target];
      if (anchor) return anchor;
      const ex = this._explore();
      if ((target === 'leader' || target === gameState.leader) && !s.proxy && ex?.player) return { x: ex.player.x, z: ex.player.z };
      const a = this._actor(s, target);
      if (a) return { x: a.x, z: a.z };
    }
    console.error(`cutscenes: "${s.id}" cannot locate "${target}"`);
    return null;
  }

  _path(s, path) {
    if (typeof path === 'string' || (isObj(path) && 'x' in path)) {
      const p = this._point(s, path);
      return p ? [[p.x, p.z]] : [];
    }
    return path;
  }

  // dialogue -----------------------------------------------------------------

  _portrait(speaker, expr) {
    const base = REG.speakers[speaker]?.portrait || PARTY_SPEAKERS[speaker] || String(speaker || '').toLowerCase();
    return expr ? `${base}:${expr}` : undefined;
  }

  _line(l) {
    if (!isObj(l)) return l;
    const out = { speaker: l.speaker ?? null, text: l.text ?? '' };
    if (l.portrait) out.portrait = l.expr && !String(l.portrait).includes(':') ? `${l.portrait}:${l.expr}` : l.portrait;
    else if (l.expr && l.speaker) out.portrait = this._portrait(l.speaker, l.expr);
    if (l.offscreen) out.offscreen = true;
    if (l.tag) out.tag = l.tag;
    return out;
  }

  /**
   * Staging check (4.2): a speaking traveler must be on screen unless the line is offscreen. Inline
   * lines on a `poc: true` map are the legacy POC talk (3.5, Wave S only) and are not checked.
   */
  _checkSpeaker(s, line, script) {
    const id = PARTY_SPEAKERS[line.speaker];
    const ex = this._explore();
    if (!id || line.offscreen || this.ctx.game.name !== 'explore' || !ex?.world) return;
    if (!script.named && ex.world.map?.poc) return;
    let at = null;
    if (id === gameState.leader) {
      at = s.proxy ? (s.proxy.visible ? s.proxy : null) : ex.player;
    } else {
      const a = ex.world.npc(id) || s.gathered.get(id);
      at = a && a.visible ? a : null;
    }
    if (!at || !this.ctx.engine.projectToScreen({ x: at.x, y: 0.9, z: at.z }).visible) {
      console.error(`cutscenes: ${line.speaker} speaks in "${script.id}" but is not on screen (gather the party or mark the line offscreen)`);
    }
  }

  _moodOf(speaker) {
    const m = speaker && REG.speakers[speaker]?.mood;
    if (!m) return null;
    return isObj(m) ? m : MOODS[m] || null;
  }

  _applyMood(s, mood) {
    const ex = this._explore();
    if (!ex?.world) return;
    s.moodFx = mood ? mood.fx || null : null;
    ex.fxOverride = mergeFx(s.fx, s.moodFx);
    ex.world.setScreens(mood?.screens || (s.screens ? s.screens[0] : null), mood?.screens ? undefined : s.screens?.[1]);
  }

  async _say(s, raw, script) {
    const lines = raw.map((l) => this._line(l));
    let speaker = null;
    for (const l of lines) {
      if (!isObj(l)) continue;
      speaker = l.speaker;
      this._checkSpeaker(s, l, script);
      if (speaker) this._touchSpeaker(speaker);
    }
    if (s.instant) return;
    const { ui } = this.ctx;
    const opts = this.fast ? { auto: true } : {};
    // runs of consecutive lines by mood, queued at once so the box never closes between them
    const runs = [];
    let cur = null;
    speaker = null;
    for (const l of lines) {
      if (isObj(l)) speaker = l.speaker;
      const mood = this._moodOf(speaker);
      if (!cur || cur.mood !== mood) runs.push((cur = { mood, lines: [] }));
      cur.lines.push(l);
    }
    if (runs.length === 1 && !runs[0].mood) {
      await ui.dialog.show(lines, opts);
      return;
    }
    // a run that starts with a plain string must still name its speaker for the dialog box
    let last = null;
    for (const r of runs) {
      if (!isObj(r.lines[0]) && last) r.lines[0] = { ...last, text: r.lines[0] };
      for (const l of r.lines) if (isObj(l)) last = { speaker: l.speaker, ...(l.portrait ? { portrait: l.portrait } : {}) };
    }
    this._applyMood(s, runs[0].mood);
    const shown = runs.map((r) => ui.dialog.show(r.lines, opts));
    try {
      for (let i = 0; i < runs.length; i++) {
        await shown[i];
        if (s.aborted) return;
        if (i + 1 < runs.length && runs[i + 1].mood !== runs[i].mood) this._applyMood(s, runs[i + 1].mood);
      }
    } finally {
      if (!s.aborted && s.moodFx !== null) this._applyMood(s, null);
    }
  }

  _touchSpeaker(speaker) {
    const npcs = this._world()?.npcs;
    if (!npcs) return;
    for (const [id, a] of npcs instanceof Map ? npcs : Object.entries(npcs)) if (a?.def?.name === speaker) this.touched.add(id);
  }

  // screen -------------------------------------------------------------------

  _layer(kind) {
    const key = kind === 'fade' ? '_fadeEl' : '_scanEl';
    if (this[key] || typeof document === 'undefined') return this[key];
    injectCSS('vp-cutscene', CSS);
    const el = document.createElement('div');
    el.className = kind === 'fade' ? 'vp-cs-fade' : 'vp-cs-scan';
    this.ctx.ui.root.appendChild(el);
    this[key] = el;
    return el;
  }

  _fade(s, on, ms, color) {
    s.faded = on;
    const el = this._layer('fade');
    if (el) {
      if (on && color) el.style.background = color;
      el.style.transition = `opacity ${ms}ms linear`;
      void el.offsetWidth;
      el.style.opacity = on ? '1' : '0';
    }
    return delay(ms);
  }

  _scanlines(on) {
    this._layer('scan')?.classList.toggle('is-on', on);
  }
}

/** The `cs` API handed to a script (4.3). One per script call; nested scripts get their own. */
class Cs {
  constructor(runner, session, id, args, named) {
    this._r = runner;
    this._s = session;
    this.id = id;
    this.args = args;
    this._named = named;
    const r = runner, s = session;
    const ex = () => r._explore();
    this.camera = {
      focus: (target, { zoom = 1, ms = 800 } = {}) => this._do(() => {
        // map NPCs stay ids (the camera may track them); everything else becomes a point
        const t = typeof target === 'string' && target !== gameState.leader && r._world()?.npc(target) ? target : r._point(s, target);
        return ex().camera.focus(t, { zoom, ms: r._tweenMs(s, ms) });
      }),
      view: ({ pitch, dist, ms = 800 } = {}) => this._do(() => ex().camera.view({ pitch, dist, ms: r._tweenMs(s, ms) })),
      pan: (points, { sec = 4 } = {}) => this._do(() => ex().camera.pan(points.map((p) => r._point(s, p)), { sec: r._quick(s) ? 0.001 : sec })),
      reset: ({ ms = 600 } = {}) => this._do(() => ex().camera.reset({ ms: r._tweenMs(s, ms) })),
    };
  }

  _ok() {
    if (this._s.aborted) throw new AbortError();
  }

  /** An async cs call: runs `work` and rejects with an AbortError when the script is aborted. */
  _do(work) {
    this._ok();
    return this._r._wrap(this._s, Promise.resolve().then(work));
  }

  get _ctx() { return this._r.ctx; }

  // ---- dialogue

  say(a, b, opts = {}) {
    const lines = typeof a === 'string' && typeof b === 'string'
      ? [{ speaker: a, text: b, ...opts }]
      : [].concat(a ?? []);
    return this._do(() => this._r._say(this._s, lines, { id: this.id, named: this._named }));
  }

  narrate(text) {
    return this.say([{ speaker: null, text }]);
  }

  choice(prompt, options, { speaker, expr, cancelIndex } = {}) {
    const r = this._r, s = this._s;
    if (r.choices.length) {
      this._ok();
      return Promise.resolve(r.choices.shift());
    }
    return this._do(async () => {
      s.choosing = true;
      try {
        const portrait = speaker && expr ? r._portrait(speaker, expr) : undefined;
        return await this._ctx.ui.dialog.choice(prompt, options, { speaker, portrait, cancelIndex });
      } finally {
        s.choosing = false;
      }
    });
  }

  wait(sec) {
    return this._do(() => delay(this._r._waitMs(this._s, sec * 1000)));
  }

  // ---- scene

  scene({ leader } = {}) {
    this._ok();
    if (!leader || leader === gameState.leader) return;
    if (!this._s.leaderRestore) this._s.leaderRestore = gameState.leader;
    this._r._leaderNow(leader);
  }

  // ---- actors

  actor(id) {
    this._ok();
    return this._r._actor(this._s, id);
  }

  spawn(id, { sprite, x, z, facing = 'down', hologram = false, fade = 0.3, name, pose } = {}) {
    return this._do(async () => {
      const world = this._r._world();
      const a = world.spawnNpc({ id, sprite, x, z, facing, hologram, name, pose });
      this._r.touched.add(id);
      const sec = this._r._capMs(this._s, fade * 1000) / 1000;
      if (sec > 0) {
        await a.setVisible(false, { fade: 0 });
        await a.setVisible(true, { fade: sec });
      }
      return a;
    });
  }

  despawn(id, { fade = 0.4 } = {}) {
    return this._do(() => {
      const a = this._r._actor(this._s, id);
      if (!a) return null;
      if (a === this._s.proxy) {
        console.error(`cutscenes: "${this._s.id}" cannot despawn the leader`);
        return null;
      }
      for (const [m, g] of this._s.gathered) if (g === a) this._s.gathered.delete(m);
      return this._r._vanish(a, this._r._capMs(this._s, fade * 1000) / 1000);
    });
  }

  move(id, path, { speed = 2.4, run = false, face } = {}) {
    return this._do(async () => {
      const r = this._r, s = this._s;
      const a = r._need(s, id);
      if (!a) return;
      const points = r._path(s, path);
      const k = s.instant ? 1e4 : r.fast ? 6 : 1;
      if (points.length) await a.walkTo(points, { speed: speed * k, run });
      if (face) a.face(typeof face === 'string' && !['up', 'down', 'left', 'right'].includes(face) ? r._point(s, face) : face);
    });
  }

  face(id, target) {
    this._ok();
    const r = this._r, s = this._s;
    const isDir = ['up', 'down', 'left', 'right'].includes(target);
    const ex = r._explore();
    if ((id === 'leader' || id === gameState.leader) && !s.proxy && ex?.player) {
      const p = ex.player;
      if (isDir) p.setPosition(p.x, p.z, target);
      else {
        const pt = r._point(s, target);
        if (pt) p.face(pt.x, pt.z);
      }
      return;
    }
    const a = r._need(s, id);
    if (!a) return;
    a.face(isDir ? target : r._point(s, target));
  }

  anim(id, nameOrPose) {
    this._ok();
    const a = this._r._need(this._s, id);
    if (a) a.play(nameOrPose || null);
  }

  emote(id, kind, { ms = 1200, wait = true } = {}) {
    return this._do(() => {
      const r = this._r, s = this._s;
      const leader = (id === 'leader' || id === gameState.leader) && !s.proxy;
      const target = leader ? 'leader' : r._need(s, id);
      if (!target) return null;
      const p = r._world().emote(target, kind, { ms: r._capMs(s, ms) });
      return wait ? p : null;
    });
  }

  gather(layout) {
    return this._do(() => {
      const r = this._r, s = this._s;
      const k = s.instant ? 1e4 : r.fast ? 6 : 1;
      const walks = [];
      for (const [member, slot] of Object.entries(layout)) {
        if (!gameState.party.some((m) => m.id === member)) {
          console.warn(`cutscenes: gather: ${member} is not in the party`);
          continue;
        }
        const a = r._actor(s, member, { step: true });
        walks.push(a.walkTo([slot], { speed: 2.4 * k }));
      }
      return Promise.all(walks);
    });
  }

  ungather() {
    return this._do(async () => {
      const r = this._r, s = this._s;
      const ex = r._explore();
      const home = s.proxy || ex.player;
      const k = s.instant ? 1e4 : r.fast ? 6 : 1;
      const list = [...s.gathered.values()];
      s.gathered.clear();
      await Promise.all(list.map(async (a) => {
        await a.walkTo([[home.x, home.z]], { speed: 2.4 * k });
        await r._vanish(a, r._capMs(s, 250) / 1000);
      }));
    });
  }

  // ---- camera and screen (camera: see constructor)

  letterbox(on) {
    return this._do(() => {
      this._s.letterbox = !!on;
      return this._ctx.ui.hud.letterbox(!!on, this._r._capMs(this._s, 500));
    });
  }

  fadeOut({ ms = 600, color = '#000' } = {}) {
    return this._do(() => this._r._fade(this._s, true, this._r._capMs(this._s, ms), color));
  }

  fadeIn({ ms = 600 } = {}) {
    return this._do(() => this._r._fade(this._s, false, this._r._capMs(this._s, ms), null));
  }

  flash(color, sec, strength) {
    this._ok();
    this._ctx.engine.flash(color, sec, strength);
  }

  shake(intensity, sec) {
    this._ok();
    this._ctx.engine.shake(intensity, sec);
  }

  fx(partial) {
    this._ok();
    const s = this._s;
    s.fx = mergeFx(s.fx, partial);
    const ex = this._r._explore();
    if (ex) ex.fxOverride = mergeFx(s.fx, s.moodFx);
  }

  memory(on) {
    this._ok();
    const s = this._s;
    if (s.memory === !!on) return;
    s.memory = !!on;
    s.fx = on ? mergeFx(s.fx, MEMORY_FX) : null;
    const ex = this._r._explore();
    if (ex) ex.fxOverride = mergeFx(s.fx, s.moodFx);
    this._r._scanlines(!!on);
  }

  screens(tex, group) {
    this._ok();
    this._s.screens = tex ? [tex, group] : null;
    this._r._world()?.setScreens(tex || null, group);
  }

  card(chapterId) {
    return this._do(async () => {
      const r = this._r, s = this._s;
      const { ui, audio } = this._ctx;
      const c = chapterDef(chapterId);
      if (!c) {
        console.error(`cutscenes: unknown chapter "${chapterId}"`);
        return;
      }
      audio.music('sting_chapter');
      audio.sfx('card');
      const shown = ui.cards.chapter({ kicker: c.kicker, title: c.title, traveler: c.traveler, ...(r._quick(s) ? { ms: 300 } : {}) });
      // the chapter, its traveler and the save requests change under the card's black
      await delay(r._quick(s) ? 0 : 900);
      if (s.aborted) return;
      story.setChapter(chapterId);
      if (c.traveler && gameState.party.some((m) => m.id === c.traveler)) {
        s.leaderRestore = null;
        if (gameState.leader !== c.traveler) r._leaderNow(c.traveler);
      }
      s.queue.checkpoint = true;
      s.queue.save = true;
      await shown;
    });
  }

  banner(name, subtitle) {
    return this._do(() => {
      const obj = REG.objectives[gameState.story.objective];
      this._ctx.ui.hud.showLocation(name, subtitle, obj ? obj.text : undefined);
    });
  }

  caption(text, { ms = 2500 } = {}) {
    return this._do(() => this._ctx.ui.cards.caption(text, { ms: this._r._capMs(this._s, ms) }));
  }

  // ---- audio

  music(track, { fade, restart } = {}) {
    this._ok();
    this._s.musicChanged = true;
    if (track === 'map') this._r._explore()?.restoreMusic();
    else this._ctx.audio.music(track, { fade, restart });
  }

  sfx(name, opts) {
    this._ok();
    this._ctx.audio.sfx(name, opts);
  }

  // ---- state

  flag(name, value = true) {
    this._ok();
    story.set(name, value);
  }

  test(cond) {
    this._ok();
    return story.test(cond);
  }

  objective(id) {
    this._ok();
    story.setObjective(id);
  }

  chapter(id) {
    this._ok();
    story.setChapter(id);
  }

  give(itemId, n = 1, { toast = true } = {}) {
    return this._do(() => {
      const item = ITEMS[itemId];
      if (!item) {
        console.error(`cutscenes: "${this._s.id}" gives unknown item "${itemId}"`);
        return;
      }
      addItem(itemId, n);
      if (toast) {
        this._ctx.audio.sfx('pickup');
        this._ctx.ui.hud.toast(`Obtained *${item.name}*${n > 1 ? ` ×${n}` : ''}`, { icon: item.icon || itemId });
      }
    });
  }

  take(itemId, n = 1) {
    this._ok();
    return removeItem(itemId, n);
  }

  credits(n) {
    this._ok();
    gameState.credits = Math.max(0, gameState.credits + n);
  }

  join(memberId, { level } = {}) {
    return this._do(() => {
      joinParty(memberId, level != null ? { level } : {});
      this._ctx.ui.hud.partyToast(memberId, 'join');
    });
  }

  leave(memberId) {
    return this._do(() => {
      const leader = gameState.leader;
      const g = this._s.gathered.get(memberId);
      if (g) {
        this._s.gathered.delete(memberId);
        this._r._vanish(g, 0.3);
      }
      leaveParty(memberId);
      if (gameState.leader !== leader) this._r._leaderNow(gameState.leader);
      this._ctx.ui.hud.partyToast(memberId, 'leave');
    });
  }

  setLeader(id) {
    return this._do(() => {
      this._s.leaderRestore = null;
      if (gameState.leader !== id) this._r._leaderNow(id);
    });
  }

  heal() {
    return this._do(() => {
      healParty();
      this._ctx.audio.sfx('heal');
    });
  }

  checkpoint() {
    this._ok();
    this._s.queue.checkpoint = true;
  }

  save() {
    this._ok();
    this._s.queue.save = true;
  }

  // ---- flow

  battle(encounterId, { allowDefeat = false, canFlee = false, seed } = {}) {
    return this._do(() => {
      const r = this._r, s = this._s;
      if (s.autoInstant) {
        s.instant = false;
        s.autoInstant = false;
      }
      const boss = this.args.boss;
      if (boss?.id) r.touched.add(boss.id);
      s.musicChanged = true;
      const { game, ui, input } = this._ctx;
      return game.startBattle(encounterId, {
        allowDefeat, canFlee, boss: !!ENCOUNTERS[encounterId]?.boss, script: s.id, ...(seed != null ? { rng: makeRng(seed) } : {}),
      }).then((result) => {
        // back in the field, the HUD and the input context are the script's again
        ui.hud.setVisible(true);
        input.setContext('dialog');
        return result;
      });
    });
  }

  goto(mapId, spawn, { transition = 'fade', scene = false } = {}) {
    return this._do(async () => {
      const r = this._r, s = this._s;
      // the stand-in, stepped-out members and exemptions belong to the map being left
      r._dropProxy(s);
      s.gathered.clear();
      r.touched.clear();
      await travel.arrive(mapId, spawn, { transition, scene, kind: 'goto', ...(r._quick(s) ? { duration: 0.3 } : {}) });
      if (s.screens) r._world()?.setScreens(s.screens[0], s.screens[1]);
    });
  }

  shop(shopId) {
    return this._do(() => {
      const shop = REG.shops[shopId];
      if (!shop) {
        console.error(`cutscenes: unknown shop "${shopId}"`);
        return null;
      }
      return this._ctx.ui.shop.open({ shop, stock: shopStock(shop, gameState) });
    });
  }

  travel(destId) {
    return this._do(() => (destId ? travel.go(destId, { cs: this }) : travel.open({ cs: this })));
  }

  run(scriptId, args = {}) {
    return this._do(() => {
      const { fn, id, named } = this._r._script(scriptId);
      return fn ? this._r._exec(this._s, fn, id, args, named) : undefined;
    });
  }

  ending() {
    return this._do(() => {
      const { game } = this._ctx;
      game.flushQueue(this._s.queue, this._s.id);
      this._s.queue = { checkpoint: false, save: false };
      return game.finish();
    });
  }

  // ---- world

  light(tag, opts = {}) {
    this._ok();
    this._r._world()?.lighting.setTag(tag, opts);
  }

  particles(preset, pos, opts) {
    this._ok();
    this._r._world()?.particles.emit(preset, pos, opts);
  }

  prop(id) {
    this._ok();
    return this._r._world()?.living(id) || null;
  }
}
