// World objects: breakable props, pickups, projectiles and ground hazards.

// Breakables: crate | drum (oil drum) | fuel (red, explodes) | fridge | trunk (car-wreck trunk) | trash
// drop: an item kind, 'none', or omitted for the random table (40% food, 35% score, 25% weapon).
const PROP_DEFS = {
  crate:  { hp: 2, w: 10, h: 18, cols: ['#8b5a2b', '#5a3a1a', '#c9a86a'], sfx: 'crate', solid: true },
  drum:   { hp: 3, w: 7, h: 20, cols: ['#5e6b73', '#3e474d', '#8c5a3c'], sfx: 'clank', solid: true },
  fuel:   { hp: 2, w: 7, h: 20, cols: ['#b8322a', '#6a1a16', '#f2eee0'], sfx: 'clank', solid: true },
  fridge: { hp: 3, w: 9, h: 30, cols: ['#d8d4c4', '#a06a40', '#8a8a8a'], sfx: 'clank', solid: true },
  trunk:  { hp: 2, w: 12, h: 14, cols: ['#8a5a3a', '#5a3a26', '#2a2020'], sfx: 'clank', solid: true },
  trash:  { hp: 1, w: 6, h: 16, cols: ['#6e7178', '#4a4d52', '#9aa0a8'], sfx: 'clank', solid: true },
};
function randomDrop() {
  const r = rand();
  if (r < 0.4) { const f = rand(); return f < 0.4 ? 'cactus' : f < 0.8 ? 'beans' : f < 0.95 ? 'rat' : 'water'; }
  if (r < 0.75) { const f = rand(); return f < 0.6 ? 'cap' : f < 0.9 ? 'pouch' : 'watch'; }
  const f = rand(); return f < 0.5 ? 'pipe' : f < 0.8 ? 'machete' : 'molotov';
}
class Breakable extends Ent {
  constructor(kind, x, y, drop) {
    super(x, y);
    const d = PROP_DEFS[kind];
    this.kind = kind; this.def = d;
    this.drop = drop === undefined || drop === null ? (kind === 'fuel' ? 'none' : kind === 'fridge' ? pick(['beans', 'rat', 'cactus']) : randomDrop()) : drop;
    this.team = 'prop';
    this.hp = d.hp;
    this.w = d.w; this.h = d.h;
    this.shadowR = d.w + 2;
    this.wob = 0; this.fuse = 0; this.rolling = 0; this.dent = 0;
    this.solidRect = { x0: x - d.w, x1: x + d.w, y0: y - 4, y1: y + 4, h: d.h, splat: false, prop: this };
    Game.solids.push(this.solidRect);
  }
  get vulnerable() { return !this.remove && this.fuse === 0; }
  takeHit(src, a, dir) {
    this.wob = 8; this.flash = 3;
    Sound.sfx(this.def.sfx, this.x);
    this.hs = 3; this.hitJitter = true;
    FX.hit(this.x - dir * 4, this.y, 10, 1, dir, '#ffffff');
    if (src && src.team === 'player' && src.addCombo) src.addCombo();
    this.igniter = src;
    this.hp -= (a.tier || 1) >= 3 ? 2 : 1;
    this.dent++;
    if (this.kind === 'fuel') {
      if (a.thrownBody) { this.fuse = 10; return; }
      if (this.hp <= 0) this.fuse = 1;
      return;
    }
    if (this.hp <= 0) this.smash(src);
  }
  smash(src) {
    if (this.remove) return;
    this.remove = true;
    this.solidRect.off = true;
    FX.debris(this.x, this.y, 8, this.def.cols, 12, [1, 3]);
    if (this.kind === 'crate' || this.kind === 'trunk') FX.shards(this.x, this.y, 10, 6, ['#8b5a2b', '#5a3a1a']);
    Sound.sfx('crate', this.x);
    Game.addScore(100);
    if (this.kind === 'drum') FX.pool(this.x, this.y + 1, '#15121a', 20);
    if (this.kind === 'fridge') FX.add({ kind: 'shard', x: this.x, y: this.y, z: 16, vx: 2.5, vz: 3, life: 60, color: '#d8d4c4', size: 8, rot: 0, spin: 0.25, g: 0.24, ground: this.y });
    if (this.drop && this.drop !== 'none') {
      const it = Game.add(new Item(this.drop, this.x, this.y + 1, 2.0));
      it.vx = rr(-0.4, 0.4);
    }
  }
  update(bounds) {
    if (this.wob > 0) this.wob--;
    if (this.flash > 0) this.flash--;
    if (this.hs > 0) { this.hs--; return; }
    if (this.fuse > 0) {
      this.fuse++;
      if (this.fuse > 10) {
        this.remove = true; this.solidRect.off = true;
        Game.explode(this.x, this.y, this.igniter || Game.player, { r: 36, depth: 14, dmg: 30, pdmg: 20 });
      }
    }
  }
  draw(ctx, camX) {
    const ox = this.wob ? (this.wob % 2 ? 1 : -1) : 0;
    const blink = this.fuse > 0 && (this.fuse >> 1) % 2;
    Sprite.begin(48, 48, 24, 44);
    const c = this.def.cols;
    switch (this.kind) {
      case 'crate':
        Px.rect(-10, -18, 20, 18, c[0]);
        Px.rect(-10, -18, 20, 2, shade(c[0], 0.25));
        Px.line(-8, -2, 8, -16, 2, c[1]); Px.line(-8, -16, 8, -2, 2, c[1]);
        Px.rect(-10, -18, 2, 18, c[1]); Px.rect(8, -18, 2, 18, c[1]);
        for (const [nx, ny] of [[-9, -17], [8, -17], [-9, -2], [8, -2]]) Px.dot(nx, ny, c[2]);
        break;
      case 'drum': {
        const tilt = Math.min(3, this.dent);
        Px.rect(-7, -20, 14, 20, c[0]);
        Px.rect(-7, -20, 3, 20, shade(c[0], 0.2));
        Px.rect(4, -20, 3, 20, c[1]);
        Px.rect(-7, -15, 14, 2, c[1]); Px.rect(-7, -6, 14, 2, c[1]);
        Px.poly([-7, -21, 7, -21 - tilt, 7, -19 - tilt, -7, -19], shade(c[0], 0.3));
        Px.rect(1, -13, 1, 8, c[2]);
        break;
      }
      case 'fuel':
        Px.rect(-7, -20, 14, 20, blink ? '#ffffff' : c[0]);
        Px.rect(-7, -20, 3, 20, blink ? '#ffffff' : '#d24a3a');
        Px.rect(-7, -15, 14, 2, c[1]); Px.rect(-7, -6, 14, 2, c[1]);
        // flammable label: a leaning flame with a yellow core (a symmetric plus read as first aid)
        Px.rect(-4, -13, 8, 7, c[2]);
        Px.poly([1, -13, 3, -9, 2, -7, -2, -7, -3, -9, -1, -11, 0, -10], '#e2591e');
        Px.rect(-1, -9, 2, 2, '#ffe066');
        Px.rect(-7, -21, 14, 2, '#d24a3a');
        break;
      case 'fridge':
        Px.rect(-9, -30, 18, 30, c[0]);
        Px.rect(-9, -30, 18, 2, shade(c[0], 0.2));
        Px.rect(-9, -19, 18, 1, shade(c[0], -0.3));
        Px.rect(6, -27, 2, 6, c[2]); Px.rect(6, -16, 2, 8, c[2]);
        Px.rect(-6, -24, 3, 2, c[1]); Px.rect(-3, -8, 4, 3, c[1]); Px.rect(2, -28, 2, 2, c[1]);
        break;
      case 'trunk':
        Px.poly([-12, 0, -12, -10, -8, -14, 10, -14, 12, -8, 12, 0], c[0]);
        Px.rect(-10, -12, 20, 2, shade(c[0], 0.25));
        Px.rect(-2, -8, 4, 2, c[2]);
        Px.rect(-12, -3, 24, 3, c[1]);
        break;
      case 'trash':
        Px.rect(-6, -14, 12, 14, c[0]);
        for (let i = -4; i <= 4; i += 3) Px.rect(i, -13, 1, 12, c[1]);
        Px.rect(-7, -16, 14, 2, c[2]);
        Px.rect(-2, -18, 4, 2, c[1]);
        break;
    }
    Sprite.end(ctx, this.x - camX + ox + this.jitter, this.y, 1, { flash: this.flash > 1 ? '#ffffff' : null });
  }
}

