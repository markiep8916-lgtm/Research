// ExploreState: the field game across many maps (TECH_PLAN 3.5-3.8, 3.10, 3.13). It loads one map
// at a time from the content registry (getMap), walks the leader through it with the field camera
// and tilt-shift focus, runs interactions (NPC talk, terminals, Med-Stations, chests, locked doors,
// switches, shards, shops, the Starchart, exits, lifts, field bosses), triggers and random
// encounters, keeps the companion (BOLT) trailing the leader, and hands scripts to ctx.cutscenes and
// battles to ctx.game. It owns the persistent lighting rig and the FieldCamera for its whole life;
// exit() pauses without disposing so a battle can return straight to the field.
//
// export class ExploreState
//   enter({ map, spawn, resume, respawn })   resume: back from battle; respawn: at gameState.checkpoint
//   exit(); update(dt, t)
//   loadMap(mapId, at /* spawnId | { x, z, facing } */) -> Promise   call under a cover only (3.7)
//   arrive(kind, { mapChanged })   after the fade-in of an arrival when no travel module announces it:
//                                  banner, visited flag, then the arrival rules (kind: 'exit' | 'travel' |
//                                  'newJourney' | 'load' | 'respawn' | 'goto' | 'scene' | 'lift' | 'teleport')
//   Arrivals announced by S2a's travel through story.onChange({ type: 'arrive', map, kind, load, scene })
//   apply the same rules (re-seeded triggers, encounter grace, `load` triggers when load is true).
//   mapId; world; player; area; rig; camera (FieldCamera); fxOverride
//   teleport(x, z, facing); lock(reason); unlock(reason); unlockAll(); get locked() -> Set
//   setLeader(id); restoreMusic(); interact(id) -> Promise; debugInfo
//   syncFlags()        re-apply flags to the world and check flag triggers (story.set calls it)
//   actor(id)          NpcActor (NPCs, companions, field bosses) or the Player for 'leader'
//   actorPos(id) -> { x, z } | null
// export function prewarmMap(mapId) -> Promise    paints the map's location art plus the art of every
//                                                 prop it builds (built-in types too), one job per task

import * as THREE from 'three';
import { updateVfx } from '../core/vfx.js';
import { clamp, damp } from '../core/util.js';
import { addItem, hasItem } from '../core/state.js';
import { listSlots, storageMode } from '../core/save.js';
import { ITEMS, ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES } from '../battle/data.js';
import { ZONE_RATE_DEFAULT } from '../content/balance.js';
import { CHAPTER_START } from '../content/chapters.js';
import { REG, getMap, locationOfMap } from '../content/registry.js';
import { prewarmLocation, paintJob, parseArtKey } from '../content/prewarm.js';
import { buildEnemyIcon } from '../art/enemies.js';
import { setDefaultState } from './cond.js';
import { normalizeTalk } from './mapdef.js';
import { World, propEntries } from './world.js';
import { propArt } from './props.js';
import { FieldCamera } from './camera.js';
import { Lighting } from './lighting.js';
import { Player } from './player.js';

const DEFAULT_MAP = CHAPTER_START.prologue.map;
const DEFAULT_SPAWN = CHAPTER_START.prologue.spawn;
const POC_ZONE_RATE = { grace: 8, sigma: 13.5 };   // POC zones keep their pace (TECH_PLAN 11.7)
const POC_ZONES = new Set(['corridor', 'engineering']);
const LOW_ENCOUNTERS = 0.6;
const WEAK_GAP = 5;
const INTERACT_REACH = 1.3;
const BANNER_GAP = 1.5;
const TRAIL_STEP = 0.12;
const TRAIL_MAX = 40;
const COMPANION_GAP = 1.4;
// arrivals that run `load` triggers (3.7); the others only restart the encounter grace
const LOAD_KINDS = new Set(['exit', 'travel', 'newJourney', 'continue', 'load', 'retry', 'respawn']);

/** Cumulative encounter hazard after s units past the grace distance (Rayleigh). */
const hazard = (s, sigma) => (s * s) / (2 * sigma * sigma);

// Errors inside async interactions surface in #vp-fatal instead of vanishing.
const surface = (e) => setTimeout(() => { throw e; });

/**
 * Paint what a map needs behind a cover: its location's art (legend, registered props, NPCs, bosses,
 * zones, through prewarmLocation) and the textures and sprites of every prop the World will build,
 * built-in types included (props.propArt), one job per macrotask.
 */
