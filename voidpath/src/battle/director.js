// Battle director: plays BattleModel events as choreography. Each model call returns a list of events
// computed up front; the director walks it in order, groups an action with the results that follow it
// (hits grouped into waves by hitIndex, each hit with its reveal / shield / break / ko tail) and times
// sprites, effects, particles, sound and UI so an action resolves in about 1-1.6 s.
//
// Choreography: an action whose definition names an `fx` (ENEMIES[kind].actions[].fx, SKILLS[id].fx)
// plays the registered action fx (battle/actionfx.js); everything else falls back to the anim-based
// POC choreography. Ultimates open with ui.ultimateCut, bosses close with '<boss>.defeat' before the
// victory pose, and `cue` events go to the arena's react() and to the fx 'cue.<name>'.
//
// Telegraphs: a lockOn or charge action (or a scripted telegraph) leaves a pending threat until the
// owner uses its `fires` action (default 'annihilator_beam' for a lock-on), breaks, transforms or
// falls. A target shows the lock-on reticle (hidden while that traveler is down, shown again on
// revive); `targetId: null` shows the screen-wide warning band.
//
// `speed` (1 / 1.5 / 2, the Battle speed setting) is read by BattleState to scale battle time.

import * as THREE from 'three';
import { ease } from '../core/util.js';
import { hasPreset } from '../core/particles.js';
import { DAMAGE_COLORS } from '../art/palette.js';
import { ENEMIES, SKILLS } from './data.js';
import { getActionFx } from './actionfx.js';