// Burning oil barrel: a solid, unbreakable hazard. Touching the flame: 6 dmg + knockdown to anyone.
// A knocked-down enemy landing in it takes 10.
class BurningBarrel extends Ent {
  constructor(x, y) {
    super(x, y);
    this.team = 'hazard'; this.w = 7; this.h = 20; this.shadowR = 9;
    this.ticks = new Map();
    Game.solids.push({ x0: x - 7, x1: x + 7, y0: y - 4, y1: y + 4, h: 30, splat: true });
  }
  update() {
    this.t++;
    if (this.t % 3 === 0) FX.fire(this.x, this.y, 22, 1);
    if (this.t % 9 === 0) FX.embers(this.x, this.y, 24, 1);
    const victims = [Game.player, ...Game.foes()].filter(Boolean);
    for (const v of victims) {
      if (!v.vulnerable && !(v.state === 'fall' && v.team === 'enemy')) continue;
      if (Math.abs(v.y - this.y) > 6 || Math.abs(v.x - this.x) > 10 + v.w * 0.5) continue;
      const last = this.ticks.get(v.id) || -99;
      if (this.t - last < 30) continue;
      if (v.state === 'fall' && v.team === 'enemy' && v.z < 30) {
        this.ticks.set(v.id, this.t);
        v.hp = Math.max(0, v.hp - 10); v.burn = 40; v.flash = 2;
        FX.fire(v.x, v.y, 10, 4); Sound.sfx('fire', v.x);
        if (v.hp <= 0 && !v.dying) v.onDeath(Game.player, {}, 1);
        continue;
      }
      if (v.z > 28) continue;
      if (!v.vulnerable) continue;
      this.ticks.set(v.id, this.t);
      v.takeHit(v.team === 'player' ? this : Game.player, { dmg: 6, tier: 2, knock: true, kx: 2.0, kz: 2.8, burn: 40, zr: [0, 40], sfx: 'fire' }, v.x < this.x ? -1 : 1);
    }
  }
  draw(ctx, camX) {
    Sprite.begin(40, 56, 20, 50);
    Px.rect(-7, -20, 14, 20, '#4a3a30');
    Px.rect(-7, -20, 3, 20, '#5e4a3a');
    Px.rect(-7, -15, 14, 2, '#2a2020'); Px.rect(-7, -6, 14, 2, '#2a2020');
    Px.rect(-7, -21, 14, 2, '#2a2020');
    for (let i = -2; i <= 2; i++) {
      const h = 7 + Math.sin(Game.frame * 0.35 + i * 1.9) * 3 + (2 - Math.abs(i)) * 3;
      Px.poly([i * 3 - 3, -21, i * 3, -21 - h, i * 3 + 3, -21], (Game.frame >> 2) % 3 === Math.abs(i) % 3 ? '#ffd34a' : i % 2 ? '#ff8a2a' : '#e83b1e');
    }
    Sprite.end(ctx, this.x - camX, this.y, 1, {});
    // glow
    ctx.globalAlpha = 0.12 + 0.05 * Math.sin(Game.frame * 0.3);
    Px.use(ctx); Px.disc(this.x - camX, this.y - 30, 18, '#ff8a2a');
    ctx.globalAlpha = 1;
  }
}

