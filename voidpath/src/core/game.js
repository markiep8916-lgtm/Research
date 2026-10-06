// Game: the state machine ('title' | 'explore' | 'battle') and the flows between states: the walk from
// the title into a new journey, the encounter shatter into a battle and the fade back to the field,
// game over and retry from the last Med-Station, and the ending after the Sentinel falls.

import * as THREE from 'three';
import { resetGame, healParty } from './state.js';
import { ENCOUNTERS } from '../battle/data.js';

const _feet = new THREE.Vector3();

// Errors inside transition callbacks reject a promise; rethrow them so #vp-fatal shows them.
const surface = (e) => setTimeout(() => { throw e; });

export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.game = this;
    this.states = {};
    this.current = null;
    this.name = null;
    this.inBattle = false;   // from the encounter shatter until the field (or the title) takes over
  }

  add(name, state) {
    this.states[name] = state;
    return state;
  }

  /** Exit the current state and enter `name` with params. */
  change(name, params = {}) {
    const next = this.states[name];
    if (!next) throw new Error(`Game: unknown state "${name}"`);
    if (this.current) this.current.exit();
    this.name = name;
    this.current = next;
    next.enter(params);
  }

  update(dt, t) {
    if (!this.current) return;
    this.current.update(dt, t);
    if (this.name === 'explore' || this.name === 'battle') this.ctx.state.stats.playTime += this.ctx.engine.realDt;
  }

  // ------------------------------------------------------------------ title

  /** Title -> New Journey: fresh game state, an iris into the Cryo Deck, then the area banner. */
  newJourney() {
    const { engine } = this.ctx;
    if (engine.transitioning) return;
    engine.transition('iris', {
      duration: 1.7,
      color: '#05070d',
      onMidpoint: () => {
        resetGame();
        this.change('explore', { respawn: true });
      },
    }).then(() => this._showArea(), surface);
  }

  /** Straight into the field (debug / tests). */
  skipTitle() {
    if (this.name !== 'title') return;
    resetGame();
    this.change('explore', { respawn: true });
  }

  /** Back to the title screen (from game over or the ending). */
  toTitle() {
    const { engine, ui } = this.ctx;
    engine.transition('fade', {
      duration: 1.4,
      onMidpoint: () => {
        ui.screens.fadeBlack(false, 0);
        this.inBattle = false;
        this.change('title');
      },
    }).catch(surface);
  }

  _showArea() {
    const area = this.states.explore.area;
    if (area && this.name === 'explore') this.ctx.ui.hud.showArea(area.name, area.subtitle);
  }

  // ------------------------------------------------------------------ battles

  /**
   * Shatter the field into a battle. opts: { boss, onEnd(result) } plus the BattleState extras
   * { rng, backdrop } for tools. Returns false (and does nothing) while a battle or transition runs.
   */
  startBattle(encounterId, { boss = false, onEnd = null, ...extra } = {}) {
    const { engine, ui, audio } = this.ctx;
    if (this.inBattle || engine.transitioning || !ENCOUNTERS[encounterId]) return false;
    this.inBattle = true;
    ui.dialog.clear();
    if (ui.menu.isOpen) ui.menu.close();
    ui.hud.setPrompt(null);
    ui.hud.setVisible(false);
    audio.sfx('encounter');
    const p = this.states.explore.player;
    const center = this.name === 'explore' && p ? engine.projectToScreen(_feet.set(p.x, 0.8, p.z), { x: 0, y: 0, visible: false }) : null;
    engine.transition('shatter', {
      center,
      onMidpoint: () => {
        this.change('battle', { ...extra, encounterId, boss, onEnd: (result) => this._battleOver(result, boss, onEnd) });
        audio.music(boss ? 'boss' : 'battle');
      },
    }).catch(surface);
    return true;
  }

  _battleOver(result, boss, onEnd) {
    const { engine, audio, state } = this.ctx;
    if (onEnd) onEnd(result);
    if (result === 'defeat') {
      this._gameOver();
      return;
    }
    const ending = boss && result === 'victory' && !!state.flags.boss_defeated;
    engine.transition('fade', {
      duration: 1.1,
      onMidpoint: () => {
        this.change('explore', { resume: true });
        audio.music(ending ? 'title' : 'explore');
      },
    }).then(() => {
      this.inBattle = false;
      if (ending) this._complete();
    }, surface);
  }

  _complete() {
    const { ui, audio, state } = this.ctx;
    ui.screens.complete({
      stats: state.stats,
      onContinue: () => audio.music('explore'),
      onTitle: () => this.toTitle(),
    });
  }

  async _gameOver() {
    const { ui } = this.ctx;
    await ui.screens.fadeBlack(true, 800);
    ui.screens.gameOver({ onRetry: () => this._retry(), onTitle: () => this.toTitle() });
  }

  /** Game over -> Retry: the squad is restored and wakes at the last Med-Station (or the spawn). */
  async _retry() {
    healParty();
    this.change('explore', { respawn: true });
    this.inBattle = false;
    await this.ctx.ui.screens.fadeBlack(false, 800);
  }
}
