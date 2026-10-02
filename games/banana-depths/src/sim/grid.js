// Mutable tile grid used by the physics (and by the headless solver). Row 0 is the BOTTOM of the room.
import { T } from './tiles.js';

export class Grid {
  /**
   * @param {number} w @param {number} h
   * @param {Uint8Array} tiles   w*h tile ids, index = y*w + x
   * @param {Uint8Array} [open]  w*h flags: 1 where a border cell is a portal opening (outside is then empty)
   */
  constructor(w, h, tiles, open) {
    this.w = w;
    this.h = h;
    this.tiles = tiles;
    this.open = open || new Uint8Array(w * h);
    this.log = []; // [{tx,ty,kind}] broken tiles, for tools
    this.onChange = null; // (tx, ty, newTile, kind) hook so the renderer / save system can follow along
  }

  tile(tx, ty) {
    if (tx < 0 || tx >= this.w) {
      const cx = tx < 0 ? 0 : this.w - 1;
      if (ty >= 0 && ty < this.h && this.open[ty * this.w + cx]) return T.EMPTY;
      return T.SOLID;
    }
    if (ty < 0) return T.EMPTY; // below the room: a pit, the game respawns the player
    if (ty >= this.h) return this.open[(this.h - 1) * this.w + tx] ? T.EMPTY : T.SOLID;
    return this.tiles[ty * this.w + tx];
  }

  set(tx, ty, t) {
    if (tx >= 0 && tx < this.w && ty >= 0 && ty < this.h) this.tiles[ty * this.w + tx] = t;
  }

  /** Breaks a tile. Crate walls (roll blocks) crumble as a whole column. */
  breakTile(tx, ty, kind) {
    this.set(tx, ty, T.EMPTY);
    this.log.push({ tx, ty, kind });
    if (this.onChange) this.onChange(tx, ty, T.EMPTY, kind);
    if (kind === 'roll') {
      for (const dir of [1, -1]) {
        for (let y = ty + dir; this.tile(tx, y) === T.ROLL_BLOCK; y += dir) {
          this.set(tx, y, T.EMPTY);
          this.log.push({ tx, ty: y, kind });
          if (this.onChange) this.onChange(tx, y, T.EMPTY, kind);
        }
      }
    }
  }

  crumble(/* tx, ty */) {}

  clone() {
    return new Grid(this.w, this.h, this.tiles.slice(), this.open);
  }
}