// Pickups.
const ITEM_DEFS = {
  cactus:  { heal: 15, label: '+HP', food: true },
  beans:   { heal: 30, label: '+HP', food: true },
  rat:     { heal: 50, label: '+HP', food: true },
  water:   { heal: 999, label: 'FULL HP', food: true, cleanse: true },
  cap:     { score: 500, label: '500' },
  pouch:   { score: 1500, label: '1500' },
  watch:   { score: 3000, label: '3000' },
  dogtag:  { life: 1, label: '1UP' },
  pipe:    { weapon: 'pipe', label: 'LEAD PIPE' },
  machete: { weapon: 'machete', label: 'MACHETE' },
  axe:     { weapon: 'axe', label: 'STOP-SIGN AXE' },
  molotov: { weapon: 'molotov', label: 'MOLOTOV' },
};
class Item extends Ent {
  constructor(kind, x, y, pop = 0) {
    super(x, y);
    this.kind = kind;
    this.team = 'item';
    this.vz = pop; this.z = pop ? 1 : 0;
    this.vx = pop ? rr(-0.6, 0.6) : 0;
    this.w = 8; this.h = 8;
    this.shadowR = 5;
    const d = ITEM_DEFS[kind];
    this.life = d.food || d.life ? Infinity : d.score ? 600 : 60 * 60;
  }
  update(bounds) {
    this.t++;
    if (this.z > 0 || this.vz) {
      this.z += this.vz; this.vz -= 0.3; this.x += this.vx;
      if (this.z <= 0) { this.z = 0; this.vz = Math.abs(this.vz) > 1.2 ? -this.vz * 0.4 : 0; this.vx *= 0.5; if (!this.vz) this.vx = 0; }
    }
    this.y = clamp(this.y, bounds.yMin, bounds.yMax);
    if (--this.life <= 0) this.remove = true;
  }
  collect(pl) {
    const d = ITEM_DEFS[this.kind];
    this.remove = true;
    if (d.heal) { pl.hp = Math.min(pl.maxHp, pl.hp + d.heal); pl.grey = Math.min(pl.grey, pl.maxHp - pl.hp); if (d.cleanse) { pl.grey = 0; pl.venom = 0; pl.burn = 0; } Sound.sfx('food'); }
    if (d.weapon) { pl.giveWeapon(d.weapon); if (this.uses) pl.weapon.uses = this.uses; Sound.sfx('weapon'); }
    if (d.score) { Game.addScore(d.score); Sound.sfx('pickup'); }
    if (d.life) { Game.lives++; Sound.sfx('oneUp'); }
    FX.text(this.x, this.y, 20, d.label, d.heal ? '#7be04a' : d.life ? '#7be04a' : '#ffe066', 50);
  }
  draw(ctx, camX) {
    if (this.life < 120 && (this.life >> 2) % 2) return;
    const sx = this.x - camX, sy = this.y - this.z;
    const bob = this.z === 0 ? Math.round(Math.sin(Game.frame * 0.1 + this.id) * 1) : 0;
    Sprite.begin(48, 40, 24, 34);
    drawItemIcon(this.kind, 0, 0, this.t);
    Sprite.end(ctx, sx, sy + bob, 1, {});
    if (ITEM_DEFS[this.kind].weapon && this.t % 40 < 3) { Px.use(ctx); Px.rect(sx + 4, sy - 6 + bob, 3, 1, '#fff'); Px.rect(sx + 5, sy - 7 + bob, 1, 3, '#fff'); }
  }
}
function drawItemIcon(kind, x, y, t = 0) {
  switch (kind) {
    case 'cactus':
      Px.oval(x, y - 3, 3.5, 3, '#e85c9a'); Px.dot(x - 1, y - 4, '#6a9a3a'); Px.dot(x + 1, y - 2, '#6a9a3a'); Px.dot(x + 2, y - 4, '#6a9a3a');
      Px.rect(x - 1, y - 7, 2, 1, '#6a9a3a');
      break;
    case 'beans':
      Px.rect(x - 3, y - 8, 6, 8, '#b0b6bc'); Px.rect(x - 3, y - 6, 6, 3, '#d94b2b'); Px.oval(x, y - 8, 3, 1, '#e0e6ea');
      break;
    case 'rat':
      Px.line(x - 10, y - 2, x + 8, y - 8, 1, '#c9a86a');
      Px.oval(x, y - 5, 5, 3, '#8a4a22'); Px.oval(x - 1, y - 6, 3, 1, '#c98e64');
      Px.line(x + 5, y - 5, x + 9, y - 2, 1, '#c98e64');
      break;
    case 'water':
      Px.poly([x - 4, y, x - 4, y - 7, x - 2, y - 10, x + 2, y - 10, x + 4, y - 7, x + 4, y], '#2e7fd8');
      Px.rect(x - 3, y - 7, 1, 5, '#8ec8ff');
      Px.rect(x - 2, y - 12, 4, 2, '#f2eee0');
      if (t % 30 < 4) Px.dot(x + 2, y - 8, '#ffffff');
      break;
    case 'cap':
      Px.poly([x, y - 7, x + 1, y - 5, x + 3, y - 5, x + 2, y - 3, x + 3, y - 1, x + 1, y - 1, x, y + 1, x - 1, y - 1, x - 3, y - 1, x - 2, y - 3, x - 3, y - 5, x - 1, y - 5], '#e8c547');
      Px.dot(x, y - 3, '#b8322a');
      break;
    case 'pouch':
      Px.oval(x, y - 4, 5, 4, '#8a6a3a'); Px.rect(x - 2, y - 9, 4, 2, '#8a6a3a'); Px.rect(x - 3, y - 7, 6, 1, '#c9a86a');
      break;
    case 'watch':
      Px.rect(x - 1, y - 10, 2, 10, '#5a3a1a'); Px.disc(x, y - 5, 3.5, '#d4af37'); Px.disc(x, y - 5, 2, '#f2eee0'); Px.dot(x, y - 6, '#1a1a1a');
      break;
    case 'dogtag':
      for (let i = 0; i < 5; i++) Px.dot(x - 4 + i, y - 12 + Math.abs(2 - i), '#9aa0a8');
      Px.rect(x - 4, y - 9, 4, 6, '#c8ccd0'); Px.rect(x + 1, y - 8, 4, 6, '#c8ccd0');
      Px.rect(x - 3, y - 7, 2, 1, '#6e7178'); Px.rect(x + 2, y - 6, 2, 1, '#6e7178');
      break;
    case 'pipe':
      Px.line(x - 11, y - 2, x + 11, y - 4, 3, '#8a929c'); Px.rect(x - 1, y - 5, 3, 4, '#5e666e');
      break;
    case 'machete':
      Px.rect(x - 10, y - 3, 5, 3, '#3a2a1a');
      Px.poly([x - 5, y - 4, x + 10, y - 5, x + 12, y - 2, x - 5, y - 1], '#d8dce0');
      break;
    case 'axe':
      Px.line(x - 12, y - 2, x + 6, y - 2, 2, '#8a8a8a'); Px.disc(x + 10, y - 4, 7, '#f2eee0'); Px.disc(x + 10, y - 4, 6, '#c8322a');
      break;
    case 'molotov':
      Px.use(Sprite.cur.ga); Sprite.cur.ga.globalAlpha = 0.85;
      Px.rect(x - 2, y - 8, 4, 8, '#6a8a3a'); Px.rect(x - 1, y - 11, 2, 3, '#6a8a3a');
      Sprite.cur.ga.globalAlpha = 1;
      Px.rect(x - 1, y - 12, 2, 2, '#e8e0d0');
      Px.disc(x, y - 14, 1.5, (t >> 2) % 2 ? '#ffb030' : '#ffe066');
      break;
  }
}

