// Game: the state machine ('title' | 'explore' | 'battle') and the flows between states (TECH_PLAN
// 4.4, 6.2): New Journey, Continue and Load, battles as promises, game over with Retry (from the
// in-memory checkpoint snapshot), Retry from a boss's second form, Title and the ending.
//
//   game.newJourney()                 abortAll; newGame(); iris to REG.newJourney's map and spawn (default
//                                     CHAPTER_START.prologue), then cutscenes.run(REG.newJourney.script) if set
//   game.continue(); game.load(slot)  abortAll; deserialize; arrive at the saved position (or a valid fallback)
//   game.startBattle(encounterId, { allowDefeat = false, canFlee, rng, boss, script }) -> Promise<'victory' | 'defeat' | 'fled'>
//                                     waits for a running transition, shatters in (a fade under reduced motion),
//                                     resolves after the field has faded back in; a defeat without allowDefeat
//                                     is a game over and leaves the promise pending (Retry from the second form
//                                     resolves it with that battle's result; anything else aborts the script)
//   game.retry(); game.toTitle()      both abortAll first; retry keeps Party Talks played since the
//                                     checkpoint and sets `retried` = { script, encounter } (a field boss
//                                     confronted again skips its pre-fight part, G2 F-2)
//   game.finish() -> Promise          credits, THE END, stats; resolves 'ione' (Return to Ione) or 'title'
// extras:
//   requestCheckpoint(); requestAutosave()   queued while a script runs (6.2), else applied now
//   flushQueue(queue, scriptId)       the runner applies a finished script's queue at the leader's position
//   setCheckpoint(pos?); autosave(); write(slot) -> ok; saveMenu(); loadMenu(); loadData(saveData); leaderPos(); forget()
//   savePos()                         leaderPos(), or the map's dock / nearest spawn when the leader stands
//                                     somewhere unwalkable: checkpoints and saves never keep the void (G3-01)
//   autosaves (count), inBattle, autoResolve / policy (debug), onBattleEvent / onBattleStart (debug hooks)
//
// Whenever gameState.checkpoint changes (here, or a Med-Station Restore in ExploreState) the game
// keeps an in-memory serialize() snapshot of that moment; Retry restores it.

import { gameState, newGame, healParty } from './state.js';
import { serialize, deserialize, writeSlot, readSlot, listSlots, latestSlot, storageMode, markCleared } from './save.js';
import { prefersReducedMotion } from './util.js';
import { BattleModel } from '../battle/model.js';
import { ENCOUNTERS } from '../battle/data.js';
import { REG, getMap, locationOfMap } from '../content/registry.js';
import { CHAPTER_START } from '../content/chapters.js';
import { cellSpec, isWalkableSpec } from '../world/mapdef.js';
import { travel } from '../story/travel.js';

const MEMORY_NOTICE = 'Saving is unavailable in this view. Progress lasts until the page closes.';

// Errors inside transition callbacks reject a promise; rethrow them so #vp-fatal shows them.
const surface = (e) => setTimeout(() => { throw e; });

