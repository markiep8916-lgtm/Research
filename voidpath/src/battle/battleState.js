// BattleState: builds the stage + UI for an encounter, drives battle/model.js turn by turn and hands
// the result back. Loop: intro (boss card and lines for encounters with `intro`) -> begin() ->
// (nextTurn() -> tips -> player command via the menu, or enemyTurn())* -> victory (defeat fx, pose,
// outro lines, results) / defeat beat / escape -> onEnd(result) once the result screen is dismissed.
//
// BattleState owns battle music: encounter.music, then encounter.phaseMusic[kind] on a transform.
// Tips (TECH_PLAN 7.7): every event played adds its keys (the event type, 'status:<stat>', 'cue:<name>',
// 'bp3', plus 'begin' and 'playerTurn'); before the next command menu the first unseen tip whose key
// matched is shown in the dialog strip and its flag set (encounter tips override ctx.content.tips).
// Battle speed comes from ctx.settings.battleSpeed (else the UI setting; 1 / 1.5 / 2). While an enemy
// acts, holding confirm plays the turn faster.

import { BattleModel } from './model.js';
import { ENCOUNTERS, SKILLS } from './data.js';
import { BattleStage } from './stage.js';
import { BattleUI } from './battleUI.js';
import { Director } from './director.js';
import { gameState } from '../core/state.js';
import { updateVfx } from '../core/vfx.js';
import { ease } from '../core/util.js';

const HALT = new Promise(() => {});
const FAST = 2.2;
const SPEEDS = [1, 1.5, 2];

/** Battle speed setting as a time scale (accepts 1 / 1.5 / 2 or '1.5x'). */
export function battleSpeed(value) {
  const n = parseFloat(value);
  return SPEEDS.includes(n) ? n : 1;
}

/**
 * Results rows for the party: only levelUp events count as level gains; learn events are listed as
 * learned skills (TECH_PLAN 7.4). before: Map id -> { level, xp, xpNext } from before the rewards.
 */
export function resultMembers(party, before, ups) {
  return party.map((p) => ({
    id: p.id, key: p.id, name: p.name, level: p.level, xp: p.xp, xpNext: p.xpNext, alive: p.alive,
    before: before.get(p.id) || { level: p.level, xp: p.xp, xpNext: p.xpNext },
    gains: ups.filter((u) => u.type === 'levelUp' && u.memberId === p.id),
    learned: ups.filter((u) => u.type === 'learn' && u.memberId === p.id).map((u) => u.name),
  }));
}