// Projectiles. friendly: hits enemies (thrown by the player); otherwise hits the player.
// opts: { kind, vx, vz, dmg, tier, owner, gravity, knock, life, friendly, pierce, burn, venom, target }
class Proj extends Ent {
  constructor(x, y, z, o) {
    super(x, y);
    Object.assign(this, { kind: 'rock', dmg: 8, tier: 1, gravity: 0.2, knock: false, life: 180, friendly: false, pierce: 0 }, o);
    this.z = z;
    this.team = 'proj';
    this.shadowR = 4;
    this.w = 5; this.h = 8;
    this.hitIds = new Set();
  }
  update(bounds) {
    this.t++;
    this.x += this.vx; this.y += this.vy || 0; this.z += this.vz; this.vz -= this.gravity;
    if (this.kind === 'molotov' && this.t % 3 === 0) FX.fire(this.x, this.y, this.z + 4, 1);
    if (this.kind === 'glob' && this.t % 2 === 0) FX.add({ kind: 'drop', x: this.x, y: this.y, z: this.z, life: 10, color: this.color || '#7cff4f', g: 0 });
    const a = { dmg: this.dmg, tier: this.tier, knock: this.knock, kx: 2.4, kz: 3, kb: 1.4, stun: 18, burn: this.burn, venom: this.venom, sfx: this.hitSfx, zr: [0, 60] };
    if (this.friendly) {
      for (const e of Game.ents) {
        if ((e.team !== 'enemy' && e.team !== 'prop') || !e.vulnerable || this.hitIds.has(e.id)) continue;
        if (Math.abs(e.y - this.y) < 9 && Math.abs(e.x - this.x) < e.w + this.w && this.z < e.z + e.h + 4 && this.z + this.h > e.z) {
          this.hitIds.add(e.id);
          e.takeHit(this.owner || Game.player, a, sign(this.vx) || 1);
          if (this.kind === 'molotov') { this.burst(); return; }
          if (this.pierce-- <= 0) { this.onImpact(); this.remove = true; return; }
        }
      }
    } else {
      const p = Game.player;
      if (p && p.vulnerable && Math.abs(p.y - this.y) < (this.depth || 8) && Math.abs(p.x - this.x) < p.w + this.w && this.z < p.z + p.h && this.z + this.h > p.z) {
        p.takeHit(this, a, sign(this.vx) || (p.x > this.x ? 1 : -1));
        if (this.kind === 'molotov') { this.burst(); return; }
        this.onImpact();
        this.remove = true;
        return;
      }
    }
    if (this.z <= 0) { this.z = 0; if (this.kind === 'molotov') { this.burst(); return; } this.onImpact(); this.remove = true; return; }
    if (--this.life <= 0 || this.x < Game.cam.x - 60 || this.x > Game.cam.x + W + 60) {
      if (this.kind.startsWith('thrown_')) this.onImpact();
      this.remove = true;
    }
  }
  burst() {
    this.remove = true;
    Sound.sfx('glass', this.x);
    Sound.sfx('fire', this.x);
    Game.add(new FirePatch(this.x, this.y, 90, 'both', 6, this.owner));
  }
  onImpact() {
    if (this.kind === 'glob') {
      FX.splat(this.x, this.y, Math.max(2, this.z), this.color || '#7cff4f', 6, sign(this.vx));
      if (this.puddle) Game.add(new AcidPool(this.x, this.y, this.puddle, this.color));
    } else if (this.kind.startsWith('thrown_')) {
      FX.shards(this.x, this.y, Math.max(4, this.z), 4, ['#8a8f96', '#5e6168']);
    } else if (this.kind === 'lid') {
      FX.dust(this.x, this.y, 2, 0.5);
    } else {
      FX.debris(this.x, this.y, Math.max(1, this.z), ['#6b5a48', '#8a7660'], 4);
    }
  }
  draw(ctx, camX) {
    Px.use(ctx);
    const sx = Math.round(this.x - camX), sy = Math.round(this.y - this.z);
    const a = this.t * 0.45;
    switch (this.kind) {
      case 'molotov':
        Px.line(sx - Math.cos(a) * 3, sy - 4 - Math.sin(a) * 3, sx + Math.cos(a) * 3, sy - 4 + Math.sin(a) * 3, 2, '#4a7a3a');
        Px.disc(sx + Math.cos(a) * 3, sy - 4 + Math.sin(a) * 3, 1.5, '#ffb030');
        break;
      case 'glob':
        Px.disc(sx, sy - 3, 3, this.color || '#7cff4f'); Px.dot(sx - 1, sy - 4, '#e2ffb0');
        break;
      case 'lid':
        Px.oval(sx, sy - 3, 6, 2 + Math.abs(Math.sin(a)) * 3, '#9aa0a8');
        break;
      case 'thrown_pipe':
        Px.line(sx - Math.cos(a) * 9, sy - 6 - Math.sin(a) * 9, sx + Math.cos(a) * 9, sy - 6 + Math.sin(a) * 9, 2, '#8a8f96');
        break;
      case 'thrown_axe':
        Px.line(sx - Math.cos(a) * 9, sy - 6 - Math.sin(a) * 9, sx + Math.cos(a) * 9, sy - 6 + Math.sin(a) * 9, 2, '#8a8f96');
        Px.disc(sx + Math.cos(a) * 10, sy - 6 + Math.sin(a) * 10, 5, '#c8282e');
        break;
      case 'thrown_machete':
        Px.line(sx - Math.cos(a) * 3, sy - 6 - Math.sin(a) * 3, sx + Math.cos(a) * 3, sy - 6 + Math.sin(a) * 3, 3, '#3a2a1a');
        Px.line(sx + Math.cos(a) * 3, sy - 6 + Math.sin(a) * 3, sx + Math.cos(a) * 11, sy - 6 + Math.sin(a) * 11, 3, '#d8dce0');
        break;
      case 'knife':
        Px.line(sx - Math.cos(a) * 4, sy - 4 - Math.sin(a) * 4, sx + Math.cos(a) * 4, sy - 4 + Math.sin(a) * 4, 1, '#e8ecef');
        break;
      default:
        Px.disc(sx, sy - 3, 3, '#6b5a48'); Px.dot(sx - 1, sy - 4, '#8a7660');
    }
  }
}

