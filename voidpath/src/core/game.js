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
//   game.retry(); game.toTitle()      both abortAll first
//   game.finish() -> Promise          credits, THE END, stats; resolves 'ione' (Return to Ione) or 'title'
// extras:
//   requestCheckpoint(); requestAutosave()   queued while a script runs (6.2), else applied now
//   flushQueue(queue, scriptId)       the runner applies a finished script's queue at the leader's position
//   setCheckpoint(pos?); autosave(); write(slot) -> ok; saveMenu(); loadMenu(); loadData(saveData); leaderPos(); forget()
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
import { travel } from '../story/travel.js';

const MEMORY_NOTICE = 'Saving is unavailable in this view. Progress lasts until the page closes.';

// Errors inside transition callbacks reject a promise; rethrow them so #vp-fatal shows them.
const surface = (e) => setTimeout(() => { throw e; });

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
    return ok;
  }

  /** [map, spawn] a save resumes at: its position, else its checkpoint, else its location's dock. */
  _loadTarget(data) {
    const valid = (p) => {
      const def = p && getMap(p.map);
      if (!def || def.transit || def.scene) return false;
      return p.x >= 0 && p.z >= 0 && p.x < def.w && p.z < def.h;
    };
    for (const p of [data.pos, data.checkpoint]) {
      if (valid(p)) return [p.map, { x: p.x, z: p.z, facing: p.facing || 'down' }];
    }
    const loc = data.pos && locationOfMap(data.pos.map);
    const dock = loc && REG.destinations.find((d) => d.loc === loc && getMap(d.map));
    return dock ? [dock.map, dock.spawn] : ['halcyon', 'start'];
  }

  /** Drop the session state of the last journey: snapshot, checkpoint identity, any battle. */
  forget() {
    this._snapshot = null;
    this._snapCp = null;
    this._battle = null;
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

  setCheckpoint(pos = this.leaderPos()) {
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
    const r = writeSlot(slot, serialize(gameState, this.leaderPos()));
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

  /** Retry from the checkpoint snapshot (4.4); before the first checkpoint, a new journey. */
  async retry() {
    const { cutscenes } = this.ctx;
    const script = this._battle?.script || null;
    cutscenes.abortAll();
    await this._idle();
    const snap = this._snapshot;
    if (!snap) {
      this.forget();
      this._closeScreens();
      return this.newJourney();
    }
    cutscenes.autoSkip = script;
    const cp = snap.checkpoint?.map ? snap.checkpoint : snap.pos;
    await travel.arrive(cp.map, { x: cp.x, z: cp.z, facing: cp.facing || 'down' }, {
      kind: 'respawn',
      onCover: () => {
        this._closeScreens();
        deserialize(snap, { keep: ['stats', 'played'] });
        this._snapCp = gameState.checkpoint;
        healParty();
        this._battle = null;
        this.inBattle = false;
      },
    });
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