const ELEMENTS = new Set(['thermal', 'cryo', 'volt', 'photon', 'void']);
// effects whose art stands on the ground: anchor near the bottom of the frame and place at the feet
const GROUND = { thermal: 0.9, photon: 0.86, heal: 0.88 };
// seconds from the start of an enemy's attack anim to the moment it fires
const FIRE_AT = { drone: 0.14, crawler: 0.14, turret: 0.12, sentinel: 0.42 };
const STRIKE_TAIL = new Set(['reveal', 'shield', 'break', 'message', 'ko', 'bp']);
const SINGLE = new Set(['roundStart', 'orderUpdate', 'turnStart', 'boost', 'defend', 'flee', 'victory', 'defeat', 'levelUp']);
const BLOCK_END = new Set(['action', 'turnStart', 'roundStart', 'orderUpdate', 'victory', 'defeat', 'flee', 'defend', 'boost']);
const ENEMY_ANIMS = new Set(['enemyShot', 'enemyMelee', 'enemyBeam', 'enemyCharge', 'enemySpit']);
const QUIET_KINDS = new Set(['buff', 'heal', 'summon', 'submerge', 'lockOn', 'charge']);
const STREAK = { rifle: '#ffd28a', cryo: '#9fe9ff', void: '#c38bff', null: '#ffd28a' };
const ENEMY_SHOT = { thermal: '#ff7a3a', void: '#c06bff', rifle: '#ffcf7a', photon: '#fff2b0', null: '#ff5a6a' };
const BOOST_COLOR = '#ffb347';
const STAT_LABEL = { atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', spd: 'SPD', taunt: 'TAUNT', sleep: 'SLEEP', jam: 'JAMMED', marked: 'MARKED' };
const AILMENT_TINT = { sleep: '#a9b6ff' };
const CHARGE_GLOW = '#ff3b4e';

const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _d = new THREE.Color();
const _e = new THREE.Color();

const preset = (name, fallback) => (hasPreset(name) ? name : fallback);

/** Splits the events after an 'action' into hit waves (by hitIndex) of strikes, plus the rest. */
export function splitAction(rest) {
  const waves = [];
  const post = [];
  let wave = null, strike = null;
  for (const ev of rest) {
    if (ev.type === 'hit') {
      if (!wave || ev.hitIndex !== wave.index) {
        wave = { index: ev.hitIndex, strikes: [] };
        waves.push(wave);
      }
      strike = { hit: ev, after: [] };
      wave.strikes.push(strike);
    } else if (strike && STRIKE_TAIL.has(ev.type)) strike.after.push(ev);
    else post.push(ev);
  }
  return { waves, post };
}

/** The enemy action definition behind an action event (or null). */
export function enemyActionDef(kind, actionId) {
  return ENEMIES[kind]?.actions?.find((a) => a.id === actionId) || null;
}

export class Director {
  constructor({ stage, ui, audio, engine }) {
    this.stage = stage;
    this.ui = ui;
    this.audio = audio;
    this.engine = engine;
    this.threat = null;        // pending lock-on / charge: { owner, target, fires, text }
    this.defeated = [];        // bosses whose '<boss>.defeat' fx plays before the victory pose
    this.speed = 1;            // Battle speed setting (BattleState scales battle time with it)
    this.onEvent = null;       // optional hook(event) for tools and tips
    this.onTransform = null;   // hook(event): BattleState switches phase music
  }

  get effects() { return this.stage.effects; }
  get particles() { return this.stage.particles; }

  sfx(name, opts) {
    this.audio?.sfx(name, opts);
  }

  wait(sec) { return this.stage.wait(sec); }

  actor(id) { return this.stage.actor(id); }

  /** World position of an actor's named point (fx helper). */
  pos(id, point = 'center') {
    return this.actor(id)?.point(point) || null;
  }

  // ------------------------------------------------------------------ event walk

  async play(events) {
    for (let i = 0; i < events.length;) {
      const e = events[i];
      if (e.type === 'action') {
        this.onEvent?.(e);
        let j = i + 1;
        while (j < events.length && !BLOCK_END.has(events[j].type)) j++;
        await this.action(e, events.slice(i + 1, j));
        i = j;
      } else {
        await this.result(e, null);
        i++;
      }
    }
  }

  async single(e) {
    const { ui } = this;
    switch (e.type) {
      case 'roundStart': ui.setRound(e.round, e.order, e.nextOrder); break;
      case 'orderUpdate': ui.setOrder(e.order, e.nextOrder); break;
      case 'turnStart': await this.turnStart(e.actorId); break;
      case 'boost': this.boostBurst(e.actorId, e.level); break;
      case 'defend': await this.defend(e.actorId); break;
      case 'flee': await this.flee(e.success); break;
      default: break; // victory / defeat / levelUp: staged by BattleState once the model is over
    }
  }

  // ------------------------------------------------------------------ turns

  async turnStart(id) {
    const a = this.actor(id);
    this.ui.setActive(id);
    this.stage.readyId = a && a.side === 'party' ? id : null;
    if (!a) return;
    if (a.side === 'party') {
      if (a.idleAnim === 'defend') a.idleAnim = 'idle';
      a.rest('ready');
      this.stage.move(a, this.stage.readyPos(a), 0.16, ease.outCubic);
      this.stage.focus({ shiftX: 0.25, zoom: 0.985, rate: 2.5 });
      await this.wait(0.08);
    } else {
      this.stage.focus({ shiftX: -0.25, zoom: 0.985, rate: 2.5 });
      this._pulse(a, '#ff6b7d', 0.34);
      await this.wait(0.16);
    }
  }

  /** Live boost preview while the player picks a command (aura + rising motes). */
  previewBoost(id, level, prev) {
    const a = this.actor(id);
    if (!a) return;
    this._setAura(a, level);
    this.stage.focus({ shiftX: 0.25 + level * 0.12, zoom: 0.985 - level * 0.014, rate: 5 });
    if (level > prev) {
      this.sfx('boost', { pitch: level, pan: this.stage.pan(a.object3d.position) });
      this.particles.emit('boost', a.object3d.position, { count: 10 + level * 6 });
      a.sprite.flash('#ffd58a', 0.12);
    } else if (level < prev) this.sfx('boostDown');
  }

  /** Brief multiply-tint pulse from the actor's own tint (enemy turn cue; a full flash reads as a hit). */
  _pulse(a, color, dur) {
    _e.set(color);
    this.stage.tween(dur, (k) => {
      if (a.alive === false) return;
      _d.set(a.tint || '#ffffff').lerp(_e, Math.sin(Math.PI * k));
      a.sprite.setTint(_d);
    }).then(() => { if (a.alive !== false) this._restTint(a); });
  }

  _restTint(a) {
    const sleep = a.status?.has('sleep');
    if (sleep && a.alive) a.sprite.setTint(AILMENT_TINT.sleep);
    else if (a.untargetable === 'phase') a.sprite.setTint('#e6b8ff');
    else a.restTint();
  }

  _setAura(a, level) {
    a.sprite.setGlow(level > 0 ? BOOST_COLOR : a.glowColor || null, level > 0 ? 0.7 + level * 0.8 : a.glowStrength || 1);
    if (level > 0) {
      if (!a.aura) a.aura = this.particles.addEmitter('boost', { position: a.object3d.position, area: [0.2, 0, 0.2], rate: 8 * level });
      a.aura.rate = 8 * level;
    } else if (a.aura) {
      a.aura.remove();
      a.aura = null;
    }
  }

  boostBurst(id, level) {
    const a = this.actor(id);
    if (!a) return;
    this._setAura(a, level);
    this.particles.emit('boost', a.object3d.position, { count: 18 + level * 8, speed: 1.4 });
    this.effects.sheet('ring', a.point('center'), { scale: 1 + level * 0.25, color: BOOST_COLOR, intensity: 2 });
    this.sfx('boost', { pitch: level });
    this.ui.label(id, a.point('top'), `BOOST ${'▲'.repeat(level)}`, 'boost');
  }

  _clearBoost(a) {
    this._setAura(a, 0);
  }

  // ------------------------------------------------------------------ actions

  /** The registered choreography for an action event (or null for the POC fallback). */
  _fxFor(a, e) {
    if (a.side === 'party') return e.skillId ? getActionFx(SKILLS[e.skillId]?.fx) : null;
    return getActionFx(enemyActionDef(a.key, e.actionId)?.fx);
  }

  async action(e, rest) {
    const a = this.actor(e.actorId);
    const { waves, post } = splitAction(rest);
    if (!a) {
      for (const w of waves) for (const s of w.strikes) await this.strike(s, null);
      await this.results(post, null);
      return;
    }
    if (a.side === 'party') {
      const skill = e.skillId ? SKILLS[e.skillId] : null;
      if (skill?.ultimate) await this.ui.ultimateCut(a.id, e.name);
      else if (e.kind !== 'attack') this.ui.actionName(e.name, 'party', e.damageType);
      const fx = this._fxFor(a, e);
      if (fx) await fx(this, { actor: a, event: e, waves, post, def: skill });
      else if (e.kind === 'item') await this.support(a, e, post, 'item');
      else if (e.anim === 'shot') await this.partyShot(a, e, waves, post);
      else if (e.anim === 'cast') await this.partyCast(a, e, waves, post);
      else if (e.anim === 'heal' || e.anim === 'buff') await this.support(a, e, post, e.anim);
      else await this.partyMelee(a, e, waves, post);
      this._clearBoost(a);
      await this.returnHome(a);
      return;
    }
    const def = enemyActionDef(a.key, e.actionId);
    this._threatOnAction(a, e, def);
    this.ui.actionName(e.name, 'enemy', e.damageType);
    const fx = this._fxFor(a, e);
    if (fx) await fx(this, { actor: a, event: e, waves, post, def });
    else if (e.anim === 'enemyMelee') await this.enemyMelee(a, e, waves, post, def);
    else if (e.anim === 'enemyBeam') await this.enemyBeam(a, e, waves, post, def);
    else if (e.anim === 'enemyCharge' || (!ENEMY_ANIMS.has(e.anim) && QUIET_KINDS.has(e.kind))) await this.enemyCharge(a, e, post);
    else await this.enemyShot(a, e, waves, post, def);
    if (this.threat?.owner === a.id && this.threat.fired) this._clearThreat();
    this.stage.focus();
  }

  async returnHome(a) {
    if (!a.alive) return;
    if (a.base.distanceToSquared(a.home) > 1e-4) {
      if (a.idleAnim !== 'defend') a.sprite.play('ready');
      await this.stage.move(a, a.home, 0.2, ease.outCubic);
    }
    if (a.idleAnim === 'ready') a.idleAnim = 'idle';
    if (!a.hurtT) a.rest();
    this.stage.focus();
  }

  /** Weapon / element effects on a target for one strike. */
  strikeFx(fx, type, target, attacker, w) {
    const { effects, particles } = this;
    const c = target.point('center', _p);
    c.x += (Math.random() - 0.5) * 0.25 * target.size;
    c.y += (Math.random() - 0.5) * 0.3 * target.size;
    const s = Math.min(2.4, 0.9 + target.size * 0.35);
    const flip = attacker ? attacker.side === 'party' : false;
    if (fx) effects.sheet(fx, c, { scale: s * (fx === 'thrust' ? 1.35 : 1.25), flip, rot: fx === 'slash' ? (w % 2 ? 0.9 : -0.25) : 0, intensity: 1.9 });
    effects.sheet('impact', c, { scale: s * 0.72, color: DAMAGE_COLORS[type] || '#ffffff', intensity: 1.25 });
    if (ELEMENTS.has(type)) this.elementFx(type, target, s);
    else particles.emit('spark', c, { count: 8, direction: [flip ? -1 : 1, 0.6, 0.2] });
  }

  elementFx(type, target, s = 1) {
    const { effects, particles } = this;
    const ground = GROUND[type];
    const at = ground ? target.point('feet', _q).add(_p.set(0, 0, 0.3)) : target.point('center', _q);
    effects.sheet(type, at.clone(), { scale: s * 1.3, anchor: [0.5, ground || 0.5], intensity: 1.55 });
    particles.emit(type, target.point('center', _p), { count: Math.round(14 * Math.min(2, target.size)) });
  }

  async partyMelee(a, e, waves, post) {
    const target = this.actor(e.targets[0]) || this.stage.enemies.find((x) => x.alive && !x.untargetable);
    a.sprite.play('ready');
    if (target) await this.stage.move(a, this.stage.strikePos(a, target), 0.17, ease.inCubic);
    for (let w = 0; w < waves.length; w++) {
      a.sprite.play('attack', { restart: true });
      this.sfx(e.anim, { pan: this.stage.pan(a.object3d.position), pitch: 1 + w * 0.05 });
      await this.wait(0.07);
      for (const s of waves[w].strikes) {
        const t = this.actor(s.hit.targetId);
        if (t) this.strikeFx(e.anim, e.damageType, t, a, w);
        await this.strike(s, a);
      }
      await this.wait(w < waves.length - 1 ? 0.12 : 0.22);
    }
    await this.results(post, a);
  }

  async partyShot(a, e, waves, post) {
    const color = STREAK[e.damageType] || STREAK.null;
    const fire = () => {
      a.sprite.play('shoot', { restart: true });
      this.sfx('shot', { pan: this.stage.pan(a.object3d.position) });
    };
    const muzzleFx = () => {
      const m = a.point('muzzle');
      this.effects.sheet('muzzle', m, { flip: true, scale: 1.2, anchor: [0.15, 0.5], intensity: 2.2 });
      this.particles.emit('spark', m, { count: 5, direction: [-1, 0.2, 0], speed: 0.6 });
      return m;
    };
    fire();
    await this.wait(0.08);
    if (!waves.length) {
      const m = muzzleFx();
      await Promise.all(e.targets.map((id) => { const t = this.actor(id); return t ? this.effects.streak(m, t.point('center'), { color: '#c38bff' }) : null; }));
      await this.results(post, a);
      await this.wait(0.25);
      return;
    }
    for (let w = 0; w < waves.length; w++) {
      if (w > 0) { fire(); await this.wait(0.06); }
      const m = muzzleFx();
      const strikes = waves[w].strikes;
      await Promise.all(strikes.map((s, i) => this.wait(i * 0.04).then(async () => {
        const t = this.actor(s.hit.targetId);
        if (t) {
          await this.effects.streak(m, t.point('center'), { color, dur: 0.08 });
          this.strikeFx(null, e.damageType, t, a, w);
        }
        await this.strike(s, a);
      })));
      await this.wait(w < waves.length - 1 ? 0.1 : 0.2);
    }
    await this.results(post, a);
  }

  async partyCast(a, e, waves, post) {
    const type = e.damageType;
    const color = DAMAGE_COLORS[type] || '#ffffff';
    a.sprite.play('cast', { restart: true });
    this.sfx('cast', { pan: this.stage.pan(a.object3d.position) });
    const hand = a.point('hand');
    this.effects.sheet('glint', hand, { scale: 1.6, color, intensity: 2.4 });
    this.particles.emit(ELEMENTS.has(type) ? type : 'photon', hand, { count: 6, size: 0.6, speed: 0.4 });
    await this.wait(0.34);
    for (let w = 0; w < waves.length; w++) {
      const seen = new Set();
      for (const s of waves[w].strikes) {
        const t = this.actor(s.hit.targetId);
        if (!t || seen.has(t.id)) continue;
        seen.add(t.id);
        this.elementFx(type, t, Math.min(2.4, 0.9 + t.size * 0.35));
      }
      await this.wait(0.1);
      for (const s of waves[w].strikes) await this.strike(s, a);
      await this.wait(w < waves.length - 1 ? 0.24 : 0.28);
    }
    await this.results(post, a);
  }

  /** Heals, buffs, revives and items on allies (or Provoke on self). */
  async support(a, e, post, kind) {
    a.sprite.play(kind === 'item' ? 'item' : 'cast', { restart: true });
    if (kind !== 'item') this.sfx('cast', { pan: this.stage.pan(a.object3d.position) });
    this.effects.sheet('glint', a.point('hand'), { scale: 1.4, color: kind === 'buff' ? '#ffd27a' : '#a9f7c4', intensity: 2.2 });
    await this.wait(0.3);
    if (kind !== 'buff') {
      for (const id of e.targets) {
        const t = this.actor(id);
        if (!t) continue;
        const feet = t.point('feet').add(_p.set(0, 0, 0.3));
        this.effects.sheet('heal', feet, { scale: 1.5, anchor: [0.5, GROUND.heal], intensity: 1.8 });
        this.particles.emit('heal', t.object3d.position, { count: 12 });
      }
      await this.wait(0.16);
    }
    await this.results(post, a);
    await this.wait(0.3);
  }

  async enemyShot(a, e, waves, post, def) {
    const spit = e.anim === 'enemySpit';
    const color = spit ? '#9dff7a' : ENEMY_SHOT[e.damageType] || ENEMY_SHOT.null;
    a.oneShot(def?.pose || 'attack');
    await this.wait(FIRE_AT[a.art] ?? 0.14);
    const m = a.point('muzzle');
    this.sfx('enemyShot', { pan: this.stage.pan(m) });
    this.effects.sheet('muzzle', m, { scale: 0.8 + Math.min(2, a.size) * 0.25, anchor: [0.15, 0.5], color, intensity: 2.2 });
    const big = a.size >= 2.5;
    for (const wave of waves) {
      await Promise.all(wave.strikes.map((s, i) => this.wait(i * 0.07).then(async () => {
        const t = this.actor(s.hit.targetId);
        if (t) {
          const to = t.point('center');
          if (spit) await this.effects.orb(m, to, { color, size: 0.6, dur: 0.3, arc: 1.1, trail: 'void', trailColor: '#7dff8a' });
          else if (big) await this.effects.orb(m, to, { color, size: 1.3, dur: 0.24, trail: 'ember' });
          else await this.effects.streak(m, to, { color, dur: 0.11, length: 1.3, width: 0.34 });
          this.effects.sheet('impact', to, { scale: big ? 1.6 : 1.1, color, intensity: 2 });
          if (ELEMENTS.has(e.damageType)) this.particles.emit(e.damageType, to, { count: 10 });
        }
        await this.strike(s, a);
      })));
    }
    if (!waves.length) await this.wait(0.2);
    await this.results(post, a);
    await this.wait(0.22);
  }

  async enemyBeam(a, e, waves, post, def) {
    const heavy = !!this.threat && this.threat.owner === a.id && this.threat.fires === e.actionId;
    const color = heavy ? '#c06bff' : e.damageType === 'photon' ? '#fff0a0' : '#ff4f6a';
    const m = a.point(heavy && a.points.core ? 'core' : 'muzzle');
    if (heavy) {
      // the beam re-acquires whoever it really hits (the lock target may have fallen)
      if (e.targets[0]) this.threat.target = e.targets[0];
      this._showReticle();
      this.sfx('charge');
      a.sprite.setGlow('#c06bff', 2);
      this.particles.emit('void', m, { count: 40, spread: 1.6 });
      this.stage.focus({ shiftX: -0.6, zoom: 0.95, rate: 5 });
      await this.wait(0.55);
    }
    a.oneShot(def?.pose || 'attack');
    await this.wait(FIRE_AT[a.art] ?? 0.14);
    this.sfx('enemyBeam', { pan: this.stage.pan(m) });
    this.effects.sheet('ring', m, { scale: heavy ? 2.4 : 1.2, color, intensity: 2.2 });
    if (!waves.length) {
      for (const id of e.targets) {
        const t = this.actor(id);
        if (t) this.effects.beam(m, t.point('center'), { color: '#ff3b4e', width: 0.12, dur: 0.4 });
      }
      await this.wait(0.3);
    }
    for (const wave of waves) {
      for (const s of wave.strikes) {
        const t = this.actor(s.hit.targetId);
        if (t) {
          const to = t.point('center');
          this.effects.beam(m, to, { color, width: heavy ? 1.3 : 0.42, dur: heavy ? 0.75 : 0.34, intensity: heavy ? 3 : 2.6 });
          if (heavy) {
            this.engine.flash('#b06bff', 0.35, 0.55);
            this.engine.shake(0.24, 0.5);
            this.particles.emit('void', to, { count: 40 });
          }
          await this.wait(heavy ? 0.16 : 0.07);
          this.effects.sheet('impact', to, { scale: heavy ? 2 : 1.2, color, intensity: 2.2 });
        }
        await this.strike(s, a);
        await this.wait(heavy ? 0.4 : 0.09);
      }
    }
    if (heavy) a.sprite.setGlow(a.overcharged ? '#ff3b4e' : a.glowColor || null, 0.7);
    await this.results(post, a);
    await this.wait(0.2);
  }

  async enemyMelee(a, e, waves, post, def) {
    const target = this.actor(e.targets[0]);
    if (target) await this.stage.move(a, this.stage.strikePos(a, target), 0.2, ease.inCubic);
    a.oneShot(def?.pose || 'attack');
    this.sfx('enemyMelee', { pan: this.stage.pan(a.object3d.position) });
    await this.wait(0.12);
    for (const wave of waves) {
      for (const s of wave.strikes) {
        const t = this.actor(s.hit.targetId);
        if (t) this.strikeFx('slash', e.damageType, t, a, 0);
        await this.strike(s, a);
      }
      await this.wait(0.12);
    }
    await this.results(post, a);
    await this.wait(0.12);
    if (a.alive) await this.stage.move(a, a.home, 0.24, ease.outCubic);
  }

  /** Charge-ups: buffs, heals, summons, submerges, lock-ons and charges. */
  async enemyCharge(a, e, post) {
    const core = a.point(a.points.core ? 'core' : 'center');
    const hostile = e.kind === 'buff' || e.kind === 'lockOn' || e.kind === 'charge';
    const color = hostile ? '#ff4f6a' : e.kind === 'heal' ? '#7dffb0' : '#9fe9ff';
    this.sfx('charge', { pan: this.stage.pan(core) });
    a.sprite.flash(color, 0.4);
    a.sprite.setGlow(hostile ? '#ff3b4e' : color, 1.6);
    if (a.has('special')) a.oneShot('special');
    this.particles.emit(hostile ? 'void' : 'holo', core, { count: 34, spread: 1.4 });
    this.effects.sheet('ring', core, { scale: 1.2 * Math.min(2.4, a.size), color, intensity: 2 });
    await this.wait(0.5);
    if (e.kind === 'buff' && e.actionId === 'overcharge') a.overcharged = true;
    if (e.kind === 'charge') a.glowColor = CHARGE_GLOW;
    a.sprite.setGlow(a.overcharged ? '#ff3b4e' : a.glowColor || null, a.glowColor ? 1.2 : 0.7);
    await this.results(post, a);
    await this.wait(0.15);
  }

  // ------------------------------------------------------------------ threats (lock-on, charge)

  _threatOnAction(a, e, def) {
    const t = this.threat;
    if (e.kind === 'lockOn' || e.kind === 'charge') {
      this.threat = { owner: a.id, target: null, fires: def?.fires || (e.kind === 'lockOn' ? 'annihilator_beam' : null), text: '', fired: false };
      return;
    }
    if (!t || t.owner !== a.id) return;
    if (t.fires == null) {
      // a scripted telegraph: the action right after it names its follow-up with `then`
      if (def?.then) t.fires = def.then;
      else t.fired = true;
    } else if (t.fires === e.actionId) t.fired = true;
  }

  async telegraph(e) {
    const t = this.threat && this.threat.owner === e.actorId ? this.threat : (this.threat = { owner: e.actorId, target: null, fires: null, fired: false });
    t.target = e.targetId ?? null;
    t.text = e.text;
    this.sfx('charge');
    const owner = this.actor(e.actorId);
    if (t.target == null) {
      if (owner) {
        owner.glowColor = CHARGE_GLOW;
        owner.sprite.setGlow(CHARGE_GLOW, 1.2);
      }
      this.engine.flash('#ff2a3c', 0.25, 0.35);
      this.ui.setReticle(null);
      await this.ui.chargeBand(e.text);
      return;
    }
    this._showReticle();
    const tgt = this.actor(t.target);
    if (tgt) tgt.sprite.flash('#ff3b4e', 0.4);
    await this.ui.banner(e.text, { ms: 1300, tone: 'danger' });
  }

  _showReticle() {
    const t = this.threat;
    const a = t?.target ? this.actor(t.target) : null;
    this.ui.setReticle(a && a.alive ? t.target : null);
  }

  _clearThreat() {
    const t = this.threat;
    if (!t) return;
    this.threat = null;
    this.ui.setReticle(null);
    this.ui.chargeBand(null);
    const owner = this.actor(t.owner);
    if (owner && owner.glowColor === CHARGE_GLOW) {
      owner.glowColor = null;
      owner.sprite.setGlow(owner.overcharged ? '#ff3b4e' : null, 0.7);
    }
  }

  /** POC compatibility for tools: { owner, target } of the pending lock-on. */
  get lock() {
    return this.threat && this.threat.target ? { owner: this.threat.owner, target: this.threat.target } : null;
  }

  setLock(lock) {
    if (!lock) this._clearThreat();
    else {
      this.threat = { owner: lock.owner, target: lock.target, fires: 'annihilator_beam', fired: false };
      this._showReticle();
    }
  }

  // ------------------------------------------------------------------ results

  /** One hit plus its tail (reveal, shield, break, ko, bp, message). */
  async strike(s, attacker) {
    this.hit(s.hit);
    for (const ev of s.after) await this.result(ev, attacker);
  }

  async results(list, attacker) {
    const shown = new Set();
    for (const ev of list) await this.result(ev, attacker, shown);
  }

  hit(e) {
    this.onEvent?.(e);
    const t = this.actor(e.targetId);
    if (!t) return;
    const { stage, ui } = this;
    const c = t.point('center');
    const dir = t.side === 'enemy' ? -1 : 1;
    t.sprite.flash(e.weak ? '#ffe066' : e.crit ? '#ffd2a0' : '#ffffff', e.weak || e.crit ? 0.2 : 0.13);
    this.particles.emit('hit', c, { direction: [dir, 0.4, 0.3], count: e.crit ? 22 : e.weak ? 16 : 11, size: 0.75, color: e.weak ? '#ffe9a0' : null });
    const big = e.crit || e.amount > 900;
    this.engine.shake(big ? 0.16 : e.weak ? 0.11 : 0.065, big ? 0.3 : 0.2);
    if (e.crit || e.broken || e.weak) this.engine.hitStop(e.crit ? 70 : e.broken ? 45 : 35);
    if (e.crit) this.engine.flash('#fff2d8', 0.12, 0.22);
    const pan = stage.pan(c);
    this.sfx(e.crit ? 'crit' : 'impact', { pan });
    if (e.weak) this.sfx('weak', { pan });
    if (t.alive && t.idleAnim !== 'break') t.hurt(t.side === 'party' ? 0.34 : 0.24);
    if (t.alive) stage.knock(t, dir, (e.crit ? 0.42 : 0.26) / Math.sqrt(t.size));
    ui.number(t.id, t.point('top'), e.amount, 'dmg', { weak: e.weak, crit: e.crit, index: e.hitIndex, count: e.hitCount });
    ui.setHp(t.id, e.hpAfter);
  }

  async result(e, attacker, shown = null) {
    if (e.type === 'hit') {
      this.hit(e);
      return;
    }
    this.onEvent?.(e);
    if (SINGLE.has(e.type)) {
      await this.single(e);
      return;
    }
    const { ui, stage } = this;
    const t = this.actor(e.targetId ?? e.actorId);
    switch (e.type) {
      case 'reveal':
        ui.reveal(e.targetId, e.damageType);
        break;
      case 'shield': {
        ui.setShield(e.targetId, e.shield, e.maxShield);
        if (e.shield > 0) {
          this.sfx('shieldCrack', { pan: t ? stage.pan(t.object3d.position) : 0 });
          if (t) this.effects.sheet('glint', t.point('center'), { scale: 1.3, color: '#bfe6ff', intensity: 2.4 });
        }
        break;
      }
      case 'break':
        stage.react(e);
        await this.breakSeq(e.targetId);
        break;
      case 'message':
        if (this.threat && /lock-on|charge|disrupt/i.test(e.text)) this._clearThreat();
        await ui.banner(e.text, { ms: 1100 });
        break;
      case 'ko': await this.ko(e.targetId); break;
      case 'bp': ui.setBp(e.actorId, e.bp, e.delta); break;
      case 'ep':
        ui.setEp(e.targetId, e.epAfter);
        if (e.amount > 0 && t) {
          ui.number(e.targetId, t.point('top'), e.amount, 'ep');
          this.sfx('heal', { pitch: 1.2 });
        }
        break;
      case 'heal':
        if (!t) break;
        ui.setHp(e.targetId, e.hpAfter);
        ui.number(e.targetId, t.point('top'), e.amount, 'heal');
        t.sprite.flash('#a9f7c4', 0.25);
        this.sfx('heal', { pan: stage.pan(t.object3d.position) });
        break;
      case 'revive':
        if (!t) break;
        t.alive = true;
        this._restTint(t);
        t.rest('idle');
        t.sprite.flash('#d4fff0', 0.35);
        this.effects.sheet('heal', t.point('feet').add(_p.set(0, 0, 0.3)), { scale: 1.6, anchor: [0.5, GROUND.heal] });
        this.particles.emit('heal', t.object3d.position, { count: 20 });
        ui.setKO(e.targetId, false);
        ui.setHp(e.targetId, e.hpAfter);
        ui.number(e.targetId, t.point('top'), 'REVIVED', 'heal');
        this.sfx('heal');
        // a revived lock-on target is still the target: show the reticle again (R16)
        if (this.threat?.target === e.targetId) this._showReticle();
        break;
      case 'status': await this.status(e, t, shown); break;
      case 'telegraph': await this.telegraph(e); break;
      case 'recover': await this.recover(e); break;
      case 'say': await ui.say({ speaker: e.speaker, text: e.text, portrait: e.portrait }); break;
      case 'summon': await this.summon(e); break;
      case 'transform': await this.transform(e); break;
      case 'untargetable': await this.untargetable(e); break;
      case 'weakShift': await this.weakShift(e); break;
      case 'skip': await this.skip(e); break;
      case 'learn': await this.learn(e); break;
      case 'ultimateReady': await this.ultimateReady(e); break;
      case 'cue': await this.cue(e); break;
      default:
    }
  }

  async status(e, t, shown) {
    const { ui, stage } = this;
    ui.setStatus(e.targetId, e.stat, e.stage, e.turns);
    if (!t) return;
    t.status ||= new Set();
    if (e.stage === 0) {
      t.status.delete(e.stat);
      if (e.stat === 'atk' && t.overcharged) { t.overcharged = false; t.sprite.setGlow(t.glowColor || null); }
      if (e.stat === 'sleep' && t.alive) {
        this._restTint(t);
        ui.label(t.id, t.point('top'), 'AWAKE', 'info');
        this.sfx('wake');
      }
      return;
    }
    t.status.add(e.stat);
    const up = e.stage > 0;
    const ailment = e.stat === 'sleep' || e.stat === 'jam' || e.stat === 'marked';
    const first = !shown || !shown.has(t.id);
    shown?.add(t.id);
    const arrow = e.stat === 'taunt' || ailment ? '' : up ? '▲' : '▼';
    ui.label(t.id, t.point('top'), `${STAT_LABEL[e.stat] || e.stat.toUpperCase()} ${arrow}`.trim(), ailment ? 'ailment' : up ? 'buff' : 'debuff');
    if (e.stat === 'sleep') {
      this._restTint(t);
      this.particles.emit(preset('mote', 'holo'), t.point('top'), { count: 10, color: '#a9b6ff' });
      this.sfx('sleep');
    }
    if (first) {
      this.effects.sheet(ailment || !up ? 'debuff' : 'buff', t.point('center'), { scale: 1.4 * Math.min(1.8, t.size), intensity: 1.9 });
      if (!ailment || e.stat !== 'sleep') this.sfx(up && !ailment ? 'buff' : 'debuff', { pan: stage.pan(t.object3d.position) });
      await this.wait(0.1);
    }
  }

  async breakSeq(id) {
    const t = this.actor(id);
    const { stage, engine, ui } = this;
    this.sfx('break');
    ui.setBroken(id, true);
    if (this.threat?.owner === id) this._clearThreat();
    if (!t) return;
    const c = t.point(t.points.core ? 'core' : 'center');
    engine.hitStop(130);
    engine.flash('#ff4fa3', 0.24, 0.6);
    engine.shake(0.2, 0.42);
    t.rest('break');
    t.sprite.flash('#ff4fa3', 0.3);
    this.particles.emit('break', c, { count: Math.round(24 * Math.min(2, t.size)) });
    this.effects.shards(c, { count: 10, scale: Math.sqrt(t.size) });
    this.effects.sheet('ring', c, { scale: 1.6 * Math.sqrt(t.size), color: '#ff63b6', intensity: 2.6 });
    this.effects.sheet('ring', t.object3d.position.clone().setY(0.03), { floor: true, scale: 3 * Math.sqrt(t.size), color: '#ff4fa3', intensity: 2.2 });
    if (t.emitter) t.emitter.remove();
    t.emitter = this.particles.addEmitter('spark', { position: t.point('center'), area: [t.halfW, 0.6 * t.size, 0.2], rate: 1.4, burst: 7 });
    ui.breakCallout(id, t.point('center'));
    stage.focus({ shiftX: t.home.x * 0.08, zoom: 0.93, rate: 9 });
    await this.wait(0.5);
    stage.focus({ rate: 3 });
  }

  async recover(e) {
    const t = this.actor(e.targetId);
    this.ui.setBroken(e.targetId, false);
    this.ui.setShield(e.targetId, e.shield, e.maxShield ?? e.shield, { restore: true });
    if (!t) return;
    this.sfx('recover', { pan: this.stage.pan(t.object3d.position) });
    t.rest('idle');
    t.sprite.flash('#7fe3ff', 0.35);
    if (t.emitter) { t.emitter.remove(); t.emitter = null; }
    const c = t.point('center');
    this.effects.sheet('ring', c, { scale: 1.4 * Math.sqrt(t.size), color: '#7fe3ff', intensity: 2.2 });
    this.particles.emit('holo', c, { count: 20, spread: 0.5 * t.size });
    this.ui.label(e.targetId, t.point('top'), 'SHIELD RESTORED', 'info');
    await this.wait(0.35);
  }

  /** '<boss>.defeat' choreography for a fallen enemy, if one is registered. */
  _defeatFx(a) {
    const d = a.def || {};
    const ids = [d.script && `${d.script}.defeat`, `${a.key}.defeat`, `${a.art}.defeat`, `${a.key.split('_')[0]}.defeat`];
    for (const id of ids) {
      const fx = id && getActionFx(id);
      if (fx) return fx;
    }
    return null;
  }

  async ko(id) {
    const t = this.actor(id);
    this.ui.setKO(id, true);
    if (!t) return;
    t.alive = false;
    if (t.emitter) { t.emitter.remove(); t.emitter = null; }
    this._setAura(t, 0);
    this.sfx('ko', { pan: this.stage.pan(t.object3d.position) });
    if (this.threat?.owner === id) this._clearThreat();
    // a fallen lock target keeps the lock: the reticle hides until a revive (R16)
    else if (this.threat?.target === id) this.ui.setReticle(null);
    if (t.side === 'party') {
      t.rest('ko');
      t.sprite.setTint('#7d8699');
      t.sprite.flash('#ff5a6a', 0.3);
      return;
    }
    // bosses with a defeat choreography stay on stage for it (played before the victory pose)
    const defeat = this._defeatFx(t);
    if (defeat) {
      t.defeatFx = defeat;
      this.defeated.push(t);
      t.sprite.flash('#ffffff', 0.4);
      t.rest(t.has('break') ? 'break' : 'idle');
      this.engine.hitStop(160);
      this.engine.flash('#ffffff', 0.3, 0.5);
      this.ui.removeFoe(id);
      await this.wait(0.3);
      return;
    }
    this._dissolve(t);
    await this.wait(0.12);
  }

  /** Enemies dissolve into the void. */
  _dissolve(t) {
    t.sprite.setGlow(null);
    t.sprite.flash('#ffffff', 0.25);
    const c = t.point('center');
    this.particles.emit('void', c, { count: Math.round(26 * Math.min(2.2, t.size)), spread: 0.9 * t.size });
    this.particles.emit('smoke', t.object3d.position, { count: 6 + Math.round(4 * t.size) });
    this.effects.sheet('void', c, { scale: 1.2 * Math.sqrt(t.size), intensity: 1.8 });
    return this.stage.tween(0.7, (k) => t.sprite.setOpacity((1 - k) * (t.untargetable === 'phase' ? 0.35 : 1)), ease.inQuad).then(() => this.ui.removeFoe(t.id));
  }

  async defend(id) {
    const a = this.actor(id);
    if (!a) return;
    this.sfx('defend', { pan: this.stage.pan(a.object3d.position) });
    a.rest('defend');
    this.effects.sheet('ring', a.point('center'), { scale: 1.3, color: '#7fe3ff', intensity: 2 });
    this.particles.emit('holo', a.point('center'), { count: 14, spread: 0.4 });
    this.ui.label(id, a.point('top'), 'DEFEND', 'info');
    this._clearBoost(a);
    await this.stage.move(a, a.home, 0.22, ease.outCubic);
    await this.wait(0.2);
    this.stage.focus();
  }

  async flee(success) {
    const { stage } = this;
    const runner = this.ui.activeId ? this.actor(this.ui.activeId) : null;
    if (!success) {
      this.sfx('error');
      await this.ui.banner('Couldn\'t escape!', { ms: 900 });
      if (runner) { this._clearBoost(runner); await this.returnHome(runner); }
      return;
    }
    this.sfx('flee');
    const legs = stage.party.filter((a) => a.alive).map((a, i) => stage.wait(i * 0.06).then(() => {
      a.sprite.flipX = true;
      a.rest('idle');
      const to = a.base.clone().add(_p.set(9, 0, 0));
      return stage.move(a, to, 0.65, ease.inQuad);
    }));
    this.ui.banner('Escaped!', { ms: 800 });
    await Promise.all(legs);
  }

  // ------------------------------------------------------------------ mid-battle changes

  async summon(e) {
    const c = {
      id: e.targetId, side: 'enemy', key: e.kind, name: e.name, hp: e.hp, maxHp: e.maxHp,
      shield: e.shield, maxShield: e.maxShield, weakCount: e.weakCount, revealed: e.revealed || [], alive: true,
    };
    this.sfx('summon');
    this.stage.react(e);
    const entrance = this.stage.addCombatant(c);
    this.ui.addFoe(c);
    await entrance;
  }

  async transform(e) {
    const a = this.actor(e.targetId);
    if (this.threat?.owner === e.targetId) this._clearThreat();
    this.sfx('transform');
    this.stage.react(e);
    if (a) {
      if (a.emitter) { a.emitter.remove(); a.emitter = null; }
      a.overcharged = false;
      a.glowColor = null;
      a.status?.clear();
    }
    const swap = this.stage.transform(e.targetId, e.kind);
    await this.wait(0.18);
    this.ui.resetFoe(e.targetId, { kind: e.kind, name: e.name, hp: e.hp, maxHp: e.maxHp, shield: e.shield, maxShield: e.maxShield, weakCount: e.weakCount, revealed: e.revealed || [] });
    this.onTransform?.(e);
    await swap;
    if (a) this.ui.label(a.id, a.point('top'), e.name.toUpperCase(), 'danger');
    await this.wait(0.35);
  }

  async untargetable(e) {
    const style = e.style || 'submerge';
    this.stage.react(e);
    this.sfx(e.on ? (style === 'submerge' ? 'submerge' : 'glitch') : style === 'submerge' ? 'emerge' : 'glitch');
    if (e.on) this.ui.setUntargetable(e.targetId, true, style);
    await this.stage.setUntargetable(e.targetId, e.on, style);
    if (!e.on) this.ui.setUntargetable(e.targetId, false, style);
  }

  async weakShift(e) {
    const a = this.actor(e.targetId);
    this.sfx('glitch');
    this.ui.weakShift(e.targetId, e.weakCount, e.revealed || []);
    if (!a) return;
    this.particles.emit(preset('glitch', 'void'), a.point('center'), { count: 20, spread: 0.5 * a.size });
    a.sprite.flash('#ff8ae8', 0.3);
    this.ui.label(a.id, a.point('top'), 'WEAKNESS SHIFT', 'debuff');
    await this.wait(0.45);
  }

  async skip(e) {
    const a = this.actor(e.actorId);
    if (!a) return;
    this.sfx('sleep');
    a.sprite.flash('#a9b6ff', 0.3);
    this.ui.label(a.id, a.point('top'), e.reason === 'sleep' ? 'zzz' : 'SKIP', 'sleep');
    this.particles.emit(preset('mote', 'holo'), a.point('top'), { count: 8, color: '#a9b6ff', speed: 0.5 });
    await this.wait(0.6);
  }

  async learn(e) {
    const a = this.actor(e.memberId);
    if (e.ultimate) {
      if (a) {
        a.sprite.flash('#ffffff', 0.5);
        this.particles.emit('boost', a.object3d.position, { count: 40, speed: 1.6 });
      }
      this.sfx('awaken');
      await this.ui.ultimateCut(e.memberId, e.name, { awakening: true });
      if (a) {
        this.effects.sheet('ring', a.point('center'), { scale: 2.2, color: '#ffe08a', intensity: 2.6 });
        this.ui.label(a.id, a.point('top'), 'AWAKENED', 'boost');
      }
      return;
    }
    if (a) this.ui.label(a.id, a.point('top'), `LEARNED ${e.name.toUpperCase()}`, 'buff');
    this.sfx('levelup');
    await this.wait(0.4);
  }

  async ultimateReady(e) {
    const a = this.actor(e.memberId);
    this.ui.ultimateReady(e.memberId, true);
    if (!a) return;
    this.sfx('boost', { pitch: 3 });
    this.effects.sheet('ring', a.point('center'), { scale: 1.6, color: '#ffe08a', intensity: 2.4 });
    this.particles.emit('boost', a.object3d.position, { count: 24 });
    this.ui.label(a.id, a.point('top'), 'ULTIMATE READY', 'boost');
    await this.wait(0.35);
  }

  async cue(e) {
    this.stage.react(e);
    const fx = getActionFx(`cue.${e.name}`);
    if (fx) await fx(this, { actor: e.targetId ? this.actor(e.targetId) : null, event: e, waves: [], post: [], def: null });
  }

  // ------------------------------------------------------------------ endings

  async victory() {
    const { stage } = this;
    this.ui.setActive(null);
    this._clearThreat();
    this.ui.ending();
    // adds still standing (winOn 'boss') shut down with the boss
    for (const a of stage.enemies) if (a.alive && !this.defeated.includes(a)) { a.alive = false; this._dissolve(a); }
    for (const a of this.defeated) {
      await a.defeatFx(this, { actor: a, event: { type: 'ko', targetId: a.id }, waves: [], post: [], def: a.def });
    }
    await this.wait(this.defeated.length ? 0.2 : 0.45);
    for (const a of stage.party) {
      this._clearBoost(a);
      if (!a.alive) continue;
      a.base.copy(a.home);
      a.rest(a.sheet.anims.victory ? 'victory' : 'idle');
      this.particles.emit('boost', a.object3d.position, { count: 12 });
    }
    stage.focus({ shiftX: (stage.partyCenterX() - stage.cam.target.x) * 0.15, zoom: 0.88, rate: 1.6 });
    this.audio?.music('victory');
    await this.wait(0.9);
  }

  async defeat() {
    this.ui.setActive(null);
    this._clearThreat();
    this.ui.ending();
    this.audio?.music(null);
    this.stage.focus({ zoom: 1.04, rate: 0.8 });
    await this.wait(0.5);
  }
}