// Burning ground. hurts: 'player' | 'enemy' | 'both'. Damage ticks every 15f per victim.
class FirePatch extends Ent {
  constructor(x, y, life = 90, hurts = 'both', dmg = 6, owner = null, w = 20) {
    super(x, y);
    this.team = 'hazard';
    this.life = life; this.w = w; this.hurts = hurts; this.dmg = dmg; this.owner = owner;
    this.shadowR = 0;
    this.ticks = new Map();
  }
  update() {
    this.t++;
    if (this.t % 2 === 0) FX.fire(this.x + rr(-this.w, this.w), this.y + rr(-2, 2), 0, 1);
    if (this.t % 20 === 0) Sound.sfx('fire', this.x);
    const victims = [];
    if (this.hurts !== 'enemy' && Game.player) victims.push(Game.player);
    if (this.hurts !== 'player') victims.push(...Game.foes());
    for (const v of victims) {
      if (!v.vulnerable || v.z > 6 || Math.abs(v.y - this.y) > 6 || Math.abs(v.x - this.x) > this.w + v.w) continue;
      const last = this.ticks.get(v.id) || -99;
      if (this.t - last < 30) continue;
      this.ticks.set(v.id, this.t);
      v.takeHit(v.team === 'player' ? this : (this.owner || Game.player), { dmg: this.dmg, tier: 2, stun: 16, kb: 0.8, burn: 40, zr: [0, 20], sfx: 'fire' }, v.x < this.x ? -1 : 1);
      if (v.team === 'enemy' && v.family === 'gang' && v.setPanic) v.setPanic(60);
    }
    if (this.t > this.life) this.remove = true;
  }
  sortY() { return this.y - 12; }
  draw(ctx, camX) {
    Px.use(ctx);
    const sx = this.x - camX;
    const fade = Math.min(1, (this.life - this.t) / 20);
    ctx.globalAlpha = 0.45 * fade;
    Px.oval(sx, this.y, this.w + 2, 3, '#e2541b');
    ctx.globalAlpha = fade;
    const n = Math.max(2, Math.round(this.w / 6));
    for (let i = -n; i <= n; i++) {
      const fx = sx + i * (this.w / n);
      const h = 5 + Math.sin(Game.frame * 0.3 + i * 1.7) * 3;
      Px.poly([fx - 3, this.y, fx, this.y - h - 3, fx + 3, this.y], i % 2 ? '#ff8a1e' : '#e83b1e');
      Px.poly([fx - 1, this.y, fx, this.y - h * 0.5 - 1, fx + 1, this.y], '#ffe066');
    }
    ctx.globalAlpha = 1;
  }
}

