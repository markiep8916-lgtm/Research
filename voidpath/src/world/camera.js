// Field camera (TECH_PLAN 3.10): the POC diorama camera (FOV 30, pitch 34 degrees, distance 16,
// portrait pull-back, look-ahead, area clamps) plus per-map and per-area views and the scripted
// shots cutscenes use. ExploreState owns one FieldCamera; scripts reach it as explore.camera.
//
//   focus(target, { zoom = 1, ms = 800 }) -> Promise   actor id, [x, z] or { x, z }; zoom < 1 = closer
//   view({ pitch, dist, ms = 800 }) -> Promise         pitch / distance override until reset
//   pan(points, { sec }) -> Promise                    slow pans along [[x, z], ...]
//   reset({ ms = 600 }) -> Promise                     back to follow mode with the area view
//   snap()                                             jump to the follow target (arrivals, teleports)
//   update(dt); look ({ x, z }: current look target); scripted (bool); camera (THREE camera)
//   projectionMatrix, matrixWorldInverse, updateMatrixWorld(): the THREE camera's, for camera-taking tools
//
// In follow mode the tilt-shift band stays on the leader (POC); while a script holds the camera the
// band, like the shadow camera, follows the look target so focus shots and pans stay sharp.

import * as THREE from 'three';
import { clamp, damp, ease } from '../core/util.js';

export const FOV = 30;
export const PITCH = 34;
export const DIST = 16;
export const TARGET_Y = 0.9;
const AREA_VIEW_MS = 800;

const deg = THREE.MathUtils.degToRad;