/** Tip keys an event contributes (TECH_PLAN 7.7). */
export function tipKeys(e) {
  const keys = [e.type];
  if (e.type === 'status' && e.stage !== 0) keys.push(`status:${e.stat}`);
  if (e.type === 'cue') keys.push(`cue:${e.name}`);
  if (e.type === 'bp' && e.bp >= 3) keys.push('bp3');
  return keys;
}

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
   * source for the model), backdrop (override the encounter's arena) and canFlee (passed to the model).
   */
  enter({ encounterId, boss = false, onEnd = null, rng, backdrop, canFlee } = {}) {
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
    this._tipQueue = [];
    this._tipSeen = new Set();
    // a field menu opened during the shatter must not stay over the battle (R3)
    if (ui?.menu?.isOpen) ui.menu.close();

    const state = this.ctx.state || gameState;
    const opts = { party: state.party, encounterId, rng: rng || Math.random };
    if (canFlee != null) opts.canFlee = canFlee;
    this._model = new BattleModel(opts);
    this.stage = new BattleStage(engine, { encounter, combatants: this._model.combatants });
    this.ui = new BattleUI({
      root: ui?.root || document.getElementById('ui-root'), engine, input, audio, stage: this.stage, model: this._model, fieldUI: ui,
      onBoost: (id, level, prev) => this.director.previewBoost(id, level, prev),
    });
    this.ui.autoAdvance = this.autoplay;
    this.director = new Director({ stage: this.stage, ui: this.ui, audio, engine });
    this.director.speed = battleSpeed(this.ctx.settings?.battleSpeed ?? ui?.getSetting?.('battleSpeed'));
    this.director.onEvent = (e) => {
      for (const k of tipKeys(e)) this._noteTip(k);
      this.onEvent?.(e);
    };
    this.director.onTransform = (e) => {
      const track = encounter.phaseMusic?.[e.kind];
      if (track) audio?.music(track);
    };

    const fx = engine.getFx();
    this._savedFx = { tiltShift: { ...fx.tiltShift }, bloom: { ...fx.bloom } };
    engine.setView(this.stage.scene, this.stage.camera);
    this._fxKey = '';
    this._applyFx();
    this.stage.warm();

    input?.setContext('battle');
    input?.consumeAll?.();
    ui?.hud?.setVisible(false);
    // the battle track starts on the second frame, after the compile under the cover: a long
    // main-thread stall would otherwise swallow its first beats (R8)
    this._musicIn = 2;
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
    if (this._musicIn > 0 && --this._musicIn === 0) this.ctx.audio?.music(this.encounter.music);
    const fast = this._enemyTurn && this.ctx.input?.down('confirm') ? FAST : 1;
    const sdt = dt * fast * this.timeScale * this.director.speed;
    updateVfx(sdt, t);
    this.stage.update(sdt);
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
    if (this.ui) this.ui.autoAdvance = this.autoplay;
    if (on) this.ui?.cancelChoice();
  }

  /** Battle speed setting changed (1 / 1.5 / 2). */
  setSpeed(value) {
    if (this.director) this.director.speed = battleSpeed(value);
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
    this._noteTip('begin');
    while (!m.isOver()) {
      await this._play(m.nextTurn());
      if (m.isOver()) break;
      const cur = m.current;
      if (cur && m.phase === 'playerInput') {
        this._noteTip('playerTurn');
        await this._showTip();
        if (!this.active) return;
        let events = null;
        let refused = 0;
        while (!events && !m.isOver()) {
          // an autoplay policy whose pick the model refused defends instead (no endless retries)
          const action = this.autoplay
            ? (refused ? { actorId: cur.id, kind: 'defend' } : await this._auto(cur.id))
            : await this.ui.chooseAction(cur.id);
          if (!this.active) return;
          if (this._forced) break;
          if (!action) continue;
          const ev = m.act(action);
          if (ev.length === 1 && ev[0].type === 'message') {
            refused++;
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
    const intro = this.encounter.intro;
    ui.showIntro(true);
    // a boss with an intro card gets the slow push from 1.25 to 1 under the card
    stage.cam.zoom = intro ? 1.25 : 1.16;
    stage.focus({ zoom: 1, rate: intro ? 1.7 : 2.4 });
    // nearly transparent rather than hidden, so their textures and programs warm with everything else
    for (const a of stage.enemies) a.sprite.setOpacity(0.01);
    stage.party.forEach((a, i) => {
      if (!a.alive) return;
      const from = a.home.clone().setX(a.home.x + 4);
      a.base.copy(from);
      stage.wait(0.06 * i).then(() => stage.tween(0.42, (k) => a.base.lerpVectors(from, a.home, k), ease.outCubic));
    });
    stage.enemies.forEach((a, i) => stage.wait(0.08 * i).then(() => {
      stage.particles.emit('holo', a.point('center'), { count: 16, spread: 0.4 * Math.min(3, a.size) });
      return stage.tween(0.4, (k) => a.sprite.setOpacity(Math.max(0.01, k) * (a.untargetable === 'phase' ? 0.35 : 1)), ease.outQuad);
    }));
    await stage.wait(0.55);
    if (intro) {
      await ui.bossCard({ title: intro.title || '', subtitle: intro.subtitle || '' });
      ui.showIntro(false);
      for (const line of intro.lines || []) await this._sayLine(line);
      return;
    }
    if (this.boss) {
      const foe = stage.enemies[0] && this._model.get(stage.enemies[0].id);
      await ui.banner(`${foe ? foe.name : 'A guardian'} blocks the way!`, { ms: 1400, tone: 'danger' });
    }
    ui.showIntro(false);
  }

  /** One dialog Line ({ speaker, text, portrait?, expr? } or a string) in the battle dialog strip. */
  _sayLine(line) {
    if (!this.active) return HALT;
    if (typeof line === 'string') line = { speaker: this._lastSpeaker || null, text: line, portrait: this._lastPortrait };
    let portrait = line.portrait || null;
    if (line.expr) {
      const base = portrait || this.ctx.ui?.speaker?.(line.speaker)?.portrait || String(line.speaker || '').toLowerCase();
      portrait = `${base.split(':')[0]}:${line.expr}`;
    }
    this._lastSpeaker = line.speaker ?? null;
    this._lastPortrait = portrait;
    return this.ui.say({ speaker: line.speaker ?? null, text: line.text, portrait });
  }

  // ------------------------------------------------------------------ tips

  _noteTip(key) {
    if (!this._tipSeen.has(key) && !this._tipQueue.includes(key)) this._tipQueue.push(key);
  }

  _tipFor(key) {
    const enc = (this.encounter.tips || []).find((t) => t.on === key);
    if (enc) return { lines: enc.lines || [], flag: enc.flag || null };
    const g = this.ctx.content?.tips?.[key];
    return g ? { lines: g.lines || [], flag: g.flag || `tut:${key}` } : null;
  }

  /** Shows the first unseen tip whose key matched an event, then sets its flag. */
  async _showTip() {
    const flags = (this.ctx.state || gameState).flags;
    while (this._tipQueue.length) {
      const key = this._tipQueue.shift();
      this._tipSeen.add(key);
      const tip = this._tipFor(key);
      if (!tip || !tip.lines.length || (tip.flag && flags[tip.flag])) continue;
      if (tip.flag) flags[tip.flag] = true;
      this._lastSpeaker = null;
      for (const line of tip.lines) await this._sayLine(line);
      return;
    }
  }

  // ------------------------------------------------------------------ endings

  async _finish() {
    const m = this._model;
    const result = m.result;
    this.result = result;
    if (result === 'victory') {
      await this.director.victory();
      for (const line of this.encounter.outro?.lines || []) await this._sayLine(line);
      const party = (this.ctx.state || gameState).party;
      const before = new Map(party.map((p) => [p.id, { level: p.level, xp: p.xp, xpNext: p.xpNext }]));
      const rewards = m.rewards();
      const ups = m.applyRewards();
      await this.ui.showResults({ xp: rewards.xp, credits: rewards.credits, items: rewards.items, members: resultMembers(party, before, ups) });
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
 * Simple party heuristic (tools / attract mode): heal or revive when needed, unload max Boost (or an
 * ultimate) on a broken foe, otherwise hit known weaknesses (it peeks at the real ones) with a modest
 * Boost. Targets come from validTargets; with nothing to target it defends.
 */
export function autoAction(m, id) {
  const me = m.get(id);
  const menu = m.getMenu(id);
  const boostMax = m.maxBoost(id);
  const usable = menu.skills.filter((s) => s.usable).map((s) => ({ ...s, ultimate: !!(s.ultimate || SKILLS[s.id]?.ultimate) }));
  const allies = m.party.filter((p) => p.alive);
  const hurt = allies.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), allies[0]);
  const reviver = usable.find((s) => s.kind === 'revive');
  if (reviver && m.party.some((p) => !p.alive)) return { actorId: id, kind: 'skill', skillId: reviver.id, targetId: m.party.find((p) => !p.alive).id, boost: 0 };
  const ult = usable.find((s) => s.ultimate);
  if (ult && ult.kind === 'heal' && (m.party.some((p) => !p.alive) || (hurt && hurt.hp / hurt.maxHp < 0.5))) {
    return { actorId: id, kind: 'skill', skillId: ult.id, boost: Math.min(3, boostMax) };
  }
  const heal = usable.find((s) => s.kind === 'heal' && s.target === 'ally');
  if (heal && hurt && hurt.hp / hurt.maxHp < 0.45) return { actorId: id, kind: 'skill', skillId: heal.id, targetId: hurt.id, boost: Math.min(1, boostMax) };
  const targetable = new Set(m.validTargets(id, 'enemy'));
  const foes = m.enemies.filter((e) => e.alive && targetable.has(e.id));
  if (!foes.length) return { actorId: id, kind: 'defend' };
  const broken = foes.find((e) => e.broken);
  if (broken) {
    if (ult && ult.kind === 'attack') return { actorId: id, kind: 'skill', skillId: ult.id, targetId: broken.id, boost: Math.min(3, boostMax) };
    const big = usable.filter((s) => s.kind === 'attack' && s.target === 'enemy' && !s.ultimate).sort((a, b) => b.cost - a.cost)[0];
    if (big && me.ep > big.cost * 2 && Math.random() < 0.5) return { actorId: id, kind: 'skill', skillId: big.id, targetId: broken.id, boost: boostMax };
    return { actorId: id, kind: 'attack', weapon: me.weapons[0], targetId: broken.id, boost: boostMax };
  }
  const order = [...foes].sort((a, b) => a.shield - b.shield);
  for (const f of order) {
    const weapon = me.weapons.find((w) => f.weaknesses.includes(w));
    const skill = usable.find((s) => s.kind === 'attack' && !s.ultimate && f.weaknesses.includes(s.type));
    const boost = me.bp >= 3 ? Math.min(boostMax, 2) : 0;
    if (weapon && (!skill || Math.random() < 0.55)) return { actorId: id, kind: 'attack', weapon, targetId: f.id, boost };
    if (skill) return { actorId: id, kind: 'skill', skillId: skill.id, targetId: f.id, boost: me.bp >= 4 ? 1 : 0 };
  }
  return { actorId: id, kind: 'attack', weapon: me.weapons[0], targetId: order[0].id, boost: me.bp >= 5 ? 1 : 0 };
}