// Acid puddle from spit globs.
class AcidPool extends Ent {
  constructor(x, y, life, color = '#7cff4f', hurts = 'player', dmg = 4) {
    super(x, y);
    this.team = 'hazard'; this.life = life; this.color = color; this.w = 12; this.hurts = hurts; this.dmg = dmg;
    this.shadowR = 0; this.ticks = new Map();
  }
  update() {
    this.t++;
    const victims = [];
    if (this.hurts !== 'enemy' && Game.player) victims.push(Game.player);
    if (this.hurts === 'both') victims.push(...Game.foes());
    for (const v of victims) {
      if (!v.vulnerable || v.z > 3 || Math.abs(v.y - this.y) > 4 || Math.abs(v.x - this.x) > this.w + v.w * 0.5) continue;
      const last = this.ticks.get(v.id) || -99;
      if (this.t - last < 20) continue;
      this.ticks.set(v.id, this.t);
      if (v.team === 'player' && v.chip) { v.chip(this.dmg); }
      else { v.hp = Math.max(0, v.hp - this.dmg); v.flash = 2; }
      FX.add({ kind: 'bubble', x: v.x, y: v.y, z: 4, vz: 0.6, g: 0, life: 20, color: this.color });
      Sound.sfx('hiss', v.x);
      if (v.hp <= 0) { if (v.team === 'player') { if (v.state !== 'fall' && v.state !== 'down') v.knockDown(1, 1, 2); } else if (!v.dying) { v.onDeath(Game.player, {}, 1); v.knockDown(1, 1, 2); } }
    }
    if (this.t % 12 === 0) FX.add({ kind: 'bubble', x: this.x + rr(-this.w, this.w), y: this.y, z: 0, vz: 0.3, g: 0, life: 16, color: this.color });
    if (this.t > this.life) this.remove = true;
  }
  sortY() { return this.y - 30; }
  draw(ctx, camX) {
    Px.use(ctx);
    const a = Math.min(1, (this.life - this.t) / 30) * 0.6;
    ctx.globalAlpha = a;
    Px.oval(this.x - camX, this.y, this.w, 4, this.color);
    ctx.globalAlpha = 1;
  }
}
