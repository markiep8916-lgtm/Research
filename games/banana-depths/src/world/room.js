// Runtime state of the room the player is in: a mutable Grid plus persistence hooks.
import { Grid } from '../sim/grid.js';
import { T } from '../sim/tiles.js';

const CRUMBLE_DELAY = 0.45;
const CRUMBLE_RESPAWN = 3.2;

export class RoomRuntime {
  /** @param def static RoomDef  @param save persistent save state */
  constructor(def, save) {
    this.def = def;
    this.save = save;
    this.grid = new Grid(def.w, def.h, def.tiles.slice(), def.open);
    this.crumbles = new Map(); // "x,y" -> { x, y, t, phase: 'shake'|'gone' }
    this.onTile = null;        // (tx, ty, newTile, kind)
    const broken = save.broken[def.id];
    if (broken) for (const k of broken) { const [x, y] = k.split(',').map(Number); this.grid.set(x, y, T.EMPTY); }
    if (save.flags['gateA:' + def.id]) this.openGate(T.GATE_A, true);
    if (save.flags['gateB:' + def.id] || (def.props.boss && save.flags['boss:' + def.props.boss])) this.openGate(T.GATE_B, true);
    this.grid.onChange = (tx, ty, t, kind) => {
      (save.broken[def.id] ||= []).push(tx + ',' + ty);
      if (this.onTile) this.onTile(tx, ty, t, kind);
    };
    this.grid.crumble = (tx, ty) => this.startCrumble(tx, ty);
  }

  get w() { return this.def.w; }
  get h() { return this.def.h; }
  tile(x, y) { return this.grid.tile(x, y); }

  startCrumble(tx, ty) {
    const k = tx + ',' + ty;
    if (this.crumbles.has(k)) return;
    this.crumbles.set(k, { x: tx, y: ty, t: CRUMBLE_DELAY, phase: 'shake' });
  }

  /** Returns tiles that changed this frame: [{x,y,t,phase}] */
  updateCrumbles(dt, playerBox) {
    const events = [];
    for (const [k, c] of this.crumbles) {
      c.t -= dt;
      if (c.phase === 'shake' && c.t <= 0) {
        this.grid.set(c.x, c.y, T.EMPTY);
        c.phase = 'gone'; c.t = CRUMBLE_RESPAWN;
        events.push({ x: c.x, y: c.y, t: T.EMPTY, phase: 'fell' });
      } else if (c.phase === 'gone' && c.t <= 0) {
        const overlap = playerBox && playerBox.r > c.x && playerBox.l < c.x + 1 && playerBox.t > c.y && playerBox.b < c.y + 1;
        if (!overlap) {
          this.grid.set(c.x, c.y, T.CRUMBLE);
          this.crumbles.delete(k);
          events.push({ x: c.x, y: c.y, t: T.CRUMBLE, phase: 'back' });
        } else c.t = 0.3;
      }
    }
    return events;
  }

  /** Open every gate of one kind (T.GATE_A / T.GATE_B). Returns the opened tile positions. */
  openGate(kind, silent = false) {
    const opened = [];
    const { w, h } = this.def;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (this.grid.tiles[y * w + x] === kind) {
        this.grid.set(x, y, T.EMPTY);
        opened.push({ x, y });
        if (!silent && this.onTile) this.onTile(x, y, T.EMPTY, 'gate');
      }
    }
    return opened;
  }

  portalAt(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    const { w, h, portals } = this.def;
    const cx = Math.max(0, Math.min(w - 1, tx)), cy = Math.max(0, Math.min(h - 1, ty));
    for (const [ch, p] of Object.entries(portals)) {
      for (const c of p.cells) if (c.x === cx && c.y === cy) return { ch, ...p };
    }
    return null;
  }
}
