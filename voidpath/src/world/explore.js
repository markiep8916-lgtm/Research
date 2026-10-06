// ExploreState: the field game. Builds the ship diorama once, walks the leader through it with a
// damped diorama camera and tilt-shift focus on the player, runs interactions (NPC talk, terminals,
// Med-Stations, supply crates, the keycard door, the boss) and random encounters, and hands battles
// to ctx.game. exit() pauses without disposing so a battle can return straight to the field.

import * as THREE from 'three';
import { updateVfx } from '../core/vfx.js';
import { clamp, damp } from '../core/util.js';
import { healParty, saveCheckpoint, addItem, hasItem } from '../core/state.js';
import { ITEMS, ENCOUNTER_TABLES } from '../battle/data.js';
import { buildEnemyIcon, buildEnemySprite } from '../art/enemies.js';
import { buildFieldSprite, buildNpcSprite } from '../art/characters.js';
import { TEXTURE_NAMES, buildTexture } from '../art/tiles.js';
import { World } from './world.js';
import { worldTexture } from './paint.js';
import { Player } from './player.js';
import { SPAWN, VIEWPOINTS, BOSS } from './maps.js';
import {
  BOLT_INTRO, BOLT_REPEAT, BOLT_KEYCARD, HALCYON_INTRO, HALCYON_AFTER, SENTINEL_CONFRONT,
  DOOR_LOCKED, KEYCARD_FOUND, TERMINALS, MED_PROMPT,
} from './script.js';

export { VIEWPOINTS };

const FOV = 30;
const PITCH = THREE.MathUtils.degToRad(34);
const BASE_DIST = 16;
const TARGET_Y = 0.9;
const GRACE = 8;              // no encounter within this many units of a battle / entering a zone
const SIGMA = 13.5;           // Rayleigh scale: mean encounter distance ~ GRACE + 1.25 * SIGMA
const INTERACT_REACH = 1.3;

/** Cumulative encounter hazard after s units past the grace distance (Rayleigh). */
const hazard = (s) => (s * s) / (2 * SIGMA * SIGMA);

/**
 * Warm every art cache the field needs (tiles, the space backdrop, field / NPC / boss sprites, the
 * world's own painted textures), one item per macrotask so no frame stalls. Call it at boot or on
 * the title screen; the first enter() then only assembles geometry (~30 ms instead of ~1.4 s).
 */
export function prewarmWorld() {
  const jobs = [
    ...TEXTURE_NAMES.map((n) => () => buildTexture(n)),
    ...['metal_side', 'med_front', 'med_cross', 'chair', 'seat'].map((n) => () => worldTexture(n)),
    () => buildFieldSprite('kade'),
    () => buildNpcSprite('bolt'),
    () => buildNpcSprite('holo'),
    () => buildEnemySprite('sentinel'),
  ];
  return jobs.reduce((chain, job) => chain.then(() => new Promise((resolve) => {
    setTimeout(() => { job(); resolve(); }, 0);
  })), Promise.resolve());
}

const _proj = { x: 0, y: 0, visible: false };
const _v = new THREE.Vector3();

