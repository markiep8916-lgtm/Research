// World objects: breakable props, pickups, projectiles and ground hazards.

// Breakables: crate | drum (oil drum) | trash | fuel (red barrel, explodes) | cactus
const PROP_DEFS = {
  crate:  { hp: 2, w: 9, h: 16, cols: ['#9a6b3c', '#6e4a28', '#b8854a'], sfx: 'crate' },
  drum:   { hp: 3, w: 7, h: 20, cols: ['#8a4b2a', '#5a2e18', '#a8643a'], sfx: 'hitMetal' },
  trash:  { hp: 1, w: 6, h: 16, cols: ['#6e7178', '#4a4d52', '#9aa0a8'], sfx: 'hitMetal' },
  fuel:   { hp: 1, w: 7, h: 20, cols: ['#b5322b', '#7a1e18', '#e8e0d0'], sfx: 'hitMetal' },
  cactus: { hp: 2, w: 6, h: 26, cols: ['#4a6a3a', '#2f4a26', '#6a8a4a'], sfx: 'hitShell' },
};
class Breakable extends Ent {
  constructor(kind, x, y, drop) {
    super(x, y);
    const d = PROP_DEFS[kind];
    this.kind = kind; this.drop = drop; this.def = d;
    this.team = 'prop';
    this.hp = d.hp;
    this.w = d.w; this.h = d.h;
    this.shadowR = d.w + 2;
    this.wob = 0;
    this.fuse = 0;
    this.rolling = 0;
    this.dent = 0;
  }
  get vulnerable() { return !this.remove && this.fuse === 0; }
  takeHit(src, a, dir) {
    this.wob = 8; this.flash = 3;
    Sound.sfx(this.def.sfx, this.x);
    this.hs = 3; this.hitJitter = true;
    FX.hit(this.x - dir * 4, this.y, 10, 1, dir, '#ffffff');
    if (src && src.onLanded && src.team === 'player') { src.comboHits++; src.comboT = 60; }
    if (this.kind === 'fuel') {
      if ((a.tier || 1) >= 3 && !a.radial) { this.rolling = dir * 3; this.fuse = 1; this.roller = src; }
      else this.fuse = 1;
      this.igniter = src;
      return;
    }
    this.hp -= (a.tier || 1) >= 2 ? 2 : 1;
    this.dent++;
    if (this.hp <= 0) this.smash(src);
  }
  smash(src) {
    if (this.remove) return;
    this.remove = true;
    FX.debris(this.x, this.y, 8, this.def.cols, 14, [1, 3]);
    Sound.sfx('crate', this.x);
    Game.addScore(100);
    if (this.kind === 'drum') FX.pool(this.x, this.y + 1, '#15121a', 20);
    if (this.kind === 'trash') Game.add(new Proj(this.x, this.y, 14, { kind: 'lid', vx: ((src && src.facing) || 1) * 3, vz: 2, gravity: 0.2, dmg: 8, tier: 2, friendly: true, owner: src }));
    if (this.drop) {
      const it = Game.add(new Item(this.drop, this.x, this.y + 1, 2.5));
      it.vx = rr(-0.4, 0.4);
    }
  }
  update(bounds) {
    if (this.wob > 0) this.wob--;
    if (this.flash > 0) this.flash--;
    if (this.hs > 0) { this.hs--; return; }
    if (this.fuse > 0) {
      this.fuse++;
      if (this.fuse % 6 === 0) Sound.sfx('beep', this.x);
      if (this.rolling) {
        this.x += this.rolling;
        if (this.x < bounds.xMin || this.x > bounds.xMax) this.rolling = 0;
        for (const e of Game.foes()) {
          if (e.alive && Math.abs(e.y - this.y) < 8 && Math.abs(e.x - this.x) < e.w + this.w) { this.fuse = 31; break; }
        }
      }
      if (this.fuse > 30) { this.remove = true; Game.explode(this.x, this.y, this.igniter || Game.player, { r: 40, dmg: 24, pdmg: 24 }); }
    }
  }
  draw(ctx, camX) {
    const ox = this.wob ? (this.wob % 2 ? 1 : -1) : 0;
    const blink = this.fuse > 0 && (this.fuse >> 1) % 2;
    Sprite.begin(40, 40, 20, 36);
    const c = this.def.cols;
    switch (this.kind) {
      case 'crate':
        Px.rect(-9, -16, 18, 16, c[0]);
        Px.rect(-9, -16, 18, 2, c[2]);
        Px.rect(-9, -9, 18, 1, c[1]);
        Px.line(-7, -2, 7, -14, 2, c[1]);
        Px.rect(-9, -16, 2, 16, c[1]); Px.rect(7, -16, 2, 16, c[1]);
        Px.dot(-8, -15, '#c9ced6'); Px.dot(7, -15, '#c9ced6'); Px.dot(-8, -2, '#c9ced6'); Px.dot(7, -2, '#c9ced6');
        break;
      case 'drum':
        Px.rect(-7, -20, 14, 20, c[0]);
        Px.rect(-7, -20, 3, 20, c[2]);
        Px.rect(4, -20, 3, 20, c[1]);
        Px.rect(-7, -15, 14, 2, c[1]); Px.rect(-7, -6, 14, 2, c[1]);
        Px.rect(-7, -21, 14, 2, c[2]);
        if (this.dent) Px.poly([7, -14, 3, -11, 7, -8], c[1]);
        break;
      case 'trash':
        Px.rect(-6, -14, 12, 14, c[0]);
        for (let i = -4; i <= 4; i += 3) Px.rect(i, -13, 1, 12, c[1]);
        Px.rect(-7, -16, 14, 2, c[2]);
        Px.rect(-2, -18, 4, 2, c[1]);
        break;
      case 'fuel':
        Px.rect(-7, -20, 14, 20, blink ? '#ffffff' : c[0]);
        Px.rect(-7, -20, 3, 20, blink ? '#ffffff' : '#d24a3a');
        Px.rect(-7, -13, 14, 3, c[2]);
        Px.poly([0, -9, 3, -4, -3, -4], '#e8c547');
        Px.dot(0, -6, '#1a1a1a');
        Px.rect(-7, -21, 14, 2, '#d24a3a');
        break;
      case 'cactus':
        Px.rect(-3, -26, 6, 26, c[0]);
        Px.rect(-9, -18, 6, 3, c[0]); Px.rect(-9, -24, 3, 7, c[0]);
        Px.rect(3, -14, 6, 3, c[0]); Px.rect(6, -20, 3, 7, c[0]);
        Px.rect(-1, -25, 1, 24, c[2]);
        break;
    }
    Sprite.end(ctx, this.x - camX + ox + this.jitter, this.y, 1, { flash: this.flash > 1 ? '#ffffff' : null });
  }
}

