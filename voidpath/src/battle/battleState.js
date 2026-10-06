// BattleState: builds the stage + UI for an encounter, drives battle/model.js turn by turn and hands
// the result back. Loop: begin() -> (nextTurn() -> player command via the menu, or enemyTurn())* ->
// victory results / defeat beat / escape -> onEnd(result) once the result screen is dismissed.
//
// While an enemy acts, holding confirm plays the turn faster.

import { BattleModel } from './model.js';
import { ENCOUNTERS } from './data.js';
import { BattleStage } from './stage.js';
import { BattleUI } from './battleUI.js';
import { Director } from './director.js';
import { gameState } from '../core/state.js';
import { updateVfx } from '../core/vfx.js';
import { ease } from '../core/util.js';

const HALT = new Promise(() => {});
const FAST = 2.2;

export class BattleState {
  constructor(ctx) {
    this.ctx = ctx;
    this.active = false;
    this.autoplay = false;   // tools: party commands come from autoAction() instead of the menu
    this.autoPolicy = null;  // tools: (model, actorId) -> action, used instead of autoAction() when set
    this.timeScale = 1;      // tools: 0 freezes the battle presentation
    this.onEvent = null;     // tools: hook(event) for every event the director plays
  }

  get model() { return this._model || null; }

  /**
   * params: { encounterId, boss, onEnd(result) } plus optional extras: rng (deterministic random
   * source for the model) and backdrop (override the encounter's arena).
   */
  enter({ encounterId, boss = false, onEnd = null, rng, backdrop } = {}) {
    const { engine, input, audio, ui } = this.ctx;
    const base = ENCOUNTERS[encounterId];
    if (!base) throw new Error(`BattleState: unknown encounter "${encounterId}"`);
    const encounter = backdrop ? { ...base, backdrop } : base;
    this.encounter = encounter;
    this.boss = boss || !!encounter.boss;
    this.onEnd = onEnd;
    this.result = null;
    this._forced = null;
    this._enemyTurn = false;

    const state = this.ctx.state || gameState;
    this._model = new BattleModel({ party: state.party, encounterId, rng: rng || Math.random });
    this.stage = new BattleStage(engine, { encounter, combatants: this._model.combatants });
    this.ui = new BattleUI({
      root: ui?.root || document.getElementById('ui-root'), engine, input, audio, stage: this.stage, model: this._model,
      onBoost: (id, level, prev) => this.director.previewBoost(id, level, prev),
    });
    this.director = new Director({ stage: this.stage, ui: this.ui, audio, engine });
    this.director.onEvent = (e) => this.onEvent?.(e);

    const fx = engine.getFx();
    this._savedFx = { tiltShift: { ...fx.tiltShift }, bloom: { ...fx.bloom } };
    engine.setView(this.stage.scene, this.stage.camera);
    this._fxKey = '';
    this._applyFx();
    this.stage.warm();

    input?.setContext('battle');
    input?.consumeAll?.();
    ui?.hud?.setVisible(false);
    audio?.music(encounter.music);
    this.active = true;
    this._run().catch((err) => {
      if (this.active) setTimeout(() => { throw err; });
    });
  }

  exit() {
    if (!this.stage) return;
    const { engine, ui } = this.ctx;
    this.active = false;
    this.ui.dispose();
    if (engine.scene === this.stage.scene) engine.setView(null, null);
    this.stage.dispose();
    engine.setFx(this._savedFx);
    ui?.hud?.setVisible(true);
    this.stage = null;
    this.onEnd = null;
  }

  update(dt, t) {
    if (!this.stage) return;
    const fast = this._enemyTurn && this.ctx.input?.down('confirm') ? FAST : 1;
    const sdt = dt * fast * this.timeScale;
    updateVfx(sdt, t);
    this.stage.update(sdt, t);
    this._applyFx();
    this.ui.update();
  }

  /** Debug: every enemy falls at once (works mid-turn and while the menu is open). */
  forceVictory() {
    if (!this.active || this._model.isOver()) return;
    this._forced = this._model.forceVictory();
    this.ui.cancelChoice();
  }

  /** Tools: switch the party to the built-in heuristic (or back to the menu). */
  setAutoplay(on) {
    this.autoplay = !!on;
    if (on) this.ui?.cancelChoice();
  }

  _applyFx() {
    const f = this.stage.fx;
    const key = `${f.focusY.toFixed(3)}|${f.band.toFixed(3)}|${f.falloff}`;
    if (key === this._fxKey) return;
    this._fxKey = key;
    this.ctx.engine.setFx({ tiltShift: { enabled: true, focusY: f.focusY, band: f.band, falloff: f.falloff, maxBlur: 1.15 } });
  }

  _play(events) {
    if (!this.active) return HALT;
    return this.director.play(events);
  }

  async _run() {
    const m = this._model;
    await this._intro();
    await this._play(m.begin());
    while (!m.isOver()) {
      await this._play(m.nextTurn());
      if (m.isOver()) break;
      const cur = m.current;
      if (cur && m.phase === 'playerInput') {
        let events = null;
        while (!events && !m.isOver()) {
          const action = this.autoplay ? await this._auto(cur.id) : await this.ui.chooseAction(cur.id);
          if (!this.active) return;
          if (this._forced) break;
          if (!action) continue;
          const ev = m.act(action);
          if (ev.length === 1 && ev[0].type === 'message') {
            this.ctx.audio?.sfx('error');
            await this.ui.banner(ev[0].text, { ms: 1000 });
            continue;
          }
          events = ev;
        }
        if (events) await this._play(events);
      } else if (cur) {
        this._enemyTurn = true;
        await this._play(m.enemyTurn());
        this._enemyTurn = false;
      }
      if (this._forced) {
        const f = this._forced;
        this._forced = null;
        await this._play(f);
      }
    }
    await this._finish();
  }

