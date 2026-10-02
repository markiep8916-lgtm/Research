// Side-scroller camera: smooth follow, look-ahead, room clamping, shake, and aspect-aware distance.
import { clamp, damp } from '../core/util.js';

const FOV = 38;
const TAN = Math.tan((FOV * Math.PI) / 360);

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.x = 0; this.y = 3;
    this.look = 0;
    this.shake = 0; this.shakeT = 0;
    this.roomW = 40; this.roomH = 24;
    this.baseDist = 18.5;
    this.dist = 18.5;
    this.zoom = 1;          // <1 pulls the camera in (boss intros), >1 out
    this.fixed = null;      // {x,y} to lock the camera (boss arenas)
    this.drop = 0;          // extra downward bias while falling fast
    this.shakeX = 0; this.shakeY = 0;
  }

  setRoom(w, h) { this.roomW = w; this.roomH = h; }

  /** Distance so that at least ~22 tiles are visible horizontally (clamped for tall/narrow screens). */
  computeDist(aspect) {
    const want = 22 / (2 * TAN * aspect);
    return clamp(Math.max(this.baseDist, want), this.baseDist, 40) * this.zoom;
  }

  halfView(aspect) {
    const d = this.computeDist(aspect);
    return { hw: d * TAN * aspect, hh: d * TAN, d };
  }

  clampTarget(x, y, aspect) {
    const { hw, hh } = this.halfView(aspect);
    const minX = hw, maxX = this.roomW - hw;
    const minY = hh - 1.5, maxY = this.roomH - hh + 1.0;
    return [
      maxX < minX ? this.roomW / 2 : clamp(x, minX, maxX),
      maxY < minY ? this.roomH / 2 : clamp(y, minY, maxY),
    ];
  }

  snap(x, y, face, aspect) {
    this.look = face * 2.2;
    [this.x, this.y] = this.clampTarget(x + this.look, y + 1.3, aspect);
    this.apply(aspect, 0);
  }

  addShake(a) { this.shake = Math.max(this.shake, a); }

  update(dt, tx, ty, face, vy, aspect) {
    if (this.fixed) { tx = this.fixed.x; ty = this.fixed.y; face = 0; }
    this.look = damp(this.look, face * 2.6, 3.2, dt);
    this.drop = damp(this.drop, vy < -14 ? -2.2 : 0, 3, dt);
    const [gx, gy] = this.clampTarget(tx + this.look, ty + 1.4 + this.drop, aspect);
    this.x = damp(this.x, gx, 7.5, dt);
    this.y = damp(this.y, gy, vy < -10 ? 9 : 5.5, dt);
    this.apply(aspect, dt);
  }

  apply(aspect, dt) {
    this.dist = damp(this.dist, this.computeDist(aspect), 5, dt || 1);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.shakeT += dt * 60;
    const s = this.shake * this.shake;
    this.shakeX = Math.sin(this.shakeT * 1.7) * s * 0.55 + Math.sin(this.shakeT * 3.1) * s * 0.25;
    this.shakeY = Math.cos(this.shakeT * 2.3) * s * 0.55;
    this.cam.position.set(this.x + this.shakeX, this.y + 1.4 + this.shakeY, this.dist);
    this.cam.lookAt(this.x + this.shakeX, this.y - 0.6 + this.shakeY, 0);
  }
}