export async function prewarmMap(mapId) {
  const loc = locationOfMap(mapId);
  const map = getMap(mapId);
  if (!loc || !map) {
    console.warn(`prewarmMap: unknown map "${mapId}"`);
    return;
  }
  await prewarmLocation(loc);
  const jobs = new Set();
  for (const p of propEntries(map)) {
    const art = propArt(p);
    for (const t of art.textures) jobs.add(`tex:${t}`);
    for (const sh of art.sprites) jobs.add(sh.includes(':') ? sh : `npc:${sh}`);
  }
  for (const key of jobs) {
    paintJob(parseArtKey(key));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const _proj = { x: 0, y: 0, visible: false };
const _v = new THREE.Vector3();

export class ExploreState {
  constructor(ctx) {
    this.ctx = ctx;
    this.world = null;
    this.player = null;
    this.mapId = null;
    this.area = null;
    this.rig = new Lighting({ quality: ctx.engine.quality });
    this.camera = new FieldCamera(this);
    this.fxOverride = null;
    this.encountersEnabled = true;
    this._locks = new Set();
    this._active = false;
    this._busy = false;
    this._zone = null;
    this._walked = 0;
    this._danger = 0;
    this._target = null;
    this._armed = new Map();          // field boss id -> armed (confront once per approach)
    this._bannerArea = null;
    this._bannerT = -10;
    this._quality = ctx.engine.quality;
    this._focusY = 0.45;
    this._input = { x: 0, z: 0, run: false };
    this._inside = new Map();         // enter trigger id -> leader inside
    this._flagOn = new Map();         // flag trigger id -> condition held at the last check
    this._pending = [];               // triggers due while blocked (same map only)
    this._exitInside = null;          // the exit rect the leader stood in at arrival (no re-fire)
    this._exitTarget = null;          // prompt target of a non-auto exit
    this._scriptWasActive = false;
    this._storyHooked = false;
    this._trail = [];
    this._companions = new Map();     // id -> { def, moving }
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
    this._lastOverride = null;
    setDefaultState(ctx.state);
  }

  // ------------------------------------------------------------------ locks

  lock(reason) { this._locks.add(reason); }
  unlock(reason) { this._locks.delete(reason); }
  unlockAll() { this._locks.clear(); }
  get locked() { return this._locks; }

  // ------------------------------------------------------------------ lifecycle

  /**
   * enter(): first entry or { map, spawn } builds that map synchronously (flows call it at a
   * transition midpoint); { respawn } places the leader at gameState.checkpoint (its map) or the
   * New Journey spawn; { resume } only rebinds the view after a battle. Never clears locks.
   * Returns the compile promise of a freshly built map (await it under the cover), else undefined.
   */
  enter(params = {}) {
    const { engine, input, ui, state, cutscenes } = this.ctx;
    this._hookStory();
    let target = null;
    let compiling;
    if (params.map) target = { map: params.map, at: params.spawn ?? DEFAULT_SPAWN };
    else if (params.respawn || !this.world) {
      const cp = params.respawn ? state.checkpoint : null;
      target = cp
        ? { map: cp.map || this.mapId || DEFAULT_MAP, at: { x: cp.x, z: cp.z, facing: cp.facing || 'down' } }
        : { map: this.mapId || DEFAULT_MAP, at: DEFAULT_SPAWN };
    }
    if (target) {
      if (!this.world || target.map !== this.mapId) {
        const old = this.world;
        this._build(target.map, target.at);
        compiling = engine.compileScene(this.world.scene, this.camera.camera);
        if (old) old.dispose();
      } else {
        this.world.syncFlags({ instant: true });
        this._place(target.at);
      }
    }
    this._active = true;
    this._busy = false;
    if (this.player.id !== this._leaderId()) this.setLeader(this._leaderId());
    this._quality = engine.quality;
    this.rig.setQuality(engine.quality);
    this.world.setQuality(engine.quality);
    this._show();
    const scripted = !!(cutscenes && cutscenes.active);
    if (params.resume && scripted) return compiling;
    input.setContext('explore');
    ui.hud.setVisible(true);
    ui.hud.setPrompt(null);
    ui.hud.setDanger(0);
    this.restoreMusic();
    if (params.resume) this.syncFlags();
    return compiling;
  }

  exit() {
    this._active = false;
    this._target = null;
    this.ctx.ui.hud.setPrompt(null);
    if (this.player) this.player.stop();
  }

  /**
   * Map change under a cover (3.7): build the new World with the leader at `at`, attach the rig,
   * compile its programs, switch the view, then dispose the old World. Pending triggers are dropped.
   */
  async loadMap(mapId, at) {
    if (this.world && mapId === this.mapId) {
      // travelling to the current map teleports under the cover without a rebuild
      this._pending = [];
      this.world.syncFlags({ instant: true });
      this._place(at);
      return this.world;
    }
    const old = this.world;
    this._build(mapId, at);
    await this.ctx.engine.compileScene(this.world.scene, this.camera.camera);
    this._show();
    if (old && old !== this.world) old.dispose();
    return this.world;
  }

  /** Bind the engine to this map's scene and re-apply the whole field look. */
  _show() {
    const { engine } = this.ctx;
    engine.setView(this.world.scene, this.camera.camera);
    this._fx.tiltShift.focusY = this._focusY;
    engine.setFx(this._fx);
    this._fxMood.bloom.strength = -1;
    this._lastOverride = null;
  }

  _leaderId() {
    const s = this.ctx.state;
    return s.leader || (s.party && s.party[0] && s.party[0].id) || 'kade';
  }

  _build(mapId, at) {
    const { engine, audio, state } = this.ctx;
    const def = getMap(mapId);
    if (!def) throw new Error(`explore: unknown map "${mapId}"`);
    this._pending = [];
    this._despawnCompanions();
    const world = new World({
      engine, map: def, state, rig: this.rig, camera: this.camera.camera,
      onSound: (name, opts) => audio.sfx(name, opts),
    });
    this.world = world;
    this.mapId = def.id;
    this._staged = !!(def.scene || def.transit);
    this._flagOn.clear();
    if (!this.player) {
      this.player = new Player(world, { id: this._leaderId() });
      this.player.onStep = (running) => {
        audio.sfx('step', { volume: running ? 0.85 : 0.55 });
        state.stats.steps += 1;
      };
    } else this.player.setWorld(world);
    world.leader = this.player;
    world.externalTouched = this.ctx.cutscenes ? this.ctx.cutscenes.touched : null;
    this.area = null;
    this._armed.clear();
    world.syncFlags({ instant: true });
    this._place(at);
    world.attachRig(this._mood(this.area));
  }

  /** Spawn id or { x, z, facing } on the current map -> leader placed, everything snapped. */
  _place(at) {
    const map = this.world.map;
    let p = typeof at === 'string' ? map.spawns[at] : at;
    if (!p) {
      const first = Object.keys(map.spawns)[0];
      console.warn(`explore: map "${map.id}" has no spawn "${at}", using "${first}"`);
      p = map.spawns[first];
    }
    this.player.setPosition(p.x, p.z, p.facing || this.player.facing);
    this.world.snap(this.player.x, this.player.z);
    this._walked = 0;
    this._detectArea(true);
    this.camera.snap();
    this._focusY = this._playerFocusY();
    this._trail = [];
    this._syncCompanions(true);
    this._seedTriggers();
    this._markVisited();
  }

  /** Move the leader (and snap the camera) to a world position on the current map. */
  teleport(x, z, facing) {
    if (!this.world) return;
    this._place({ x, z, facing: facing || this.player.facing });
  }

  /**
   * The arrival rules of 3.7, after the fade-in: location banner when the map changed, visited /
   * area flags, `load` triggers for the arrival kinds that run them, encounter grace, flag triggers.
   * Autosave and checkpoint are the caller's (S2a travel / game).
   */
  arrive(kind = 'teleport', { mapChanged = false } = {}) {
    if (!this.world) return;
    const map = this.world.map;
    const scene = !!(map.scene || map.transit || kind === 'scene');
    this._markVisited();
    if (mapChanged && !scene) this._locationBanner();
    this._arrived({ kind, scene, load: !scene && LOAD_KINDS.has(kind) });
  }

  /** The arrival rules (3.7): staged maps run no triggers or encounters; `load` triggers when asked. */
  _arrived({ load = false, scene = false }) {
    if (!this.world) return;
    this._staged = !!(scene || this.world.map.scene || this.world.map.transit);
    this._walked = 0;
    this._seedTriggers();
    if (this._staged) return;
    if (load) for (const t of this.world.map.triggers) if (t.on === 'load') this._due(t);
    this._checkFlagTriggers();
  }

  _locationBanner() {
    const { ui, story } = this.ctx;
    const map = this.world.map;
    const obj = story && story.objective ? REG.objectives[story.objective] : null;
    if (this.area) ui.areaName = this.area.name;
    this._bannerArea = this.area;
    this._bannerT = this.ctx.engine.realTime;
    ui.hud.showLocation(map.name, map.region || '', obj ? obj.text : null);
  }

  _markVisited() {
    const f = this.ctx.state.flags;
    f[`visited:${this.mapId}`] = true;
    if (this.area) f[`area:${this.mapId}:${this.area.id}`] = true;
  }

  _hookStory() {
    const story = this.ctx.story;
    if (this._storyHooked || !story || !story.onChange) return;
    this._storyHooked = true;
    story.onChange((change) => {
      if (change && change.type === 'arrive') {
        if (change.map === this.mapId) this._arrived(change);
      } else this.syncFlags();
    });
  }

  // ------------------------------------------------------------------ leader, music, flags

  setLeader(id) {
    if (!this.player) return;
    this.player.setCharacter(id);
  }

  restoreMusic() {
    const track = (this.area && this.area.music) || (this.world && this.world.map.music) || 'explore';
    this.ctx.audio.music(track);
  }

  /** Re-apply flags to the world, keep companions in step and check flag triggers. */
  syncFlags() {
    if (!this.world) return;
    this.world.syncFlags();
    this._syncCompanions(false);
    this._checkFlagTriggers();
  }

  _setFlag(name, value = true) {
    const { story, state } = this.ctx;
    if (story && story.set) story.set(name, value);
    else state.flags[name] = value;
    this.syncFlags();
  }

  // ------------------------------------------------------------------ actors

  actor(id) {
    if (!this.world) return null;
    if (id === 'leader' || (this.player && id === this.player.id)) return this.player;
    return this.world.npc(id);
  }

  actorPos(id) {
    const a = this.actor(id);
    return a ? { x: a.x, z: a.z } : null;
  }

  // ------------------------------------------------------------------ debug / tests

  get debugInfo() {
    return {
      map: this.mapId,
      area: this.area ? this.area.id : null,
      x: this.player ? +this.player.x.toFixed(2) : 0,
      z: this.player ? +this.player.z.toFixed(2) : 0,
      danger: +this._danger.toFixed(3),
    };
  }

  /** Run an interactable, NPC, chest, boss or locked door by id, wherever the leader stands. */
  interact(id) {
    const it = this.world && this.world.interactable(id);
    if (!it) return Promise.reject(new Error(`explore.interact: no interactable "${id}" on ${this.mapId}`));
    return this._interact(it);
  }

  // ------------------------------------------------------------------ frame

  _blocked() {
    const { engine, ui, cutscenes } = this.ctx;
    return this._busy || this._locks.size > 0 || ui.isBlocking() || engine.transitioning || !!(cutscenes && cutscenes.active);
  }

  update(dt, t) {
    if (!this._active || !this.world) return;
    const { engine, input, cutscenes } = this.ctx;
    if (engine.quality !== this._quality) {
      this._quality = engine.quality;
      this.rig.setQuality(this._quality);
      this.world.setQuality(this._quality);
    }
    const scripted = !!(cutscenes && cutscenes.active);
    if (this._scriptWasActive && !scripted) this._scriptEnded();
    this._scriptWasActive = scripted;
    const blocked = this._blocked();
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
    this._updateTrail();
    this._updateCompanions();
    this.camera.update(dt);
    this.world.update(dt, t, this.camera.look, this.player);
    this._updateFx(dt);
    this._updateTriggers(blocked);
    if (blocked) {
      this._target = null;
      return;
    }
    if (this._firePending()) return;
    if (this._updateExits()) return;
    this._updateInteraction(input);
    if (!this._busy) this._updateBosses();
    if (!this._busy) this._updateEncounters(moved);
  }

  /** The outermost script ended (the runner returns the camera): re-seed triggers, release actors. */
  _scriptEnded() {
    this._seedTriggers();
    this.world.releaseTouched();
    this._syncCompanions(false);
    this._checkFlagTriggers();
  }

  // ------------------------------------------------------------------ areas

  _mood(area) {
    return (area && area.mood) || this.world.map.mood || null;
  }

  _detectArea(immediate) {
    const a = this.world.areaAt(this.player.x, this.player.z);
    if (!a || a === this.area) {
      if (immediate && this.area) this.rig.setMood(this._mood(this.area), true);
      return;
    }
    this.area = a;
    this.ctx.ui.areaName = a.name;     // R6: the menu header follows the area even without a banner
    const flag = `area:${this.mapId}:${a.id}`;
    if (!this.ctx.state.flags[flag]) this.ctx.state.flags[flag] = true;
    const mood = this._mood(a);
    if (mood) this.rig.setMood(mood, immediate);
    if (immediate) {
      this._bannerArea = a;
      return;
    }
    if (a.music && !(this.ctx.cutscenes && this.ctx.cutscenes.active)) this.restoreMusic();
    this._banner(a);
  }

  _banner(area) {
    if (!area || area.banner === false) return;
    const now = this.ctx.engine.realTime;
    if (area === this._bannerArea || now - this._bannerT < BANNER_GAP) return;
    this._bannerArea = area;
    this._bannerT = now;
    this.ctx.ui.hud.showArea(area.name, area.subtitle);
  }

  // ------------------------------------------------------------------ camera focus + post FX

  /** Screen height fraction (0 bottom .. 1 top) of a world point in the field camera. */
  _screenY(x, y, z) {
    const { engine } = this.ctx;
    _v.set(x, y, z);
    if (engine.camera !== this.camera.camera) {
      _v.project(this.camera.camera);
      return _v.y * 0.5 + 0.5;
    }
    engine.projectToScreen(_v, _proj);
    return 1 - _proj.y / Math.max(1, engine.size.height);
  }

  /** Area focus point the tilt-shift band leans toward (e.g. the boss), or null. */
  _focusPoint() {
    const f = this.area && this.area.focus;
    if (!f) return null;
    if (f.whileBoss && !this.world.bossPresent(typeof f.whileBoss === 'string' ? f.whileBoss : undefined)) return null;
    return f;
  }

  /** The band follows the leader in follow mode and the look target while a script holds the camera. */
  _playerFocusY() {
    if (this.camera.scripted) return clamp(this._screenY(this.camera.look.x, 0.85, this.camera.look.z), 0.15, 0.85);
    let y = this._screenY(this.player.x, 0.85, this.player.z);
    const f = this._focusPoint();
    if (f) y += (this._screenY(f.x, f.y, f.z) - y) * f.w;
    return clamp(y, 0.15, 0.85);
  }

  _updateFx(dt) {
    const { engine } = this.ctx;
    const mood = this.rig.fx;
    // a cleared override hands the whole explore look back
    if (this._lastOverride && !this.fxOverride) {
      engine.setFx(this._fx);
      this._fxMood.bloom.strength = -1;
    }
    this._lastOverride = this.fxOverride;
    this._focusY = damp(this._focusY, this._playerFocusY(), 6, dt);
    const tilt = this._fxTilt.tiltShift;
    tilt.focusY = this._focusY;
    // portrait screens see far more depth: a wider sharp band and softer blur keep them readable
    const f = this.camera.scripted ? null : this._focusPoint();
    const portrait = engine.size.aspect < 1;
    tilt.band = (f ? f.band : 0.13) * (portrait ? 1.25 : 1);
    tilt.maxBlur = portrait ? 1.0 : 1.25;
    const mapFx = this.world.map.fx && this.world.map.fx.tiltShift;
    if (mapFx && mapFx.maxBlur !== undefined) tilt.maxBlur = mapFx.maxBlur * (portrait ? 0.8 : 1);
    engine.setFx(this._fxTilt);
    const m = this._fxMood;
    if (Math.abs(m.bloom.strength - mood.bloom) + Math.abs(m.grade.exposure - mood.exposure) + Math.abs(m.grade.saturation - mood.saturation) > 0.004) {
      m.bloom.strength = mood.bloom;
      m.grade.exposure = mood.exposure;
      m.grade.saturation = mood.saturation;
      engine.setFx(m);
    }
    if (this.fxOverride) engine.setFx(this.fxOverride);
  }

  // ------------------------------------------------------------------ triggers (3.5)

  _insideTrigger(t) {
    const p = this.player;
    if (t.rect) return p.x >= t.rect[0] && p.x <= t.rect[2] && p.z >= t.rect[1] && p.z <= t.rect[3];
    return !!(this.area && this.area.id === t.area && this.world.areaAt(p.x, p.z) === this.area);
  }

  /** After teleports, arrivals, respawns and script ends: inside/outside re-seeded without firing. */
  _seedTriggers() {
    this._inside.clear();
    for (const t of this.world.map.triggers) if (t.on === 'enter') this._inside.set(t.id, this._insideTrigger(t));
    const e = this.world.exitAt(this.player.x, this.player.z);
    this._exitInside = e ? e.id : null;
  }

  _armedTrigger(t) {
    if (t.once && this.ctx.state.flags[`seen:${this.mapId}:${t.id}`]) return false;
    return this.world.test(t.when);
  }

  /** A trigger is due: run it now, or keep it pending until the blocking activity ends. */
  _due(t) {
    if (!this._armedTrigger(t)) return;
    if (this._blocked()) {
      if (!this._pending.includes(t)) this._pending.push(t);
      return;
    }
    this._fire(t);
  }

  _fire(t) {
    this._pending = this._pending.filter((p) => p !== t);
    this._run(t.script, { trigger: { ...t, map: this.mapId } });
  }

  _firePending() {
    while (this._pending.length) {
      const t = this._pending.shift();
      if (this._armedTrigger(t)) {
        this._fire(t);
        return true;
      }
    }
    return false;
  }

  _updateTriggers(blocked) {
    if (this._staged) return;
    for (const t of this.world.map.triggers) {
      if (t.on !== 'enter') continue;
      const inside = this._insideTrigger(t);
      const was = this._inside.get(t.id);
      this._inside.set(t.id, inside);
      if (inside && !was) this._due(t);
    }
    if (!blocked) this._checkFlagTriggers();
  }

  /** `flag` triggers fire when their condition turns true while this map is loaded. */
  _checkFlagTriggers() {
    if (!this.world || this._staged) return;
    for (const t of this.world.map.triggers) {
      if (t.on !== 'flag') continue;
      const on = this._armedTrigger(t);
      const was = this._flagOn.get(`${this.mapId}:${t.id}`);
      this._flagOn.set(`${this.mapId}:${t.id}`, on);
      if (on && !was) this._due(t);
    }
  }

  // ------------------------------------------------------------------ exits

  _updateExits() {
    const e = this.world.exitAt(this.player.x, this.player.z);
    const id = e ? e.id : null;
    const fresh = id && id !== this._exitInside;
    this._exitInside = id;
    if (!fresh || e.auto === false) return false;
    this._go(e.to, e.transition);
    return true;
  }

  _go(to, transition = 'fade') {
    const { travel } = this.ctx;
    this.player.stop();
    this.ctx.ui.hud.setPrompt(null);
    this._busy = true;
    Promise.resolve(travel.arrive(to.map, to.spawn, { transition, kind: 'exit' }))
      .catch(surface)
      .finally(() => { this._busy = false; });
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
    // a prompted (non-auto) exit the leader stands in
    if (!best) {
      const e = this.world.exitAt(p.x, p.z);
      if (e && e.auto === false) {
        if (!this._exitTarget || this._exitTarget.exit !== e) this._exitTarget = { kind: 'mapExit', id: e.id, exit: e, label: e.label || 'Go', icon: 'travel' };
        best = this._exitTarget;
      }
    }
    return best;
  }

  _prompt(it) {
    const { ui } = this.ctx;
    if (!it) return ui.hud.setPrompt(null);
    if (it.kind === 'door') {
      const held = it.lock.item && hasItem(it.lock.item);
      return held ? ui.hud.setPrompt('Unlock', it.lock.item) : ui.hud.setPrompt(it.label, it.icon);
    }
    if (it.kind === 'med' && this._partyTalks().length) return ui.hud.setPrompt(it.label, { icon: it.icon, badge: '!' });
    return ui.hud.setPrompt(it.label, it.icon);
  }

  _updateInteraction(input) {
    const it = this._pickTarget();
    if (it !== this._target) this._prompt(it);
    this._target = it;
    if (it && input.pressed('confirm')) {
      input.consume('confirm');
      this._target = null;
      this.ctx.ui.hud.setPrompt(null);
      this._interact(it).catch(surface);
    }
  }

  /**
   * Run a script id or an inline function through the cutscene runner (locks, dialog context and
   * deferred saves are the runner's), keeping field control paused until it ends.
   */
  _run(script, args = {}) {
    const { cutscenes } = this.ctx;
    this._busy = true;
    this._target = null;
    this.ctx.ui.hud.setPrompt(null);
    return Promise.resolve()
      .then(() => cutscenes.run(script, args))
      .finally(() => { this._busy = false; });
  }

  /** TalkSpec entries -> the first whose `when` holds (script id or inline lines), or null. */
  _pickTalk(spec) {
    for (const e of normalizeTalk(spec) || []) if (this.world.test(e.when)) return e;
    return null;
  }

  /** Inline (legacy) lines with 'enemy:<art>' portraits resolved to enemy icons. */
  _lines(lines) {
    return lines.map((l) => (l && typeof l.portrait === 'string' && l.portrait.startsWith('enemy:') ? { ...l, portrait: buildEnemyIcon(l.portrait.slice(6)) } : l));
  }

  /** Run a TalkSpec entry: a script with args, or inline lines through cs.say. */
  _runTalk(entry, args) {
    if (!entry) return Promise.resolve();
    if (entry.script) return this._run(entry.script, args);
    const lines = this._lines(entry.lines);
    return this._run((cs) => cs.say(lines), args);
  }

  async _interact(it) {
    if (it.leader && it.leader !== this._leaderId() && it.kind !== 'npc') return this._leaderHint(it);
    switch (it.kind) {
      case 'npc': return this._talk(it);
      case 'terminal':
      case 'inspect':
        this.ctx.audio.sfx('confirm');
        return this._runTalk(it.script ? { script: it.script } : this._pickTalk(it.talk), { interactable: it.def });
      case 'med': return this._medStation(it);
      case 'chest': return this._openChest(it);
      case 'door': return this._lockedDoor(it);
      case 'boss': return this._confront(it.id);
      case 'switch': return this._switch(it);
      case 'shard': return this._shard(it);
      case 'shop': return this._run((cs) => cs.shop(it.shop), { interactable: it.def });
      case 'starchart': return this._run((cs) => cs.travel(), { interactable: it.def });
      case 'exit': return this._go(it.to, it.transition);
      case 'mapExit': return this._go(it.exit.to, it.exit.transition);
      case 'lift': return this._lift(it);
      default:
        console.warn(`explore: unknown interactable kind "${it.kind}" (${it.id})`);
        return null;
    }
  }

  _leaderHint(it) {
    if (REG.scripts['common.leader_hint']) return this._run('common.leader_hint', { member: it.leader, interactable: it.def });
    const name = it.leader.toUpperCase();
    return this._run((cs) => cs.say([{ speaker: null, text: `*${name}* could handle this.` }]), { member: it.leader });
  }

  async _talk(it) {
    const { audio } = this.ctx;
    const npc = it.npc;
    const p = this.player;
    p.face(npc.x, npc.z);
    this.world.setTalking(it.id, true, p);
    audio.sfx('talk');
    const comp = REG.companions[it.id];
    const spec = comp ? [...(this.world.map.talk?.[it.id] || []), ...(normalizeTalk(comp.talk) || [])] : it.def.talk;
    try {
      await this._runTalk(this._pickTalk(spec), { npc: it.def });
      this.ctx.state.flags[`talk:${this.mapId}:${it.id}`] = true;
    } finally {
      this.world.setTalking(it.id, false);
    }
  }

  _partyTalks() {
    const { state, story } = this.ctx;
    const chapter = (story && story.chapter) || (state.story && state.story.chapter);
    const inParty = new Set((state.party || []).map((m) => m.id));
    return Object.entries(REG.partyTalks).filter(([id, pt]) => pt.chapter === chapter
      && (pt.members || []).every((m) => inParty.has(m)) && this.world.test(pt.when) && !state.flags[`ptalk:${id}`]);
  }

  /** Med-Station / inn: Restore (heal + checkpoint), Save (game.write to a file), Party Talk, Leave. */
  _medStation(it) {
    const { ui, audio } = this.ctx;
    const p = this.player;
    p.face(it.x, it.z - 0.4);
    audio.sfx('confirm');
    return this._run(async (cs) => {
      const talks = this._partyTalks();
      const options = [it.restoreLabel || 'Restore', 'Save'];
      if (talks.length) options.push('Party Talk');
      options.push('Leave');
      const pick = options[await cs.choice(it.prompt || 'Restore the squad and log a checkpoint?', options, { speaker: (it.label || 'Med-Station').toUpperCase(), cancelIndex: options.length - 1 })];
      if (pick === options[0]) {
        await cs.heal();
        cs.checkpoint();
        audio.sfx('save');
        this.world.particles.emit('heal', [p.x, 0.1, p.z], { count: 14 });
        ui.hud.toast('Squad restored · *checkpoint logged*', { icon: 'save' });
      } else if (pick === 'Save') {
        const slot = await ui.saves.open({ mode: 'save', slots: listSlots(), storage: storageMode() });
        if (!slot) return;
        const ok = this.ctx.game.write(slot);
        audio.sfx(ok ? 'save' : 'error');
        ui.hud.toast(ok ? 'Journey *saved*' : 'Saving failed', { icon: 'save' });
      } else if (pick === 'Party Talk') {
        const titles = talks.map(([, pt]) => pt.title);
        const i = await cs.choice('Party Talk', [...titles, 'Back'], { cancelIndex: titles.length });
        if (i < titles.length) {
          const [id, pt] = talks[i];
          await cs.run(pt.script, { ptalk: id });
        }
      }
    }, { interactable: it.def });
  }

  /** Chests (3.5): flag chest:<map>:<id>, item or credits, POC toast and sparkle; optional talk. */
  _openChest(it) {
    const { ui, audio, state } = this.ctx;
    const c = it.chest;
    if (it.opened) return Promise.resolve();
    this.player.face(c.x, c.z);
    if (c.item) addItem(c.item, c.n || 1);
    if (c.credits) state.credits = (state.credits || 0) + c.credits;
    this._setFlag(`chest:${this.mapId}:${c.id}`);
    audio.sfx('pickup');
    this.world.particles.emit(c.item === 'keycard' ? 'boost' : 'holo', [c.x, 0.9, c.z], { count: 18 });
    if (c.item) {
      const item = ITEMS[c.item];
      const n = c.n || 1;
      ui.hud.toast(`Obtained *${item ? item.name : c.item}*${n > 1 ? ` ×${n}` : ''}`, { icon: (item && item.icon) || c.item });
    }
    if (c.credits) ui.hud.toast(`Obtained *${c.credits} credits*`, { icon: 'credits' });
    return this._runTalk(this._pickTalk(c.talk), { chest: c });
  }

  _lockedDoor(it) {
    const { ui, audio } = this.ctx;
    const lock = it.lock;
    if (lock.item && hasItem(lock.item)) {
      this._setFlag(lock.flag);
      audio.sfx('unlock');
      audio.sfx('confirm');
      ui.hud.toast(lock.toast || 'Door *unlocked*', { icon: lock.item });
      return Promise.resolve();
    }
    audio.sfx('error');
    const entry = this._pickTalk(lock.talk) || { lines: [{ speaker: null, text: 'It\'s *locked*.' }] };
    return this._runTalk(entry, { interactable: { id: lock.id, kind: 'door' } });
  }

  _switch(it) {
    const { audio, state } = this.ctx;
    const on = !state.flags[it.flag];
    if (it.mode === 'once' && !on) return Promise.resolve();
    audio.sfx(it.sfx || 'valve');
    return this._run(async (cs) => {
      const gate = it.reveal && this.world.gates.find((g) => g.def.id === it.reveal);
      if (gate) {
        // the camera shows the gate this switch drives while it changes, then comes back (11.8)
        const [x, z] = gate.cells.reduce((a, [c, r]) => [a[0] + c + 0.5, a[1] + r + 0.5], [0, 0]).map((v) => v / gate.cells.length);
        await this.camera.focus([x, z], { ms: 700 });
      }
      this._setFlag(it.flag, on);
      if (gate) {
        await cs.wait(0.9);
        await this.camera.reset({ ms: 700 });
      }
      if (it.script) await cs.run(it.script, { interactable: it.def, on });
    }, { interactable: it.def });
  }

  _shard(it) {
    this.ctx.audio.sfx('shard');
    this._setFlag(it.flag);
    if (!it.script) return Promise.resolve();
    return this._run(it.script, { interactable: it.def });
  }

  /** Lift (3.5): the camera rises while light streams fall, a fade, the next tier; no save. */
  _lift(it) {
    const { engine, audio } = this.ctx;
    const p = this.player;
    return this._run(async (cs) => {
      if (it.script) await cs.run(it.script, { interactable: it.def });
      audio.sfx('lift');
      this.world.particles.emit('light_stream', [p.x, 4, p.z], { count: 24 });
      const v = this.camera._baseView();
      await this.camera.view({ pitch: v.pitch + 12, dist: v.dist * 1.3, ms: 900 });
      await engine.transition('fade', {
        duration: 0.9,
        onMidpoint: () => {
          const pitch = this.camera.pitch, dist = this.camera.dist;
          this._place(it.to);
          this.camera.view({ pitch, dist, ms: 0 });
        },
      });
      const q = this.player;
      this.world.particles.emit('light_stream', [q.x, 4, q.z], { count: 18 });
      await this.camera.reset({ ms: 900 });
      this.arrive('lift');
    }, { interactable: it.def });
  }

  // ------------------------------------------------------------------ field bosses

  _updateBosses() {
    for (const [id, b] of Object.entries(this.world.bosses)) {
      if (!b.present) continue;
      const d = Math.hypot(this.player.x - b.actor.x, this.player.z - b.actor.z);
      const r = b.def.triggerRadius;
      if (!this._armed.has(id)) this._armed.set(id, d > r);
      if (d > r + 2.5) this._armed.set(id, true);
      else if (d < r && this._armed.get(id)) {
        this._confront(id).catch(surface);
        return;
      }
    }
  }

  /** A boss confronts the party: its script (which calls cs.battle), or its lines and the battle. */
  _confront(id) {
    const { audio } = this.ctx;
    const b = this.world.bosses[id];
    this._armed.set(id, false);
    this.player.face(b.actor.x, b.actor.z);
    this.world.touch(id);
    if (b.def.script) return this._run(b.def.script, { boss: b.def });
    audio.sfx('charge');
    b.actor.actor.flash('#ff3b4e', 0.35);
    const talk = this._pickTalk(b.def.talk);
    return this._run(async (cs) => {
      if (talk && talk.script) await cs.run(talk.script, { boss: b.def });
      else if (talk) await cs.say(this._lines(talk.lines));
      await cs.battle(b.def.encounter);
    }, { boss: b.def });
  }

  // ------------------------------------------------------------------ companions (3.6)

  _updateTrail() {
    const p = this.player;
    const last = this._trail[this._trail.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) >= TRAIL_STEP) {
      this._trail.push({ x: p.x, z: p.z });
      if (this._trail.length > TRAIL_MAX) this._trail.shift();
    }
  }

  /** The point COMPANION_GAP units back along the leader's recent path. */
  _trailPoint() {
    const p = this.player;
    let px = p.x, pz = p.z, left = COMPANION_GAP;
    for (let i = this._trail.length - 1; i >= 0; i--) {
      const q = this._trail[i];
      const d = Math.hypot(q.x - px, q.z - pz);
      if (d >= left) {
        const k = left / d;
        return { x: px + (q.x - px) * k, z: pz + (q.z - pz) * k };
      }
      left -= d;
      px = q.x;
      pz = q.z;
    }
    // too little path yet: stand behind the leader
    return { x: p.x - p.dir.x * COMPANION_GAP * 0.8 + 0.5, z: p.z - p.dir.z * COMPANION_GAP * 0.8 - 0.3 };
  }

  _companionWanted(def) {
    const map = this.world.map;
    return map.companions !== false && !map.scene && !map.transit && this.world.test(def.follow);
  }

  _syncCompanions(snap) {
    if (!this.world) return;
    for (const [id, def] of Object.entries(REG.companions)) {
      const want = this._companionWanted(def);
      const have = this._companions.has(id) && this.world.npc(id);
      if (want && !have) {
        const at = this._trailPoint();
        this.world.spawnNpc({
          id, sprite: def.sprite, name: def.name, x: at.x, z: at.z, facing: this.player.facing,
          talk: def.talk || null, solid: false, companion: true,
        }, { fade: snap ? 0 : 0.3 });
        this._companions.set(id, def);
      } else if (!want && have) {
        const npc = this.world.npc(id);
        this._companions.delete(id);
        npc.setVisible(false, { fade: 0.3 }).then(() => { if (this.world && this.world.npc(id) === npc) this.world.removeNpc(id); });
      } else if (want && have && snap) {
        const at = this._trailPoint();
        this.world.npc(id).setPosition(at.x, at.z, this.player.facing);
      }
    }
  }

  _despawnCompanions() {
    if (this.world) for (const id of this._companions.keys()) this.world.removeNpc(id);
    this._companions.clear();
  }

  /** Companions trail the leader's path (walk frames from NpcActor.walkTo), snap after jumps. */
  _updateCompanions() {
    if (!this._companions.size) return;
    const at = this._trailPoint();
    for (const id of this._companions.keys()) {
      const npc = this.world.npc(id);
      if (!npc || this.world.isTouched(id)) continue;
      const d = Math.hypot(at.x - npc.x, at.z - npc.z);
      if (d > 6) npc.setPosition(at.x, at.z, this.player.facing);
      else if (d > 0.1) npc.walkTo([[at.x, at.z]], { speed: clamp(d * 3.2, 1.2, 7) });
    }
  }

  // ------------------------------------------------------------------ encounters

  /** The area's zone: a string, or the first { when, zone } entry whose condition holds. */
  _zoneOf(area) {
    if (!area || area.puzzle) return null;
    const z = area.zone;
    if (Array.isArray(z)) {
      for (const e of z) if (this.world.test(e.when)) return e.zone || null;
      return null;
    }
    return z || null;
  }

  _zoneRate(zone) {
    return REG.zoneRates[zone] || (POC_ZONES.has(zone) ? POC_ZONE_RATE : ZONE_RATE_DEFAULT);
  }

  /** Hazard multiplier: equipment (Ghost Signal), the Encounters setting, Skip weak encounters. */
  _encounterFactor(zone) {
    const { state, ui } = this.ctx;
    let k = 1;
    for (const m of state.party || []) if (m.alive !== false && m.mods && m.mods.encounterRate) k = Math.min(k, m.mods.encounterRate);
    if (ui.getSetting && ui.getSetting('encounters') === 'low') k *= LOW_ENCOUNTERS;
    if (ui.getSetting && ui.getSetting('skipWeak')) {
      const party = state.party || [];
      const avg = party.reduce((s, m) => s + (m.level || 1), 0) / Math.max(1, party.length);
      let level = 0;
      for (const enc of ENCOUNTER_TABLES[zone] || []) for (const kind of ENCOUNTERS[enc]?.enemies || []) level = Math.max(level, ENEMIES[kind]?.level || 0);
      if (level && level <= avg - WEAK_GAP) k = 0;
    }
    return k;
  }

  _updateEncounters(moved) {
    const { ui } = this.ctx;
    const zone = this._staged ? null : this._zoneOf(this.area);
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
    const { grace, sigma } = this._zoneRate(this._zone);
    const k = this._encounterFactor(this._zone);
    const before = this._walked;
    this._walked += moved;
    const s0 = Math.max(0, before - grace), s1 = Math.max(0, this._walked - grace);
    this._danger = k <= 0 ? 0 : this._walked < grace ? 0.04 + 0.1 * (this._walked / grace) : 0.14 + 0.86 * (1 - Math.exp(-hazard(s1, sigma) * k));
    ui.hud.setDanger(this._danger);
    if (k > 0 && s1 > s0 && Math.random() < 1 - Math.exp(-(hazard(s1, sigma) - hazard(s0, sigma)) * k)) {
      const table = ENCOUNTER_TABLES[this._zone];
      if (!table || !table.length) return;
      this._battle(table[Math.floor(Math.random() * table.length)]);
    }
  }

  _battle(encounterId) {
    const { ui, game } = this.ctx;
    this._busy = true;
    this._target = null;
    this._walked = 0;
    ui.hud.setPrompt(null);
    this.player.stop();
    const started = game.startBattle(encounterId);
    // the game refuses while another battle or transition runs: hand control back
    if (!started) this._busy = false;
    else if (typeof started.then === 'function') started.catch(surface).finally(() => { this._busy = false; });
  }
}
