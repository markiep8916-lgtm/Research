// Base class for everything that lives in a room and is not terrain.
import { disposeTree } from '../gfx/models/common.js';

export class Entity {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y; this.px = x; this.py = y;
    this.vx = 0; this.vy = 0;
    this.hw = 0.4; this.h = 0.8;
    this.face = 1;
    this.dead = false;
    this.model = null;
    this.z = 0; this.yOff = 0;
    this.events = []; // required by the shared collision helpers
    this.kind = 'entity';
  }

  get box() { return { l: this.x - this.hw, r: this.x + this.hw, b: this.y, t: this.y + this.h }; }
  get cx() { return this.x; }
  get cy() { return this.y + this.h / 2; }

  update(/* dt */) {}
  snap() { this.px = this.x; this.py = this.y; }

  render(alpha) {
    if (!this.model) return;
    this.model.position.set(this.px + (this.x - this.px) * alpha, this.py + (this.y - this.py) * alpha + this.yOff, this.z);
  }

  destroy() {
    this.dead = true;
    if (this.model) { this.model.parent?.remove(this.model); disposeTree(this.model); this.model = null; }
  }
}

export const overlap = (a, b) => a.r > b.l && a.l < b.r && a.t > b.b && a.b < b.t;
export const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
