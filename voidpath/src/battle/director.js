// Battle director: plays BattleModel events as choreography. Each model call returns a list of events
// computed up front; the director walks it in order, groups an action with the results that follow it
// (hits grouped into waves by hitIndex, each hit with its reveal / shield / break / ko tail) and times
// sprites, effects, particles, sound and UI so an action resolves in about 1-1.6 s.

import * as THREE from 'three';
import { ease } from '../core/util.js';
import { DAMAGE_COLORS } from '../art/palette.js';

const ELEMENTS = new Set(['thermal', 'cryo', 'volt', 'photon', 'void']);
// effects whose art stands on the ground: anchor near the bottom of the frame and place at the feet
const GROUND = { thermal: 0.9, photon: 0.86, heal: 0.88 };
// seconds from the start of an enemy's attack anim to the moment it fires
const FIRE_AT = { drone: 0.14, crawler: 0.14, turret: 0.12, sentinel: 0.42 };
const STRIKE_TAIL = new Set(['reveal', 'shield', 'break', 'message', 'ko', 'bp']);
const SINGLE = new Set(['roundStart', 'orderUpdate', 'turnStart', 'boost', 'defend', 'flee', 'victory', 'defeat', 'levelUp']);
const BLOCK_END = new Set(['action', 'turnStart', 'roundStart', 'orderUpdate', 'victory', 'defeat', 'flee', 'defend', 'boost']);
const STREAK = { rifle: '#ffd28a', cryo: '#9fe9ff', void: '#c38bff', null: '#ffd28a' };
const ENEMY_SHOT = { thermal: '#ff7a3a', void: '#c06bff', rifle: '#ffcf7a', photon: '#fff2b0', null: '#ff5a6a' };
const BOOST_COLOR = '#ffb347';
const STAT_LABEL = { atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', spd: 'SPD', taunt: 'TAUNT' };

const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _d = new THREE.Color();

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

export class Director {
  constructor({ stage, ui, audio, engine }) {
    this.stage = stage;
    this.ui = ui;
    this.audio = audio;
    this.engine = engine;
    this.lock = null;          // { owner, target } boss lock-on
    this.onEvent = null;       // optional hook(event) for tools
  }

  sfx(name, opts) {
    this.audio?.sfx(name, opts);
  }

  wait(sec) { return this.stage.wait(sec); }

  actor(id) { return this.stage.actor(id); }

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
        await this.single(e);
        i++;
      }
    }
  }

  async single(e) {
    const { ui } = this;
    if (!SINGLE.has(e.type)) {
      await this.result(e, null);
      return;
    }
    this.onEvent?.(e);
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
      this.stage.particles.emit('boost', a.object3d.position, { count: 10 + level * 6 });
      a.sprite.flash('#ffd58a', 0.12);
    } else if (level < prev) this.sfx('boostDown');
  }

  /** Brief multiply-tint pulse (enemy turn cue; a full flash reads as a hit). */
  _pulse(a, color, dur) {
    const c = new THREE.Color(color);
    this.stage.tween(dur, (k) => a.alive !== false && a.sprite.setTint(_d.setRGB(1, 1, 1).lerp(c, Math.sin(Math.PI * k))));
  }

  _setAura(a, level) {
    a.sprite.setGlow(level > 0 ? BOOST_COLOR : null, 0.7 + level * 0.8);
    if (level > 0) {
      if (!a.aura) a.aura = this.stage.particles.addEmitter('boost', { position: a.object3d.position, area: [0.2, 0, 0.2], rate: 8 * level });
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
    this.stage.particles.emit('boost', a.object3d.position, { count: 18 + level * 8, speed: 1.4 });
    this.stage.effects.sheet('ring', a.point('center'), { scale: 1 + level * 0.25, color: BOOST_COLOR, intensity: 2 });
    this.sfx('boost', { pitch: level });
    this.ui.label(id, a.point('top'), `BOOST ${'▲'.repeat(level)}`, 'boost');
  }

  _clearBoost(a) {
    this._setAura(a, 0);
  }

  // ------------------------------------------------------------------ actions

  async action(e, rest) {
    const a = this.actor(e.actorId);
    const { waves, post } = splitAction(rest);
    if (!a) {
      for (const w of waves) for (const s of w.strikes) await this.strike(s, null);
      for (const p of post) await this.result(p, null);
      return;
    }
    if (a.side === 'party') {
      if (e.kind !== 'attack') this.ui.actionName(e.name, 'party', e.damageType);
      if (e.kind === 'item') await this.support(a, e, post, 'item');
      else if (e.anim === 'shot') await this.partyShot(a, e, waves, post);
      else if (e.anim === 'cast') await this.partyCast(a, e, waves, post);
      else if (e.anim === 'heal' || e.anim === 'buff') await this.support(a, e, post, e.anim);
      else await this.partyMelee(a, e, waves, post);
      this._clearBoost(a);
      await this.returnHome(a);
    } else {
      this.ui.actionName(e.name, 'enemy', e.damageType);
      if (e.anim === 'enemyMelee') await this.enemyMelee(a, e, waves, post);
      else if (e.anim === 'enemyBeam') await this.enemyBeam(a, e, waves, post);
      else if (e.anim === 'enemyCharge') await this.enemyCharge(a, e, post);
      else await this.enemyShot(a, e, waves, post);
      if (e.actionId === 'annihilator_beam') this.setLock(null);
      this.stage.focus();
    }
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
    const { effects, particles } = this.stage;
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
    const { effects, particles } = this.stage;
    const ground = GROUND[type];
    const at = ground ? target.point('feet', _q).add(_p.set(0, 0, 0.3)) : target.point('center', _q);
    effects.sheet(type, at.clone(), { scale: s * 1.3, anchor: [0.5, ground || 0.5], intensity: 1.55 });
    particles.emit(type, target.point('center', _p), { count: Math.round(14 * Math.min(2, target.size)) });
  }

  async partyMelee(a, e, waves, post) {
    const target = this.actor(e.targets[0]) || this.stage.enemies.find((x) => x.alive);
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
      this.stage.effects.sheet('muzzle', m, { flip: true, scale: 1.2, anchor: [0.15, 0.5], intensity: 2.2 });
      this.stage.particles.emit('spark', m, { count: 5, direction: [-1, 0.2, 0], speed: 0.6 });
      return m;
    };
    fire();
    await this.wait(0.08);
    if (!waves.length) {
      const m = muzzleFx();
      await Promise.all(e.targets.map((id) => { const t = this.actor(id); return t ? this.stage.effects.streak(m, t.point('center'), { color: '#c38bff' }) : null; }));
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
          await this.stage.effects.streak(m, t.point('center'), { color, dur: 0.08 });
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
    this.stage.effects.sheet('glint', hand, { scale: 1.6, color, intensity: 2.4 });
    this.stage.particles.emit(ELEMENTS.has(type) ? type : 'photon', hand, { count: 6, size: 0.6, speed: 0.4 });
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
    this.stage.effects.sheet('glint', a.point('hand'), { scale: 1.4, color: kind === 'buff' ? '#ffd27a' : '#a9f7c4', intensity: 2.2 });
    await this.wait(0.3);
    if (kind !== 'buff') {
      for (const id of e.targets) {
        const t = this.actor(id);
        if (!t) continue;
        const feet = t.point('feet').add(_p.set(0, 0, 0.3));
        this.stage.effects.sheet('heal', feet, { scale: 1.5, anchor: [0.5, GROUND.heal], intensity: 1.8 });
        this.stage.particles.emit('heal', t.object3d.position, { count: 12 });
      }
      await this.wait(0.16);
    }
    await this.results(post, a);
    await this.wait(0.3);
  }

  async enemyShot(a, e, waves, post) {
    const spit = e.anim === 'enemySpit';
    const color = spit ? '#9dff7a' : ENEMY_SHOT[e.damageType] || ENEMY_SHOT.null;
    a.oneShot('attack');
    await this.wait(FIRE_AT[a.key] ?? 0.14);
    const m = a.point('muzzle');
    this.sfx('enemyShot', { pan: this.stage.pan(m) });
    this.stage.effects.sheet('muzzle', m, { scale: 0.8 + a.size * 0.25, anchor: [0.15, 0.5], color, intensity: 2.2 });
    const big = a.key === 'sentinel';
    for (const wave of waves) {
      await Promise.all(wave.strikes.map((s, i) => this.wait(i * 0.07).then(async () => {
        const t = this.actor(s.hit.targetId);
        if (t) {
          const to = t.point('center');
          if (spit) await this.stage.effects.orb(m, to, { color, size: 0.6, dur: 0.3, arc: 1.1, trail: 'void', trailColor: '#7dff8a' });
          else if (big) await this.stage.effects.orb(m, to, { color, size: 1.3, dur: 0.24, trail: 'ember' });
          else await this.stage.effects.streak(m, to, { color, dur: 0.11, length: 1.3, width: 0.34 });
          this.stage.effects.sheet('impact', to, { scale: big ? 1.6 : 1.1, color, intensity: 2 });
          if (ELEMENTS.has(e.damageType)) this.stage.particles.emit(e.damageType, to, { count: 10 });
        }
        await this.strike(s, a);
      })));
    }
    if (!waves.length) await this.wait(0.2);
    await this.results(post, a);
    await this.wait(0.22);
  }

  async enemyBeam(a, e, waves, post) {
    const heavy = e.actionId === 'annihilator_beam';
    const color = heavy ? '#c06bff' : e.damageType === 'photon' ? '#fff0a0' : '#ff4f6a';
    const m = a.point(heavy && a.points.core ? 'core' : 'muzzle');
    if (heavy) {
      this.setLock({ owner: e.actorId, target: e.targets[0] });
      this.sfx('charge');
      a.sprite.setGlow('#c06bff', 2);
      this.stage.particles.emit('void', m, { count: 40, spread: 1.6 });
      this.stage.focus({ shiftX: -0.6, zoom: 0.95, rate: 5 });
      await this.wait(0.55);
    }
    a.oneShot('attack');
    await this.wait(FIRE_AT[a.key] ?? 0.14);
    this.sfx('enemyBeam', { pan: this.stage.pan(m) });
    this.stage.effects.sheet('ring', m, { scale: heavy ? 2.4 : 1.2, color, intensity: 2.2 });
    if (!waves.length) {
      for (const id of e.targets) {
        const t = this.actor(id);
        if (t) this.stage.effects.beam(m, t.point('center'), { color: '#ff3b4e', width: 0.12, dur: 0.4 });
      }
      await this.wait(0.3);
    }
    for (const wave of waves) {
      for (const s of wave.strikes) {
        const t = this.actor(s.hit.targetId);
        if (t) {
          const to = t.point('center');
          this.stage.effects.beam(m, to, { color, width: heavy ? 1.3 : 0.42, dur: heavy ? 0.75 : 0.34, intensity: heavy ? 3 : 2.6 });
          if (heavy) {
            this.engine.flash('#b06bff', 0.35, 0.55);
            this.engine.shake(0.24, 0.5);
            this.stage.particles.emit('void', to, { count: 40 });
          }
          await this.wait(heavy ? 0.16 : 0.07);
          this.stage.effects.sheet('impact', to, { scale: heavy ? 2 : 1.2, color, intensity: 2.2 });
        }
        await this.strike(s, a);
        await this.wait(heavy ? 0.4 : 0.09);
      }
    }
    if (heavy) a.sprite.setGlow(a.overcharged ? '#ff3b4e' : null, 0.7);
    await this.results(post, a);
    await this.wait(0.2);
  }

  async enemyMelee(a, e, waves, post) {
    const target = this.actor(e.targets[0]);
    if (target) await this.stage.move(a, this.stage.strikePos(a, target), 0.2, ease.inCubic);
    a.oneShot('attack');
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

  async enemyCharge(a, e, post) {
    const core = a.point(a.points.core ? 'core' : 'center');
    this.sfx('charge', { pan: this.stage.pan(core) });
    a.sprite.flash('#ff4f6a', 0.4);
    a.sprite.setGlow('#ff3b4e', 1.6);
    this.stage.particles.emit('void', core, { count: 34, spread: 1.4 });
    this.stage.effects.sheet('ring', core, { scale: 2 * a.size * 0.6, color: '#ff4f6a', intensity: 2 });
    await this.wait(0.5);
    if (e.kind === 'buff') a.overcharged = true;
    a.sprite.setGlow(a.overcharged ? '#ff3b4e' : null, 0.7);
    await this.results(post, a);
    await this.wait(0.15);
  }

  // ------------------------------------------------------------------ results

  /** One hit plus its tail (reveal, shield, break, ko, bp, message). */
  async strike(s, attacker) {
    this.hit(s.hit, attacker);
    for (const ev of s.after) await this.result(ev, attacker);
  }

  async results(list, attacker) {
    const shown = new Set();
    for (const ev of list) await this.result(ev, attacker, shown);
  }

  hit(e, attacker) {
    this.onEvent?.(e);
    const t = this.actor(e.targetId);
    if (!t) return;
    const { stage, ui } = this;
    const c = t.point('center');
    const dir = t.side === 'enemy' ? -1 : 1;
    t.sprite.flash(e.weak ? '#ffe066' : e.crit ? '#ffd2a0' : '#ffffff', e.weak || e.crit ? 0.2 : 0.13);
    stage.particles.emit('hit', c, { direction: [dir, 0.4, 0.3], count: e.crit ? 22 : e.weak ? 16 : 11, size: 0.75, color: e.weak ? '#ffe9a0' : null });
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
    const { ui, stage } = this;
    const t = this.actor(e.targetId ?? e.actorId);
    if (e.type !== 'hit') this.onEvent?.(e);
    switch (e.type) {
      case 'hit': this.hit(e, attacker); break;
      case 'reveal':
        ui.reveal(e.targetId, e.damageType);
        break;
      case 'shield': {
        ui.setShield(e.targetId, e.shield, e.maxShield);
        if (e.shield > 0) {
          this.sfx('shieldCrack', { pan: t ? stage.pan(t.object3d.position) : 0 });
          if (t) stage.effects.sheet('glint', t.point('center'), { scale: 1.3, color: '#bfe6ff', intensity: 2.4 });
        }
        break;
      }
      case 'break': await this.breakSeq(e.targetId); break;
      case 'message':
        if (this.lock && /lock-on/i.test(e.text)) this.setLock(null);
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
        t.sprite.setTint(null);
        t.rest('idle');
        t.sprite.flash('#d4fff0', 0.35);
        stage.effects.sheet('heal', t.point('feet').add(_p.set(0, 0, 0.3)), { scale: 1.6, anchor: [0.5, GROUND.heal] });
        stage.particles.emit('heal', t.object3d.position, { count: 20 });
        ui.setKO(e.targetId, false);
        ui.setHp(e.targetId, e.hpAfter);
        ui.number(e.targetId, t.point('top'), 'REVIVED', 'heal');
        this.sfx('heal');
        break;
      case 'status': {
        ui.setStatus(e.targetId, e.stat, e.stage, e.turns);
        if (!t || e.stage === 0) {
          if (t && e.stat === 'atk' && t.overcharged) { t.overcharged = false; t.sprite.setGlow(null); }
          break;
        }
        const up = e.stage > 0;
        const first = !shown || !shown.has(t.id);
        shown?.add(t.id);
        ui.label(t.id, t.point('top'), `${STAT_LABEL[e.stat] || e.stat.toUpperCase()} ${e.stat === 'taunt' ? '' : up ? '▲' : '▼'}`.trim(), up ? 'buff' : 'debuff');
        if (first) {
          stage.effects.sheet(up ? 'buff' : 'debuff', t.point('center'), { scale: 1.4 * Math.min(1.8, t.size), intensity: 1.9 });
          this.sfx(up ? 'buff' : 'debuff', { pan: stage.pan(t.object3d.position) });
          await this.wait(0.1);
        }
        break;
      }
      case 'telegraph': await this.telegraph(e); break;
      case 'recover': await this.recover(e); break;
      default:
    }
  }

  async breakSeq(id) {
    const t = this.actor(id);
    const { stage, engine, ui } = this;
    this.sfx('break');
    ui.setBroken(id, true);
    if (!t) return;
    const c = t.point(t.points.core ? 'core' : 'center');
    engine.hitStop(130);
    engine.flash('#ff4fa3', 0.24, 0.6);
    engine.shake(0.2, 0.42);
    t.rest('break');
    t.sprite.flash('#ff4fa3', 0.3);
    stage.particles.emit('break', c, { count: Math.round(24 * Math.min(2, t.size)) });
    stage.effects.shards(c, { count: 10, scale: Math.sqrt(t.size) });
    stage.effects.sheet('ring', c, { scale: 1.6 * Math.sqrt(t.size), color: '#ff63b6', intensity: 2.6 });
    stage.effects.sheet('ring', t.object3d.position.clone().setY(0.03), { floor: true, scale: 3 * Math.sqrt(t.size), color: '#ff4fa3', intensity: 2.2 });
    if (t.emitter) t.emitter.remove();
    t.emitter = stage.particles.addEmitter('spark', { position: t.point('center'), area: [t.halfW, 0.6 * t.size, 0.2], rate: 1.4, burst: 7 });
    ui.breakCallout(id, t.point('center'));
    stage.focus({ shiftX: t.home.x * 0.08, zoom: 0.93, rate: 9 });
    if (this.lock && this.lock.owner === id) this.setLock(null);
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
    this.stage.effects.sheet('ring', c, { scale: 1.4 * Math.sqrt(t.size), color: '#7fe3ff', intensity: 2.2 });
    this.stage.particles.emit('holo', c, { count: 20, spread: 0.5 * t.size });
    this.ui.label(e.targetId, t.point('top'), 'SHIELD RESTORED', 'info');
    await this.wait(0.35);
  }

  async ko(id) {
    const t = this.actor(id);
    this.ui.setKO(id, true);
    if (!t) return;
    t.alive = false;
    if (t.emitter) { t.emitter.remove(); t.emitter = null; }
    this._setAura(t, 0);
    this.sfx('ko', { pan: this.stage.pan(t.object3d.position) });
    // a fallen lock target leaves the lock pending: the beam re-acquires whoever it really hits
    if (this.lock?.owner === id) this.setLock(null);
    else if (this.lock?.target === id) this.setLock({ owner: this.lock.owner, target: null });
    if (t.side === 'party') {
      t.rest('ko');
      t.sprite.setTint('#7d8699');
      t.sprite.flash('#ff5a6a', 0.3);
      return;
    }
    // enemies dissolve into the void
    t.sprite.setGlow(null);
    t.sprite.flash('#ffffff', 0.25);
    const c = t.point('center');
    this.stage.particles.emit('void', c, { count: Math.round(26 * Math.min(2.2, t.size)), spread: 0.9 * t.size });
    this.stage.particles.emit('smoke', t.object3d.position, { count: 6 + Math.round(4 * t.size) });
    this.stage.effects.sheet('void', c, { scale: 1.2 * Math.sqrt(t.size), intensity: 1.8 });
    this.stage.tween(0.7, (k) => t.sprite.setOpacity(1 - k), ease.inQuad).then(() => this.ui.removeFoe(id));
    await this.wait(0.12);
  }

  async defend(id) {
    const a = this.actor(id);
    if (!a) return;
    this.sfx('defend', { pan: this.stage.pan(a.object3d.position) });
    a.rest('defend');
    this.stage.effects.sheet('ring', a.point('center'), { scale: 1.3, color: '#7fe3ff', intensity: 2 });
    this.stage.particles.emit('holo', a.point('center'), { count: 14, spread: 0.4 });
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

  async telegraph(e) {
    this.setLock({ owner: e.actorId, target: e.targetId });
    const t = this.actor(e.targetId);
    if (t) t.sprite.flash('#ff3b4e', 0.4);
    this.sfx('charge');
    await this.ui.banner(e.text, { ms: 1300, tone: 'danger' });
  }

  setLock(lock) {
    this.lock = lock;
    this.ui.setReticle(lock ? lock.target : null);
  }

  // ------------------------------------------------------------------ endings

  async victory() {
    const { stage } = this;
    this.ui.setActive(null);
    this.setLock(null);
    this.ui.ending();
    await this.wait(0.45);
    for (const a of stage.party) {
      this._clearBoost(a);
      if (!a.alive) continue;
      a.base.copy(a.home);
      a.rest(a.sheet.anims.victory ? 'victory' : 'idle');
      this.stage.particles.emit('boost', a.object3d.position, { count: 12 });
    }
    stage.focus({ shiftX: (stage.partyCenterX() - stage.cam.target.x) * 0.15, zoom: 0.88, rate: 1.6 });
    this.audio?.music('victory');
    await this.wait(0.9);
  }

  async defeat() {
    this.ui.setActive(null);
    this.setLock(null);
    this.ui.ending();
    this.audio?.music(null);
    this.stage.focus({ zoom: 1.04, rate: 0.8 });
    await this.wait(0.5);
  }
}