// Pickups.
const ITEM_DEFS = {
  beans:  { heal: 25, label: '+HP' },
  rat:    { heal: 50, label: '+HP' },
  water:  { heal: 999, label: 'FULL HP' },
  caps:   { score: 200, label: '200' },
  cola:   { score: 1000, label: '1000' },
  watch:  { score: 3000, label: '3000' },
  dogtag: { life: 1, label: '1UP' },
  pipe:   { weapon: 'pipe', label: 'PIPE' },
  sign:   { weapon: 'sign', label: 'STOP SIGN' },
  spear:  { weapon: 'spear', label: 'STINGER' },
  bottle: { weapon: 'bottle', label: 'FIRE BOTTLE' },
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
    this.life = ITEM_DEFS[kind].weapon ? 60 * 30 : 60 * 40;
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
    if (d.heal) { pl.hp = Math.min(pl.maxHp, pl.hp + d.heal); pl.grey = Math.min(pl.grey, pl.maxHp - pl.hp); Sound.sfx('food'); }
    if (d.weapon) { pl.giveWeapon(d.weapon); if (this.uses) pl.weapon.uses = this.uses; Sound.sfx('weapon'); }
    if (d.score) { Game.addScore(d.score); Sound.sfx('pickup'); }
    if (d.life) { Game.lives++; Sound.sfx('oneUp'); }
    FX.text(this.x, this.y, 20, d.label, d.heal ? '#59e04a' : d.life ? '#7fe07a' : '#ffe066', 50);
  }
  draw(ctx, camX) {
    if (this.life < 90 && (this.life >> 2) % 2) return;
    const sx = this.x - camX, sy = this.y - this.z;
    const bob = this.z === 0 ? Math.round(Math.sin(Game.frame * 0.1 + this.id) * 1) : 0;
    Sprite.begin(48, 40, 24, 34);
    drawItemIcon(this.kind, 0, 0, this.t);
    Sprite.end(ctx, sx, sy + bob, 1, {});
  }
}
function drawItemIcon(kind, x, y, t = 0) {
  switch (kind) {
    case 'beans':
      Px.rect(x - 3, y - 8, 6, 8, '#b0b0b0'); Px.rect(x - 3, y - 6, 6, 3, '#d94a2b'); Px.rect(x - 3, y - 9, 6, 1, '#e0e6ea');
      break;
    case 'rat':
      Px.line(x - 10, y - 2, x + 8, y - 8, 1, '#8a6a3a');
      Px.oval(x, y - 5, 6, 3, '#7a4a2a'); Px.oval(x - 1, y - 6, 3, 1, '#c98e64');
      Px.line(x + 5, y - 6, x + 9, y - 4, 1, '#c98e64');
      break;
    case 'water': {
      Px.poly([x - 5, y, x - 5, y - 9, x - 2, y - 12, x + 2, y - 12, x + 5, y - 9, x + 5, y], '#3fa9f5');
      Px.rect(x - 3, y - 9, 2, 6, '#bde6ff');
      Px.rect(x - 2, y - 14, 4, 2, '#1a1a1a');
      if (t % 30 < 4) Px.dot(x + 3, y - 10, '#ffffff');
      break;
    }
    case 'caps':
      for (let i = 0; i < 3; i++) { Px.disc(x - 4 + i * 4, y - 2 - (i % 2) * 2, 2, '#d9c25a'); Px.dot(x - 4 + i * 4, y - 2 - (i % 2) * 2, '#8a7a2a'); }
      break;
    case 'cola':
      Px.rect(x - 2, y - 7, 4, 7, '#c8282e'); Px.line(x - 2, y - 3, x + 2, y - 5, 1, '#ffffff'); Px.rect(x - 2, y - 8, 4, 1, '#c9ced6');
      break;
    case 'watch':
      Px.rect(x - 1, y - 10, 2, 10, '#5a3a2a'); Px.disc(x, y - 5, 3.5, '#e8c547'); Px.disc(x, y - 5, 2, '#f2eee0'); Px.dot(x, y - 6, '#1a1a1a');
      break;
    case 'dogtag':
      Px.line(x - 4, y - 12, x, y - 8, 1, '#9aa0a8'); Px.line(x + 4, y - 12, x, y - 8, 1, '#9aa0a8');
      Px.rect(x - 2, y - 8, 5, 7, '#c9ced6'); Px.rect(x - 1, y - 6, 3, 1, '#6e7178'); Px.rect(x - 1, y - 4, 3, 1, '#6e7178');
      break;
    case 'pipe':
      Px.line(x - 11, y - 2, x + 11, y - 4, 2, '#8a8f96'); Px.rect(x + 10, y - 6, 3, 4, '#5e6168'); Px.rect(x - 13, y - 4, 3, 4, '#5e6168');
      break;
    case 'sign':
      Px.line(x - 12, y - 2, x + 6, y - 2, 2, '#8a8f96'); Px.disc(x + 10, y - 4, 6, '#ffffff'); Px.disc(x + 10, y - 4, 5, '#c8282e');
      break;
    case 'spear':
      for (let i = 0; i < 4; i++) Px.disc(x - 10 + i * 5, y - 3, 2, '#9a3f1e');
      Px.poly([x + 8, y - 6, x + 15, y - 3, x + 8, y], '#f2e9c9');
      break;
    case 'bottle':
      Px.rect(x - 2, y - 8, 4, 8, '#4a7a3a'); Px.rect(x - 1, y - 11, 2, 3, '#4a7a3a'); Px.disc(x, y - 12, 1.5, (t >> 2) % 2 ? '#ffb030' : '#ffe066');
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
    Game.add(new FirePatch(this.x, this.y, 90, this.friendly ? 'enemy' : 'both', this.friendly ? 5 : 4, this.owner));
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
      case 'thrown_sign':
        Px.line(sx - Math.cos(a) * 9, sy - 6 - Math.sin(a) * 9, sx + Math.cos(a) * 9, sy - 6 + Math.sin(a) * 9, 2, '#8a8f96');
        Px.disc(sx + Math.cos(a) * 10, sy - 6 + Math.sin(a) * 10, 5, '#c8282e');
        break;
      case 'thrown_spear':
        Px.line(sx - Math.cos(a) * 10, sy - 6 - Math.sin(a) * 10, sx + Math.cos(a) * 10, sy - 6 + Math.sin(a) * 10, 3, '#9a3f1e');
        Px.disc(sx + Math.cos(a) * 11, sy - 6 + Math.sin(a) * 11, 2, '#f2e9c9');
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
  constructor(x, y, life, hurts = 'both', dmg = 4, owner = null, w = 16) {
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
      if (this.t - last < 15) continue;
      this.ticks.set(v.id, this.t);
      v.takeHit(v.team === 'player' ? this : (this.owner || Game.player), { dmg: this.dmg, tier: 1, stun: 12, kb: 0.6, burn: 40, zr: [0, 20], sfx: 'fire' }, v.x < this.x ? -1 : 1);
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
      v.hp = Math.max(v.team === 'player' ? 0 : 0, v.hp - this.dmg);
      v.flash = 2;
      FX.add({ kind: 'bubble', x: v.x, y: v.y, z: 4, vz: 0.6, g: 0, life: 20, color: this.color });
      Sound.sfx('hiss', v.x);
      if (v.hp <= 0) { if (v.team === 'player') v.knockDown(1, 1, 2); else if (!v.dying) { v.onDeath(Game.player, {}, 1); v.knockDown(1, 1, 2); } }
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