export class FieldCamera {
  /** host: ExploreState (reads ctx.engine, world, player, area and resolves actor ids). */
  constructor(host) {
    this.host = host;
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 140);
    this.look = { x: 0, z: 0 };
    this.pitch = PITCH;
    this.dist = DIST;
    this.scripted = false;
    this._ahead = { x: 0, z: 0 };
    this._desired = { x: 0, z: 0 };
    this._override = null;     // { pitch, dist } from view()
    this._zoom = 1;
    this._track = null;        // () => { x, z } while a focus shot holds an actor or point
    this._move = null;         // look-target tween (focus, pan, reset)
    this._viewTw = null;       // pitch / distance tween
    this._viewKey = '';
  }

  // camera-like members, so tools that take a THREE camera (visualLint, Vector3.project) accept it
  get projectionMatrix() { return this.camera.projectionMatrix; }
  get matrixWorldInverse() { return this.camera.matrixWorldInverse; }
  updateMatrixWorld() { this.camera.updateMatrixWorld(); }

  // ------------------------------------------------------------------ scripted shots

  focus(target, { zoom = 1, ms = 800 } = {}) {
    const track = this._resolve(target);
    if (!track) {
      console.warn(`camera.focus: unknown target ${JSON.stringify(target)}`);
      return Promise.resolve();
    }
    this.scripted = true;
    this._track = track;
    this._zoom = zoom;
    this._startView(ms);
    return this._moveTo(track, ms);
  }

  view({ pitch, dist, ms = 800 } = {}) {
    this._override = { pitch: pitch ?? this._baseView().pitch, dist: dist ?? this._baseView().dist };
    return this._startView(ms);
  }

  pan(points, { sec = 4 } = {}) {
    const pts = (points || []).map((p) => (Array.isArray(p) ? { x: p[0], z: p[1] } : { x: p.x, z: p.z }));
    if (!pts.length) return Promise.resolve();
    this.scripted = true;
    const path = [{ x: this.look.x, z: this.look.z }, ...pts];
    const lens = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const l = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
      lens.push(l);
      total += l;
    }
    const end = path[path.length - 1];
    this._track = () => end;
    return new Promise((resolve) => {
      this._move = {
        t: 0, ms: Math.max(1, sec * 1000), resolve, easing: ease.inOutQuad,
        at: (k) => {
          let s = k * total;
          for (let i = 0; i < lens.length; i++) {
            if (s <= lens[i] || i === lens.length - 1) {
              const f = lens[i] ? clamp(s / lens[i], 0, 1) : 1;
              return { x: path[i].x + (path[i + 1].x - path[i].x) * f, z: path[i].z + (path[i + 1].z - path[i].z) * f };
            }
            s -= lens[i];
          }
          return end;
        },
      };
    });
  }

  reset({ ms = 600 } = {}) {
    this._override = null;
    this._zoom = 1;
    this._track = null;
    const done = this._moveTo(() => this._followTarget(this._desired), ms).then(() => { this.scripted = false; });
    this._startView(ms);
    return done;
  }

  /** Drop every scripted state at once (script end without reset, aborts, arrivals). */
  release() {
    if (this._move) this._move.resolve();
    if (this._viewTw) this._viewTw.resolve();
    this._move = null;
    this._viewTw = null;
    this._override = null;
    this._zoom = 1;
    this._track = null;
    this.scripted = false;
  }

  // ------------------------------------------------------------------ follow mode

  /** Jump straight to the follow target and the area view (arrivals, teleports, respawns). */
  snap() {
    this.release();
    this._ahead.x = 0;
    this._ahead.z = 0;
    this._followTarget(this.look);
    const v = this._baseView();
    this.pitch = v.pitch;
    this.dist = v.dist;
    this._viewKey = `${v.pitch}|${v.dist}`;
    this._place();
  }

  update(dt) {
    const p = this.host.player;
    if (!p) return;
    const lx = p.moving ? p.dir.x * 1.5 : 0, lz = p.moving ? p.dir.z * 0.7 : 0;
    this._ahead.x = damp(this._ahead.x, lx, 1.8, dt);
    this._ahead.z = damp(this._ahead.z, lz, 1.8, dt);
    this._updateView(dt);
    if (this._move) {
      const m = this._move;
      m.t += dt * 1000;
      const k = Math.min(1, m.t / m.ms);
      const at = m.at(m.easing(k));
      this.look.x = at.x;
      this.look.z = at.z;
      if (k >= 1) {
        this._move = null;
        m.resolve();
      }
    } else if (this._track) {
      const at = this._track();
      this.look.x = damp(this.look.x, at.x, 6, dt);
      this.look.z = damp(this.look.z, at.z, 6, dt);
    } else if (!this.scripted) {
      this._followTarget(this._desired);
      this.look.x = damp(this.look.x, this._desired.x, 4.5, dt);
      this.look.z = damp(this.look.z, this._desired.z, 4.5, dt);
    }
    this._place();
  }

  // ------------------------------------------------------------------ internals

  _aspect() {
    return this.host.ctx.engine.size.aspect || 16 / 9;
  }

  /** Portrait / narrow screens pull back so phones still see the room around the leader. */
  _pullBack() {
    const aspect = this._aspect();
    return aspect >= 1.2 ? 1 : clamp(Math.pow(1.2 / aspect, 0.5), 1, 30 / DIST);
  }

  /** The map view, overridden by the leader's area view, overridden by a script's view(). */
  _baseView() {
    const map = this.host.world && this.host.world.map;
    const area = this.host.area;
    const v = { pitch: PITCH, dist: DIST, ...(map && map.view), ...(area && area.view) };
    return v;
  }

  _wantedView() {
    const v = this._override || this._baseView();
    return { pitch: v.pitch, dist: v.dist * this._zoom };
  }

  _startView(ms) {
    const to = this._wantedView();
    this._viewKey = `${to.pitch}|${to.dist}`;
    if (this._viewTw) this._viewTw.resolve();
    return new Promise((resolve) => {
      this._viewTw = { from: { pitch: this.pitch, dist: this.dist }, to, t: 0, ms: Math.max(1, ms), resolve };
    });
  }

  _updateView(dt) {
    const want = this._wantedView();
    const key = `${want.pitch}|${want.dist}`;
    // area changes (and map changes) glide to the new view over 0.8 s
    if (key !== this._viewKey) this._startView(AREA_VIEW_MS);
    const tw = this._viewTw;
    if (!tw) return;
    tw.t += dt * 1000;
    const k = Math.min(1, tw.t / tw.ms);
    const e = ease.inOutQuad(k);
    this.pitch = tw.from.pitch + (tw.to.pitch - tw.from.pitch) * e;
    this.dist = tw.from.dist + (tw.to.dist - tw.from.dist) * e;
    if (k >= 1) {
      this._viewTw = null;
      tw.resolve();
    }
  }

  /** Follow target: leader + look-ahead, clamped to the area (POC rules). Writes into out. */
  _followTarget(out) {
    const p = this.host.player;
    if (!p) return out;
    const D = this.dist * this._pullBack();
    const hw = D * Math.tan(deg(FOV / 2)) * this._aspect();
    let tx = p.x + this._ahead.x, tz = p.z + this._ahead.z;
    const a = this.host.area;
    if (a) {
      const m = 1.2;
      const lo = a.rect[0] + hw - m, hi = a.rect[2] - hw + m;
      tx = lo > hi ? (a.rect[0] + a.rect[2]) / 2 : clamp(tx, lo, hi);
      const cz = a.cam || [a.rect[1], a.rect[3]];
      tz = clamp(tz, cz[0], cz[1]);
    }
    out.x = tx;
    out.z = tz;
    return out;
  }

  _moveTo(track, ms) {
    if (this._move) this._move.resolve();
    const from = { x: this.look.x, z: this.look.z };
    return new Promise((resolve) => {
      this._move = {
        t: 0, ms: Math.max(1, ms), resolve, easing: ease.inOutCubic,
        at: (k) => {
          const to = track();
          return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
        },
      };
    });
  }

  /** target -> () => { x, z } (actor ids follow the actor while it moves). */
  _resolve(target) {
    if (Array.isArray(target)) {
      const pt = { x: target[0], z: target[1] };
      return () => pt;
    }
    if (target && typeof target === 'object' && Number.isFinite(target.x)) {
      const pt = { x: target.x, z: target.z };
      return () => pt;
    }
    if (typeof target === 'string' && this.host.actorPos(target)) {
      let last = this.host.actorPos(target);
      return () => {
        last = this.host.actorPos(target) || last;
        return last;
      };
    }
    return null;
  }

  _place() {
    const cam = this.camera;
    const D = this.dist * this._pullBack();
    const pr = deg(this.pitch);
    cam.position.set(this.look.x, TARGET_Y + Math.sin(pr) * D, this.look.z + Math.cos(pr) * D);
    cam.lookAt(this.look.x, TARGET_Y, this.look.z);
    cam.updateMatrixWorld();
  }
}