  async _intro() {
    const { stage, ui } = this;
    ui.showIntro(true);
    stage.cam.zoom = 1.16;
    stage.focus({ zoom: 1, rate: 2.4 });
    for (const a of stage.enemies) a.sprite.setOpacity(0);
    stage.party.forEach((a, i) => {
      if (!a.alive) return;
      const from = a.home.clone().setX(a.home.x + 4);
      a.base.copy(from);
      stage.wait(0.06 * i).then(() => stage.tween(0.42, (k) => a.base.lerpVectors(from, a.home, k), ease.outCubic));
    });
    stage.enemies.forEach((a, i) => stage.wait(0.08 * i).then(() => {
      stage.particles.emit('holo', a.point('center'), { count: 16, spread: 0.4 * a.size });
      return stage.tween(0.4, (k) => a.sprite.setOpacity(k), ease.outQuad);
    }));
    await stage.wait(0.55);
    if (this.boss) {
      const foe = stage.enemies[0] && this._model.get(stage.enemies[0].id);
      await ui.banner(`${foe ? foe.name : 'A guardian'} blocks the way!`, { ms: 1400, tone: 'danger' });
    }
    ui.showIntro(false);
  }

  async _finish() {
    const m = this._model;
    const result = m.result;
    this.result = result;
    if (result === 'victory') {
      await this.director.victory();
      const party = (this.ctx.state || gameState).party;
      const before = new Map(party.map((p) => [p.id, { level: p.level, xp: p.xp, xpNext: p.xpNext }]));
      const rewards = m.rewards();
      const ups = m.applyRewards();
      const members = party.map((p) => ({
        id: p.id, key: p.id, name: p.name, level: p.level, xp: p.xp, xpNext: p.xpNext, alive: p.alive,
        before: before.get(p.id), gains: ups.filter((u) => u.memberId === p.id),
      }));
      await this.ui.showResults({ xp: rewards.xp, credits: rewards.credits, items: rewards.items, members });
    } else if (result === 'defeat') {
      await this.director.defeat();
      await this.ui.showDefeat();
    } else {
      await this.stage.wait(0.25);
    }
    if (!this.active) return;
    const onEnd = this.onEnd;
    this.onEnd = null;
    onEnd?.(result);
  }

  async _auto(id) {
    await this.stage.wait(0.3);
    return (this.autoPolicy || autoAction)(this._model, id);
  }
}

/**
 * Simple party heuristic (tools / attract mode): heal or revive when needed, unload max Boost on a
 * broken foe, otherwise hit known weaknesses (it peeks at the real ones) with a modest Boost.
 */
export function autoAction(m, id) {
  const me = m.get(id);
  const menu = m.getMenu(id);
  const boostMax = m.maxBoost(id);
  const usable = menu.skills.filter((s) => s.usable);
  const allies = m.party.filter((p) => p.alive);
  const hurt = allies.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), allies[0]);
  const reviver = usable.find((s) => s.kind === 'revive');
  if (reviver && m.party.some((p) => !p.alive)) return { actorId: id, kind: 'skill', skillId: reviver.id, targetId: m.party.find((p) => !p.alive).id, boost: 0 };
  const heal = usable.find((s) => s.kind === 'heal' && s.target === 'ally');
  if (heal && hurt && hurt.hp / hurt.maxHp < 0.45) return { actorId: id, kind: 'skill', skillId: heal.id, targetId: hurt.id, boost: Math.min(1, boostMax) };
  const foes = m.enemies.filter((e) => e.alive);
  if (!foes.length) return { actorId: id, kind: 'defend' };
  const broken = foes.find((e) => e.broken);
  if (broken) {
    const big = usable.filter((s) => s.kind === 'attack' && s.target === 'enemy').sort((a, b) => b.cost - a.cost)[0];
    if (big && me.ep > big.cost * 2 && Math.random() < 0.5) return { actorId: id, kind: 'skill', skillId: big.id, targetId: broken.id, boost: boostMax };
    return { actorId: id, kind: 'attack', weapon: me.weapons[0], targetId: broken.id, boost: boostMax };
  }
  const order = [...foes].sort((a, b) => a.shield - b.shield);
  for (const f of order) {
    const weapon = me.weapons.find((w) => f.weaknesses.includes(w));
    const skill = usable.find((s) => s.kind === 'attack' && f.weaknesses.includes(s.type));
    const boost = me.bp >= 3 ? Math.min(boostMax, 2) : 0;
    if (weapon && (!skill || Math.random() < 0.55)) return { actorId: id, kind: 'attack', weapon, targetId: f.id, boost };
    if (skill) return { actorId: id, kind: 'skill', skillId: skill.id, targetId: f.id, boost: me.bp >= 4 ? 1 : 0 };
  }
  return { actorId: id, kind: 'attack', weapon: me.weapons[0], targetId: order[0].id, boost: me.bp >= 5 ? 1 : 0 };
}