export class ExploreState {
  constructor(ctx) {
    this.ctx = ctx;
    this.world = null;
    this.player = null;
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 140);
    this.area = null;
    this.encountersEnabled = true;
    this._active = false;
    this._busy = false;
    this._zone = null;
    this._walked = 0;
    this._danger = 0;
    this._target = null;
    this._bossArmed = true;
    this._bannerArea = null;
    this._bannerT = -10;
    this._quality = null;
    this._cam = { x: 0, z: 0 };
    this._desired = { x: 0, z: 0 };
    this._look = { x: 0, z: 0 };
    this._focusY = 0.45;
    this._input = { x: 0, z: 0, run: false };
    this._fx = {
      tiltShift: { enabled: true, focusY: 0.45, band: 0.13, falloff: 0.32, maxBlur: 1.25 },
      bloom: { enabled: true, strength: 0.9, radius: 0.62, threshold: 0.8 },
      grade: {
        enabled: true, exposure: 1.04, saturation: 1.08, contrast: 1.1, vignette: 0.46, vignetteSoftness: 0.55, grain: 0.035,
        aberration: 0.0016, shadowTint: [0.92, 0.97, 1.08], highlightTint: [1.06, 1.0, 0.92],
      },
    };
    // small reused partials for the per-frame updates
    this._fxTilt = { tiltShift: { focusY: 0.45, band: 0.13, maxBlur: 1.25 } };
    this._fxMood = { bloom: { strength: 0.9 }, grade: { exposure: 1.04, saturation: 1.08 } };
  }

  // ------------------------------------------------------------------ lifecycle

  enter(params = {}) {
    const { engine, input, audio, ui, state } = this.ctx;
    const first = !this.world;
    if (first) this._build();
    if (first || params.respawn) {
      const cp = params.respawn ? state.checkpoint : null;
      const at = cp || SPAWN;
      this.player.setPosition(at.x, at.z, cp ? cp.facing || 'down' : SPAWN.facing);
    }
    this._active = true;
    this._busy = false;
    this._walked = 0;
    this._bossArmed = !this.world.boss || Math.hypot(this.player.x - BOSS.x, this.player.z - BOSS.z) > BOSS.triggerRadius;
    this.world.syncFlags(state);
    this.world.snap(this.player.x, this.player.z);
    this._quality = engine.quality;
    this.world.setQuality(engine.quality);
    this._detectArea(true);
    this._snapCamera();
    engine.setView(this.world.scene, this.camera);
    // re-apply the whole field look (a battle may have changed any of it); mood values follow
    this._fx.tiltShift.focusY = this._focusY;
    engine.setFx(this._fx);
    this._fxMood.bloom.strength = -1;
    input.setContext('explore');
    audio.music('explore');
    ui.hud.setVisible(true);
    ui.hud.setPrompt(null);
    ui.hud.setDanger(0);
    if (first || params.respawn) this._banner(this.area, true);
  }

  exit() {
    this._active = false;
    this._target = null;
    this.ctx.ui.hud.setPrompt(null);
    this.player.stop();
  }

  _build() {
    const { engine, audio, state } = this.ctx;
    this.world = new World({ engine, onSound: (name, opts) => audio.sfx(name, opts) });
    this.player = new Player(this.world);
    this.player.onStep = (running) => {
      audio.sfx('step', { volume: running ? 0.85 : 0.55 });
      state.stats.steps += 1;
    };
  }

  // ------------------------------------------------------------------ debug / tests

  /** Move the leader (and snap the camera) to a world position. */
  teleport(x, z, facing) {
    if (!this.world) return;
    this.player.setPosition(x, z, facing || this.player.facing);
    this.world.snap(this.player.x, this.player.z);
    this._walked = 0;
    this._detectArea(true);
    this._snapCamera();
  }

  get debugInfo() {
    return {
      area: this.area ? this.area.id : null,
      x: this.player ? +this.player.x.toFixed(2) : 0,
      z: this.player ? +this.player.z.toFixed(2) : 0,
      danger: +this._danger.toFixed(3),
    };
  }

  // ------------------------------------------------------------------ frame

  update(dt, t) {
    if (!this._active || !this.world) return;
    const { engine, input, ui } = this.ctx;
    if (engine.quality !== this._quality) {
      this._quality = engine.quality;
      this.world.setQuality(this._quality);
    }
    const blocked = this._busy || ui.isBlocking() || engine.transitioning;
    let moveInput = null;
    if (!blocked) {
      const a = input.axis();
      const mag = Math.hypot(a.x, a.y);
      this._input.x = a.x;
      this._input.z = a.y;
      this._input.run = input.down('run') || (input.lastDevice === 'gamepad' && mag > 0.95);
      moveInput = this._input;
    }
    const moved = this.player.update(dt, moveInput);
    this._detectArea(false);
    updateVfx(dt, t);
    this._updateCamera(dt);
    this.world.update(dt, t, this._cam, this.player);
    this._updateFx(dt);
    if (blocked) {
      this._target = null;
      return;
    }
    this._updateInteraction(input, ui);
    if (!this._busy) this._updateBoss();
    if (!this._busy) this._updateEncounters(moved);
  }

  // ------------------------------------------------------------------ areas

  _detectArea(immediate) {
    const a = this.world.areaAt(this.player.x, this.player.z);
    if (!a || a === this.area) {
      if (immediate && this.area) this.world.lighting.setMood(this.area.mood, true);
      return;
    }
    this.area = a;
    this.world.lighting.setMood(a.mood, immediate);
    if (!immediate) this._banner(a, false);
  }

  _banner(area, force) {
    if (!area) return;
    const now = this.ctx.engine.realTime;
    if (!force && (area === this._bannerArea || now - this._bannerT < 1.5)) return;
    this._bannerArea = area;
    this._bannerT = now;
    this.ctx.ui.hud.showArea(area.name, area.subtitle);
  }

  // ------------------------------------------------------------------ camera + post FX

  _distance() {
    const aspect = this.ctx.engine.size.aspect || 16 / 9;
    // portrait / narrow screens pull back so phones still see the room around the player
    return aspect >= 1.2 ? BASE_DIST : clamp(BASE_DIST * Math.pow(1.2 / aspect, 0.5), BASE_DIST, 30);
  }

  _desiredTarget(out) {
    const p = this.player;
    const aspect = this.ctx.engine.size.aspect || 16 / 9;
    const D = this._distance();
    const hw = D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect;
    let tx = p.x + this._look.x, tz = p.z + this._look.z;
    const a = this.area;
    if (a) {
      const m = 1.2;
      const lo = a.rect[0] + hw - m, hi = a.rect[2] - hw + m;
      tx = lo > hi ? (a.rect[0] + a.rect[2]) / 2 : clamp(tx, lo, hi);
      tz = clamp(tz, a.cam[0], a.cam[1]);
    }
    out.x = tx;
    out.z = tz;
    return D;
  }

  _snapCamera() {
    this._look.x = 0;
    this._look.z = 0;
    const D = this._desiredTarget(this._cam);
    this._placeCamera(D);
    this._focusY = this._playerFocusY();
  }

  _updateCamera(dt) {
    const p = this.player;
    const lx = p.moving ? p.dir.x * 1.5 : 0, lz = p.moving ? p.dir.z * 0.7 : 0;
    this._look.x = damp(this._look.x, lx, 1.8, dt);
    this._look.z = damp(this._look.z, lz, 1.8, dt);
    const D = this._desiredTarget(this._desired);
    this._cam.x = damp(this._cam.x, this._desired.x, 4.5, dt);
    this._cam.z = damp(this._cam.z, this._desired.z, 4.5, dt);
    this._placeCamera(D);
  }

  _placeCamera(D) {
    const cam = this.camera;
    cam.position.set(this._cam.x, TARGET_Y + Math.sin(PITCH) * D, this._cam.z + Math.cos(PITCH) * D);
    cam.lookAt(this._cam.x, TARGET_Y, this._cam.z);
    cam.updateMatrixWorld();
  }

  /** Screen height fraction (0 bottom .. 1 top) of a world point in this state's camera. */
  _screenY(x, y, z) {
    const { engine } = this.ctx;
    _v.set(x, y, z);
    if (engine.camera !== this.camera) {
      _v.project(this.camera);
      return _v.y * 0.5 + 0.5;
    }
    engine.projectToScreen(_v, _proj);
    return 1 - _proj.y / Math.max(1, engine.size.height);
  }

  /** Area focus point the tilt-shift band leans toward (e.g. the boss), or null. */
  _focusPoint() {
    const f = this.area && this.area.focus;
    if (!f || (f.whileBoss && !(this.world.boss && this.world.boss.present))) return null;
    return f;
  }

  _playerFocusY() {
    let y = this._screenY(this.player.x, 0.85, this.player.z);
    const f = this._focusPoint();
    if (f) y += (this._screenY(f.x, f.y, f.z) - y) * f.w;
    return clamp(y, 0.15, 0.85);
  }

  _updateFx(dt) {
    const { engine } = this.ctx;
    const mood = this.world.lighting.fx;
    this._focusY = damp(this._focusY, this._playerFocusY(), 6, dt);
    const tilt = this._fxTilt.tiltShift;
    tilt.focusY = this._focusY;
    // portrait screens see far more depth: a wider sharp band and softer blur keep them readable
    const f = this._focusPoint();
    const portrait = engine.size.aspect < 1;
    tilt.band = (f ? f.band : 0.13) * (portrait ? 1.25 : 1);
    tilt.maxBlur = portrait ? 1.0 : 1.25;
    engine.setFx(this._fxTilt);
    const m = this._fxMood;
    if (Math.abs(m.bloom.strength - mood.bloom) + Math.abs(m.grade.exposure - mood.exposure) + Math.abs(m.grade.saturation - mood.saturation) > 0.004) {
      m.bloom.strength = mood.bloom;
      m.grade.exposure = mood.exposure;
      m.grade.saturation = mood.saturation;
      engine.setFx(m);
    }
  }

  // ------------------------------------------------------------------ interaction

  _pickTarget() {
    const p = this.player;
    let best = null, bestScore = Infinity;
    for (const it of this.world.interactables) {
      if (!it.enabled) continue;
      let qx, qz, d;
      if (it.box) {
        qx = clamp(p.x, it.box[0], it.box[2]);
        qz = clamp(p.z, it.box[1], it.box[3]);
        d = Math.hypot(qx - p.x, qz - p.z);
      } else {
        qx = it.x;
        qz = it.z;
        d = Math.max(0, Math.hypot(qx - p.x, qz - p.z) - it.r);
      }
      if (d > (it.reach || INTERACT_REACH)) continue;
      const len = Math.hypot(qx - p.x, qz - p.z) || 1e-4;
      const dot = ((qx - p.x) * p.dir.x + (qz - p.z) * p.dir.z) / len;
      if (dot < 0.3 && d > 0.45) continue;
      const score = d - dot * 0.45;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  _updateInteraction(input, ui) {
    const it = this._pickTarget();
    this._target = it;
    if (!it) ui.hud.setPrompt(null);
    else if (it.kind !== 'door') ui.hud.setPrompt(it.label, it.icon);
    else if (hasItem('keycard')) ui.hud.setPrompt('Unlock', 'keycard');
    else ui.hud.setPrompt('Inspect', 'inspect');
    if (it && input.pressed('confirm')) {
      input.consume('confirm');
      this._run(() => this._interact(it));
    }
  }

  /** Run an async interaction with field control paused; errors surface after control returns. */
  _run(fn) {
    this._busy = true;
    this.ctx.ui.hud.setPrompt(null);
    return Promise.resolve().then(fn).finally(() => { if (this._busy !== 'battle') this._busy = false; });
  }

  async _interact(it) {
    switch (it.kind) {
      case 'npc': return this._talk(it.npc);
      case 'terminal': return this._terminal(it.id);
      case 'med': return this._medStation(it);
      case 'crate': return this._openCrate(it);
      case 'door': return this._bridgeDoor(it);
      case 'boss': return this._confront();
      default: return null;
    }
  }

  _npcFace(npc, x, z) {
    const dx = x - npc.x, dz = z - npc.z;
    const side = Math.abs(dx) > Math.abs(dz);
    npc.actor.flipX = side && dx < 0;
    npc.actor.play(side ? 'idle_side' : dz > 0 ? 'idle_down' : 'idle_up');
  }

  async _talk(npc) {
    const { ui, audio, state } = this.ctx;
    const p = this.player;
    p.face(npc.x, npc.z);
    this._npcFace(npc, p.x, p.z);
    audio.sfx('talk');
    const f = state.flags;
    let lines;
    if (npc.id === 'bolt') {
      if (!f.talked_bolt) { lines = BOLT_INTRO; f.talked_bolt = true; }
      else if (hasItem('keycard') && !f.bolt_keycard) { lines = BOLT_KEYCARD; f.bolt_keycard = true; }
      else lines = BOLT_REPEAT[(this._boltLine = ((this._boltLine ?? -1) + 1) % BOLT_REPEAT.length)];
    } else if (f.boss_defeated) lines = HALCYON_AFTER;
    else if (!f.talked_halcyon) { lines = HALCYON_INTRO; f.talked_halcyon = true; }
    else lines = [HALCYON_INTRO[2]];
    await ui.dialog.show(lines);
    npc.actor.flipX = false;
    npc.actor.play(`idle_${npc.home}`);
  }

  async _terminal(id) {
    const { ui, audio } = this.ctx;
    audio.sfx('confirm');
    await ui.dialog.show(TERMINALS[id] || [{ speaker: null, text: 'The screen flickers. No signal.' }]);
  }

  async _medStation(it) {
    const { ui, audio, state } = this.ctx;
    const p = this.player;
    p.face(it.x, it.z - 0.4);
    audio.sfx('confirm');
    const choice = await ui.dialog.choice(MED_PROMPT, ['Restore', 'Not now'], { speaker: 'MED-STATION', cancelIndex: 1 });
    if (choice !== 0) return;
    healParty();
    saveCheckpoint({ x: p.x, z: p.z, facing: p.facing });
    audio.sfx('save');
    this.world.particles.emit('heal', [p.x, 0.1, p.z], { count: 14 });
    ui.hud.toast('Squad restored · *checkpoint logged*', { icon: 'save' });
    state.flags.rested = true;
  }

  async _openCrate(it) {
    const { ui, audio, state } = this.ctx;
    const c = it.crate;
    if (c.opened) return;
    this.player.face(c.x, c.z);
    state.flags[c.flag] = true;
    c.setOpen(true);
    it.enabled = false;
    addItem(c.item, c.n);
    audio.sfx('pickup');
    this.world.particles.emit(c.item === 'keycard' ? 'boost' : 'holo', [c.x, 0.9, c.z], { count: 18 });
    const name = ITEMS[c.item] ? ITEMS[c.item].name : c.item;
    ui.hud.toast(`Obtained *${name}*${c.n > 1 ? ` ×${c.n}` : ''}`, { icon: c.item });
    if (c.item === 'keycard') await ui.dialog.show(KEYCARD_FOUND);
  }

  async _bridgeDoor(it) {
    const { ui, audio, state } = this.ctx;
    if (!hasItem('keycard')) {
      audio.sfx('error');
      await ui.dialog.show(DOOR_LOCKED);
      return;
    }
    state.flags.bridge_unlocked = true;
    this.world.setBridgeUnlocked(true);
    it.enabled = false;
    audio.sfx('confirm');
    ui.hud.toast('Bridge access *granted*', { icon: 'keycard' });
  }

  async _confront() {
    const { ui, audio } = this.ctx;
    const b = this.world.boss;
    this._bossArmed = false;
    this.player.face(b.x, b.z);
    audio.sfx('charge');
    b.actor.flash('#ff3b4e', 0.35);
    const lines = SENTINEL_CONFRONT.map((l) => (l.speaker === 'SENTINEL' ? { ...l, portrait: buildEnemyIcon('sentinel') } : l));
    await ui.dialog.show(lines);
    this._battle('boss_sentinel', { boss: true });
  }

  // ------------------------------------------------------------------ battles

  _battle(encounterId, opts) {
    const { ui, game } = this.ctx;
    this._busy = 'battle';
    this._target = null;
    ui.hud.setPrompt(null);
    ui.dialog.clear();
    this.player.stop();
    const started = opts ? game.startBattle(encounterId, opts) : game.startBattle(encounterId);
    // the game refuses while another battle or transition runs: hand control back
    if (started === false) this._busy = false;
  }

  _updateBoss() {
    const b = this.world.boss;
    if (!b || !b.present) return;
    const d = Math.hypot(this.player.x - b.x, this.player.z - b.z);
    if (d > b.triggerRadius + 2.5) this._bossArmed = true;
    else if (d < b.triggerRadius && this._bossArmed) this._run(() => this._confront());
  }

  _updateEncounters(moved) {
    const { ui } = this.ctx;
    const zone = this.area && this.area.zone;
    const inZone = zone && this.world.areaAt(this.player.x, this.player.z) === this.area;
    if ((inZone ? zone : null) !== this._zone) {
      this._zone = inZone ? zone : null;
      this._walked = 0;
    }
    if (!this._zone || !this.encountersEnabled) {
      this._danger = 0;
      ui.hud.setDanger(0);
      return;
    }
    const before = this._walked;
    this._walked += moved;
    const s0 = Math.max(0, before - GRACE), s1 = Math.max(0, this._walked - GRACE);
    this._danger = this._walked < GRACE ? 0.04 + 0.1 * (this._walked / GRACE) : 0.14 + 0.86 * (1 - Math.exp(-hazard(s1)));
    ui.hud.setDanger(this._danger);
    if (s1 > s0 && Math.random() < 1 - Math.exp(-(hazard(s1) - hazard(s0)))) {
      const table = ENCOUNTER_TABLES[this._zone];
      if (!table || !table.length) return;
      this._battle(table[Math.floor(Math.random() * table.length)]);
    }
  }
}