/** A spot the leader can stand on: a real (not transit or scene) map, a walkable cell (G3-01). */
function standable(p) {
  const def = p && getMap(p.map);
  if (!def || def.transit || def.scene || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  return isWalkableSpec(cellSpec(def, Math.floor(p.x), Math.floor(p.z)));
}

/**
 * Where to stand instead of an unwalkable spot on `mapId`: the map's Starchart dock, else its spawn
 * nearest to `near`; else the location's dock; else the Halcyon start. -> { map, x, z, facing }
 */
function fallbackSpot(mapId, near = null) {
  const at = (map, spawn) => {
    const sp = getMap(map)?.spawns?.[spawn];
    const p = sp && { map, x: sp.x, z: sp.z, facing: sp.facing || 'down' };
    return p && standable(p) ? p : null;
  };
  const def = getMap(mapId);
  if (def && !def.transit && !def.scene) {
    const dock = REG.destinations.find((d) => d.map === mapId);
    const p = dock && at(mapId, dock.spawn);
    if (p) return p;
    const dist = (sp) => (near ? Math.hypot(sp.x - near.x, sp.z - near.z) : 0);
    const names = Object.keys(def.spawns || {}).sort((a, b) => dist(def.spawns[a]) - dist(def.spawns[b]));
    for (const n of names) {
      const q = at(mapId, n);
      if (q) return q;
    }
  }
  const loc = locationOfMap(mapId);
  const dock = loc && REG.destinations.find((d) => d.loc === loc && getMap(d.map));
  return (dock && at(dock.map, dock.spawn)) || at('halcyon', 'start') || { map: 'halcyon', x: 0, z: 0, facing: 'down' };
}

export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.game = this;
    this.states = {};
    this.current = null;
    this.name = null;
    this.inBattle = false;      // from startBattle until the field (or the title) takes over
    this.autoResolve = false;   // debug: false | 'win' | 'lose' | 'policy' (model only, no stage)
    this.policy = null;         // debug: (model, actorId) -> action for autoResolve 'policy'
    this.onBattleEvent = null;  // debug: every event the battle director plays
    this.onBattleStart = null;  // debug: (model) once a battle's model exists
    this.autosaves = 0;
    this._battle = null;        // { encounterId, opts, resolve, start, transformed }
    this._snapshot = null;      // serialize() of the last checkpoint (Retry)
    this._snapCp = null;        // the gameState.checkpoint object that snapshot belongs to
    this.retried = null;        // { script, encounter } of the battle the last Retry replays (F-2)
    this._noticed = false;
  }

  add(name, state) {
    this.states[name] = state;
    return state;
  }

  /** Exit the current state and enter `name` with params; returns what enter() returns. */
  change(name, params = {}) {
    const next = this.states[name];
    if (!next) throw new Error(`Game: unknown state "${name}"`);
    if (this.current) this.current.exit();
    this.name = name;
    this.current = next;
    return next.enter(params);
  }

  update(dt, t) {
    if (!this.current) return;
    this.current.update(dt, t);
    if (this.name === 'explore' || this.name === 'battle') gameState.stats.playTime += this.ctx.engine.realDt;
    const cp = gameState.checkpoint;
    if (cp && cp !== this._snapCp) this._snap();
  }

  /** Resolves once no transition runs (requests made meanwhile wait instead of being dropped). */
  async _idle() {
    const { engine } = this.ctx;
    while (engine.transitioning) await new Promise((r) => requestAnimationFrame(r));
  }

  // ------------------------------------------------------------------ journeys

  async newJourney() {
    const { cutscenes, ui } = this.ctx;
    cutscenes.abortAll();
    cutscenes.autoSkip = null;
    await this._idle();
    ui.menuEnabled = false;
    newGame();
    this.forget();
    const nj = REG.newJourney || {};
    const start = CHAPTER_START.prologue;
    await travel.arrive(nj.map || start.map, nj.spawn || start.spawn, { transition: 'iris', kind: 'newJourney' });
    if (nj.script) await cutscenes.run(nj.script, {});
  }

  continue() {
    const slot = latestSlot();
    return slot ? this.load(slot) : Promise.resolve(false);
  }

  async load(slot) {
    const data = readSlot(slot);
    if (!data) {
      this.ctx.ui.hud.toast('That save could not be read.', { icon: 'error' });
      return false;
    }
    return this.loadData(data);
  }

  async loadData(data) {
    const { cutscenes, ui } = this.ctx;
    cutscenes.abortAll();
    cutscenes.autoSkip = null;
    await this._idle();
    ui.menuEnabled = false;
    const ok = await travel.arrive(...this._loadTarget(data), {
      transition: this.name === 'title' ? 'iris' : 'fade',
      kind: 'load',
      onCover: () => {
        this._closeScreens();
        deserialize(data);
        this.forget();
        // the state just came from a save: Retry goes back to it
        this._snapshot = data;
        this._snapCp = gameState.checkpoint;
      },
    });
    if (ok) this._fixCheckpoint();
    return ok;
  }

  /**
   * [map, spot] a save resumes at: its position, else its checkpoint, if the leader can stand there;
   * else the map's dock or nearest spawn (an old save may hold the void spot of G3-01).
   */
  _loadTarget(data) {
    for (const p of [data.pos, data.checkpoint]) {
      if (standable(p)) return [p.map, { x: p.x, z: p.z, facing: p.facing || 'down' }];
    }
    const bad = data.pos || data.checkpoint;
    const p = fallbackSpot(bad?.map || 'halcyon', bad);
    console.warn(`game: the save's position ${bad ? `${bad.map} (${bad.x}, ${bad.z})` : '(none)'} is not walkable; resuming at ${p.map} (${p.x}, ${p.z})`);
    return [p.map, { x: p.x, z: p.z, facing: p.facing }];
  }

  /** A loaded or restored checkpoint the leader cannot stand on moves to where the journey resumed. */
  _fixCheckpoint() {
    const cp = gameState.checkpoint;
    if (!cp || standable({ map: cp.map || this.states.explore.mapId, x: cp.x, z: cp.z })) return;
    const p = this.savePos();
    gameState.checkpoint = { map: p.map, x: p.x, z: p.z, facing: p.facing };
    this._snap();
  }

  /** Drop the session state of the last journey: snapshot, checkpoint identity, any battle. */
  forget() {
    this._snapshot = null;
    this._snapCp = null;
    this._battle = null;
    this.retried = null;
    this.inBattle = false;
  }

  _closeScreens() {
    const { ui } = this.ctx;
    if (ui.screens.isOpen) ui.screens.close();
    ui.screens.fadeBlack(false, 0);
  }

  // ------------------------------------------------------------------ saves and checkpoints

  leaderPos() {
    const ex = this.states.explore;
    const p = ex.player;
    return { map: ex.mapId, x: +p.x.toFixed(3), z: +p.z.toFixed(3), facing: p.facing };
  }

  /**
   * The leader's position for a checkpoint or a save. A spot the leader cannot stand on (the void,
   * a wall) is refused with a warning and replaced by the map's dock or nearest spawn (G3-01).
   */
  savePos() {
    const pos = this.leaderPos();
    if (standable(pos)) return pos;
    const p = fallbackSpot(pos.map, pos);
    console.warn(`game: refusing to save the leader at ${pos.map} (${pos.x}, ${pos.z}), which is not walkable; using ${p.map} (${p.x}, ${p.z})`);
    return p;
  }

  requestCheckpoint() {
    if (!this.ctx.cutscenes.queue('checkpoint')) this.setCheckpoint();
  }

  requestAutosave() {
    if (!this.ctx.cutscenes.queue('save')) this.autosave();
  }

  /** A finished script's queued requests, written once at the leader's position (6.2). */
  flushQueue(queue, scriptId) {
    if (!queue.checkpoint && !queue.save) return;
    const map = this.name === 'explore' ? this.states.explore.world?.map : null;
    if (!map || map.transit || map.scene) {
      console.error(`cutscenes: "${scriptId}" ended on ${map ? `${map.transit ? 'transit' : 'scene'} map "${map.id}"` : 'no field map'}; `
        + 'its queued save was dropped (scripts must end on a real map)');
      return;
    }
    if (queue.checkpoint) this.setCheckpoint();
    if (queue.save) this.autosave();
  }

  setCheckpoint(pos = this.savePos()) {
    gameState.checkpoint = { map: pos.map, x: pos.x, z: pos.z, facing: pos.facing };
    this._snap();
  }

  _snap() {
    const cp = gameState.checkpoint;
    this._snapCp = cp;
    this._snapshot = serialize(gameState, { map: cp.map || this.states.explore.mapId, x: cp.x, z: cp.z, facing: cp.facing });
  }

  autosave() {
    if (this.write('auto')) {
      this.autosaves++;
      this.ctx.ui.hud.autosaved();
    }
  }

  /** serialize() at the leader's position into `slot`; the memory-storage notice shows once. */
  write(slot) {
    const r = writeSlot(slot, serialize(gameState, this.savePos()));
    if (r.storage === 'memory' && !this._noticed) {
      this._noticed = true;
      this.ctx.ui.hud.toast(MEMORY_NOTICE, { icon: 'save', duration: 6000 });
    }
    if (!r.ok) console.warn(`game: save to "${slot}" failed`, r.error || '');
    return r.ok;
  }

  /** Med-Station / inn "Save": the save picker in save mode. Resolves the slot written, or null. */
  async saveMenu() {
    const slot = await this.ctx.ui.saves.open({ mode: 'save', slots: listSlots(), storage: storageMode() });
    if (!slot) return null;
    if (this.write(slot)) this.ctx.audio.sfx('save');
    return slot;
  }

  /** Title / game over "Load": the save picker in load mode, then load. Resolves false when cancelled. */
  async loadMenu() {
    const slot = await this.ctx.ui.saves.open({ mode: 'load', slots: listSlots(), storage: storageMode() });
    return slot ? this.load(slot) : false;
  }

  // ------------------------------------------------------------------ battles

  startBattle(encounterId, { allowDefeat = false, canFlee, rng, boss, script = null, ...extra } = {}) {
    const enc = ENCOUNTERS[encounterId];
    if (this.inBattle || !enc) {
      const msg = enc ? `game.startBattle("${encounterId}") while a battle runs` : `game.startBattle: unknown encounter "${encounterId}"`;
      console.error(msg);
      return Promise.reject(new Error(msg));
    }
    this.inBattle = true;
    return new Promise((resolve) => {
      this._battle = {
        encounterId, resolve, transformed: false, start: this._partyState(), script, retryPhase: enc.retryPhase || null,
        opts: { ...extra, allowDefeat, canFlee: canFlee ?? enc.canFlee, rng, boss: boss ?? !!enc.boss },
      };
      this._enterBattle(encounterId).catch(surface);
    });
  }

  async _enterBattle(encounterId, { fromBlack = false } = {}) {
    const { engine, ui, audio } = this.ctx;
    const b = this._battle;
    await this._idle();
    ui.menuEnabled = false;   // no pause menu from the shatter until the field takes over (R3)
    if (ui.menu.isOpen) ui.menu.close();
    ui.hud.setPrompt(null);
    ui.hud.setVisible(false);
    if (this.autoResolve) {
      this._autoBattle(b);
      return;
    }
    if (!fromBlack) audio.sfx('encounter');
    const p = this.name === 'explore' ? this.states.explore.player : null;
    const center = p ? engine.projectToScreen({ x: p.x, y: 0.8, z: p.z }) : null;
    const battle = this.states.battle;
    battle.onEvent = (e) => {
      if (e.type === 'transform') b.transformed = true;
      this.onBattleEvent?.(e);
    };
    await engine.transition(fromBlack || prefersReducedMotion() ? 'fade' : 'shatter', {
      center,
      onMidpoint: async () => {
        if (fromBlack) this._closeScreens();
        this.change('battle', { ...b.opts, encounterId, onEnd: (result) => this._battleOver(result) });
        this.onBattleStart?.(battle.model);
        await engine.compileScene(battle.stage.scene, battle.stage.camera);
      },
    });
  }

  _battleOver(result) {
    const b = this._battle;
    if (!b) return;
    if (result === 'defeat' && !b.opts.allowDefeat) {
      this._gameOver();
      return;
    }
    if (result === 'defeat') this._reviveAtOne();
    const { engine, cutscenes, ui } = this.ctx;
    engine.transition('fade', {
      duration: 1.1,
      onMidpoint: () => {
        this.change('explore', { resume: true });
        if (!cutscenes.active) this.states.explore.restoreMusic();
      },
    }).then(() => this._settle(b, result), surface);
  }

  /** The field has faded back in: hand control back and resolve the battle's promise. */
  _settle(b, result) {
    if (this._battle !== b) return;
    this._battle = null;
    this.inBattle = false;
    this.ctx.prewarm?.trim?.();   // the battle's art is released: trim the cache to its budget (11.5)
    this.ctx.ui.menuEnabled = !this.ctx.cutscenes.active;
    if (!this.ctx.cutscenes.active) this.ctx.ui.hud.setVisible(true);
    b.resolve(result);
  }

  _reviveAtOne() {
    for (const m of gameState.party) {
      if (m.alive && m.hp > 0) continue;
      m.alive = true;
      m.hp = 1;
    }
  }

  _partyState() {
    return {
      members: gameState.party.map((m) => ({ id: m.id, hp: m.hp, ep: m.ep, alive: m.alive })),
      inventory: { ...gameState.inventory },
    };
  }

  /** debug.autoResolve: the battle resolves through the model alone, under a quick fade. */
  async _autoBattle(b) {
    let result = 'defeat';
    await this.ctx.engine.transition('fade', { duration: 0.5, onMidpoint: () => { result = this._simulate(b); } });
    if (result === 'defeat' && !b.opts.allowDefeat) {
      this._gameOver();
      return;
    }
    if (result === 'defeat') this._reviveAtOne();
    this._settle(b, result);
  }

  _simulate(b) {
    const mode = this.autoResolve;
    if (mode === 'lose') {
      for (const m of gameState.party) { m.hp = 0; m.alive = false; }
      return 'defeat';
    }
    const m = new BattleModel({ party: gameState.party, encounterId: b.encounterId, rng: b.opts.rng || Math.random });
    this.onBattleStart?.(m);
    const seen = (events) => { if (events.some((e) => e.type === 'transform')) b.transformed = true; };
    seen(m.begin());
    if (mode === 'win') {
      seen(m.forceVictory());
    } else {
      for (let guard = 0; !m.isOver() && guard < 4000; guard++) {
        seen(m.nextTurn());
        if (m.isOver()) break;
        if (m.phase !== 'playerInput') { seen(m.enemyTurn()); continue; }
        const id = m.current.id;
        const ev = m.act(this.policy(m, id));
        if (ev.length === 1 && ev[0].type === 'message') seen(m.act({ actorId: id, kind: 'defend' }));
        else seen(ev);
      }
    }
    if (m.result === 'victory') m.applyRewards();
    return m.result || 'defeat';
  }

  // ------------------------------------------------------------------ game over

  async _gameOver() {
    const { ui, audio } = this.ctx;
    const b = this._battle;
    const phase = b.retryPhase;
    audio.music(null);
    await ui.screens.fadeBlack(true, 800);
    ui.screens.gameOver({
      onRetry: () => this.retry(),
      ...(phase && b.transformed ? { onRetryPhase: () => this._retryPhase(phase.encounter) } : {}),
      // the screen stays up while the picker is open and closes once a journey loaded (S5 contract)
      onLoad: () => this.loadMenu(),
      onTitle: () => this.toTitle(),
    });
  }

  /**
   * Retry from the checkpoint snapshot (4.4); before the first checkpoint, a new journey. The lost
   * battle's outermost script replays its pre-fight part instantly (cutscenes.autoSkip), and so does a
   * field boss confronted again (`retried`, read by ExploreState). Party Talks played since the
   * checkpoint stay played (G2 F-1).
   */
  async retry() {
    const { cutscenes } = this.ctx;
    const b = this._battle;
    const script = b?.script && b.script !== 'inline' ? b.script : null;
    this.retried = b ? { script, encounter: b.encounterId } : null;
    cutscenes.abortAll();
    await this._idle();
    const snap = this._snapshot;
    if (!snap) {
      this.forget();
      this._closeScreens();
      return this.newJourney();
    }
    cutscenes.autoSkip = script;
    const [map, at] = this._loadTarget({ pos: snap.checkpoint?.map ? snap.checkpoint : snap.pos, checkpoint: snap.pos });
    await travel.arrive(map, at, {
      kind: 'respawn',
      onCover: () => {
        this._closeScreens();
        const talks = Object.keys(gameState.flags).filter((f) => f.startsWith('ptalk:') && gameState.flags[f]);
        deserialize(snap, { keep: ['stats', 'played'] });
        for (const f of talks) gameState.flags[f] = true;
        this._snapCp = gameState.checkpoint;
        healParty();
        this._battle = null;
        this.inBattle = false;
      },
    });
    this._fixCheckpoint();
    return true;
  }

  /** Game over after a transform: party HP, EP and items as the lost battle began, straight into form 2. */
  async _retryPhase(encounterId) {
    const b = this._battle;
    const { members, inventory } = b.start;
    for (const s of members) {
      const m = gameState.party.find((x) => x.id === s.id);
      if (m) Object.assign(m, { hp: s.hp, ep: s.ep, alive: s.alive });
    }
    for (const k of Object.keys(gameState.inventory)) delete gameState.inventory[k];
    Object.assign(gameState.inventory, inventory);
    b.encounterId = encounterId;
    b.transformed = true;   // this attempt starts in the second form: losing it offers the same retry
    await this._enterBattle(encounterId, { fromBlack: true });
  }

  async toTitle() {
    const { cutscenes, engine } = this.ctx;
    cutscenes.abortAll();
    cutscenes.autoSkip = null;
    await this._idle();
    await engine.transition('fade', {
      duration: 1.4,
      onMidpoint: () => {
        this._closeScreens();
        this.forget();
        this.change('title', { deferUI: true });
      },
    });
    // the title takes input only once the fade is over (R2)
    this.states.title.showUI();
  }

  /** Debug / tools: straight into the field from the title (no transition). */
  skipTitle() {
    if (this.name !== 'title') return;
    newGame();
    this.forget();
    const start = CHAPTER_START.prologue;
    this.change('explore', { map: start.map, spawn: start.spawn });
    this.ctx.ui.menuEnabled = true;
  }

  // ------------------------------------------------------------------ the ending

  async finish() {
    const { ui, audio } = this.ctx;
    markCleared();
    const fast = this.ctx.cutscenes.fast;
    audio.music('credits');
    await ui.cards.credits({ lines: REG.credits, transparent: true, ...(fast ? { speed: 4000 } : {}) });
    await ui.cards.end({ text: 'THE END', ...(fast ? { ms: 300 } : {}) });
    return new Promise((resolve) => {
      ui.screens.complete({
        stats: gameState.stats,
        onContinue: () => {
          audio.music('ione');
          resolve('ione');
        },
        onTitle: () => {
          resolve('title');
          this.toTitle();
        },
      });
    });
  }
}
