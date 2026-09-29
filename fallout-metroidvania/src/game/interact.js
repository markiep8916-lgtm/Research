// Interactables and props: lights, beds, terminals, vending machines, containers, doors, elevators, triggers, NPCs, hazards.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const G = (CD.G = CD.G || {});
const S = CD.spawners;
const rgb = U.rgb;
const cellX = (s) => (s.tx + 0.5) * T, cellB = (s) => (s.ty + 1) * T;

function metalRect(g, x, y, w, h, base, vertical) {
  const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, rgb(U.shade(base, 1.45))); gr.addColorStop(0.45, rgb(base)); gr.addColorStop(1, rgb(U.shade(base, 0.4)));
  g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y + h - 0.6, w, 0.6);
}

// ------------------------------------------------------------------ lights
class LightProp extends CD.Entity {
  constructor(s, kind) {
    super(cellX(s) - 24, s.ty * T, 48, T); this.kind = 'prop'; this.lk = kind; this.z = 1; this.seed = (s.tx * 7 + s.ty * 13) % 100; this.dead = false; this.s = s; this.always = false;
    const reg = CD.REGIONS[(G.world.rooms[s.room] || {}).region] || CD.REGIONS.vault;
    this.reg = reg; this.on = s.off ? false : true; this.flick = s.flick !== undefined ? s.flick : (U.hash2(s.tx, s.ty, 5) < 0.28 ? 1 : 0);
    this.col = s.color || (kind === 'fluoro' ? reg.fluoro.color : [1, 0.72, 0.42]); this.r = s.r || (kind === 'fluoro' ? reg.fluoro.r : 260); this.i = s.i || (kind === 'fluoro' ? reg.fluoro.i : 1.0);
    this.fl = reg.fluoro.flicker;
    this.sparkT = 2 + Math.random() * 6;
  }
  update(dt) {
    this.t += dt; if (this.lk === 'fluoro' && this.flick && !this.on) { /* dead */ }
    this.sparkT -= dt; if (this.sparkT <= 0 && this.flick) { this.sparkT = 3 + Math.random() * 7; if (this.awake) { G.fx.spark(this.cx, this.y + 8, 5, 0, 1, 1.4, 160, '255,240,200'); CD.audio.play('zap'); } }
  }
  level() {
    if (!this.on) return 0;
    if (this.flick) { const n = U.vnoise(G.time * 11 + this.seed, this.seed, 2); const burst = Math.sin(G.time * 2.3 + this.seed) > 0.75 ? (Math.random() < 0.5 ? 0.15 : 1) : 1; return (n > 0.32 ? 1 : 0.18) * burst; }
    return 1;
  }
  draw(ctx) {
    const x = this.cx, y = this.y, lv = this.level();
    if (this.lk === 'fluoro') {
      metalRect(ctx, x - 25, y, 50, 7, [70, 76, 82]); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 25, y, 50, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 24, y + 7, 2, 4); ctx.fillRect(x + 22, y + 7, 2, 4);
      const c = this.col; ctx.fillStyle = lv > 0.5 ? 'rgb(' + (200 + c[0] * 55 | 0) + ',' + (220 + c[1] * 35 | 0) + ',' + (220 + c[2] * 35 | 0) + ')' : '#3a4548'; ctx.fillRect(x - 21, y + 7, 42, 4);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * lv) + ')'; ctx.fillRect(x - 21, y + 7, 42, 1.5);
    } else if (this.lk === 'lamp') {
      const sway = Math.sin(G.time * 1.3 + this.seed) * 2; ctx.strokeStyle = '#1a1614'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sway * 0.2, y + 16); ctx.stroke();
      metalRect(ctx, x - 7 + sway * 0.2, y + 14, 14, 6, [50, 54, 52]); const gr = ctx.createRadialGradient(x + sway * 0.2, y + 24, 0, x + sway * 0.2, y + 24, 8); gr.addColorStop(0, 'rgba(255,240,190,' + lv + ')'); gr.addColorStop(1, 'rgba(255,170,80,' + lv * 0.5 + ')'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x + sway * 0.2, y + 24, 6, 0, 7); ctx.fill();
    }
  }
  light(L) {
    const lv = this.level(); if (lv <= 0.01) return;
    const yy = this.lk === 'fluoro' ? this.y + 14 : this.y + 26;
    L.add({ x: this.cx, y: yy, r: this.r, color: this.col, i: this.i * lv, shadow: true, glow: this.lk === 'fluoro' ? 56 : 44, glowA: 0.55 * lv, seed: this.seed });
  }
}
class WallLamp extends LightProp {
  constructor(s) { super(s, 'wall'); const w = G.world; this.side = w.isSolid(s.tx - 1, s.ty) ? -1 : (w.isSolid(s.tx + 1, s.ty) ? 1 : (s.side || -1)); this.x = this.side < 0 ? s.tx * T : (s.tx + 1) * T - 14; this.y = s.ty * T + 8; this.w = 14; this.h = 26; this.col = s.color || this.reg.fluoro.color; this.r = s.r || 300; this.i = s.i || this.reg.fluoro.i * 0.9; }
  draw(ctx) {
    const lv = this.level(), x = this.x, y = this.y, sd = this.side; ctx.save();
    metalRect(ctx, x, y + 4, 14, 18, [60, 66, 72]); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y + 4, 14, 1.4);
    const bx = sd < 0 ? x + 3 : x + 1; ctx.fillStyle = lv > 0.4 ? 'rgb(235,250,250)' : '#3a4548'; ctx.fillRect(bx, y + 7, 10, 12); ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 4; i++) ctx.fillRect(bx, y + 9 + i * 3, 10, 0.8);
    ctx.restore();
  }
  light(L) { const lv = this.level(); if (lv <= 0.01) return; L.add({ x: this.x + 7 - this.side * -6 + (this.side < 0 ? 12 : -12), y: this.y + 13, r: this.r, color: this.col, i: this.i * lv, shadow: true, glow: 44, glowA: 0.5 * lv, seed: this.seed }); }
}
S.walllamp = (s) => new WallLamp(s);
S.fluoro = (s) => new LightProp(s, 'fluoro');
S.lamp = (s) => new LightProp(s, 'lamp');

class FireBarrel extends CD.Entity {
  constructor(s) { super(cellX(s) - 16, cellB(s) - 40, 32, 40); this.kind = 'prop'; this.z = 2; this.seed = s.tx * 3 + s.ty; this.ember = 0; }
  update(dt) { this.t += dt; this.ember -= dt; if (this.awake && this.ember <= 0) { this.ember = 0.06; G.fx.add({ t: 'fire', x: this.cx + (Math.random() - 0.5) * 12, y: this.y + 4, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 50, life: 0.55, max: 0.55, size: 9 + Math.random() * 8 }); if (Math.random() < 0.25) G.fx.add({ t: 'ember', x: this.cx + (Math.random() - 0.5) * 10, y: this.y, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 50, life: 1.4, max: 1.4, col: '255,150,60', size: 1.3 }); if (Math.random() < 0.1) G.fx.smoke(this.cx, this.y - 10, 1, '60,56,52', 8, 40); } }
  draw(ctx) {
    const x = this.x, y = this.y; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, y + 40, 18, 3.4, 0, 0, 7); ctx.fill();
    const gr = ctx.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#2a1e16'); gr.addColorStop(0.3, '#7a4a30'); gr.addColorStop(0.6, '#5a3822'); gr.addColorStop(1, '#20160e'); ctx.fillStyle = gr; ctx.fillRect(x, y + 8, 32, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y + 16, 32, 2.4); ctx.fillRect(x, y + 30, 32, 2.4); ctx.fillStyle = 'rgba(255,200,140,0.18)'; ctx.fillRect(x + 4, y + 8, 3, 32);
    ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.ellipse(this.cx, y + 8, 16, 4.4, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; const fl = 0.7 + Math.sin(G.time * 22 + this.seed) * 0.15; const g2 = ctx.createRadialGradient(this.cx, y + 6, 0, this.cx, y + 6, 22); g2.addColorStop(0, 'rgba(255,230,150,' + fl + ')'); g2.addColorStop(0.5, 'rgba(255,120,30,0.6)'); g2.addColorStop(1, 'rgba(180,40,0,0)'); ctx.fillStyle = g2; ctx.fillRect(x - 6, y - 16, 44, 40); ctx.globalCompositeOperation = 'source-over';
  }
  light(L) { L.add({ x: this.cx, y: this.y + 2, r: 340, color: [1, 0.55, 0.22], i: 1.35, flicker: 0.28, fspeed: 14, seed: this.seed, shadow: true, glow: 70, glowA: 0.5 }); }
}
S.firebarrel = (s) => new FireBarrel(s);

// ------------------------------------------------------------------ bed (rest / save point)
class Bed extends CD.Entity {
  constructor(s) { super(cellX(s) - 34, cellB(s) - 30, 68, 30); this.kind = 'prop'; this.z = 2; this.range = 70; this.s = s; this.name = 'Bunk'; }
  canInteract() { return true; }
  interact(p) { G.bedMenu(this); }
  draw(ctx) {
    const x = this.x, y = this.y;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, y + 30, 36, 3.4, 0, 0, 7); ctx.fill();
    metalRect(ctx, x + 2, y + 12, 3.4, 18, [60, 66, 72], true); metalRect(ctx, x + 62, y + 12, 3.4, 18, [60, 66, 72], true);
    metalRect(ctx, x, y + 14, 68, 4, [70, 76, 82]);
    const gr = ctx.createLinearGradient(0, y + 5, 0, y + 15); gr.addColorStop(0, '#8a96a2'); gr.addColorStop(1, '#4a5560'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x + 3, y + 14); ctx.quadraticCurveTo(x + 4, y + 6, x + 12, y + 6); ctx.lineTo(x + 64, y + 7); ctx.quadraticCurveTo(x + 68, y + 8, x + 66, y + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 12, y + 6, 50, 1.4);
    ctx.fillStyle = '#c8c4b0'; ctx.beginPath(); ctx.ellipse(x + 15, y + 5, 11, 4.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + 8, y + 7, 14, 2);
    ctx.fillStyle = '#3a5a86'; ctx.fillRect(x + 28, y + 5, 34, 6); ctx.fillStyle = '#e8c53a'; ctx.fillRect(x + 28, y + 5, 34, 1.4);   // vault-blue blanket with yellow hem
    if (G.st && G.st.bed && G.st.bed.id === this.s.key) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(80,255,150,' + (0.4 + Math.sin(G.time * 3) * 0.15) + ')'; ctx.fillRect(x + 30, y - 4, 4, 4); ctx.globalCompositeOperation = 'source-over'; }
  }
  light(L) { L.add({ x: this.cx, y: this.y - 4, r: 90, color: [0.4, 1, 0.6], i: 0.35, shadow: false }); }
}
S.bed = (s) => new Bed(s);
// bunk menu: rest & save, or fast-travel to any bunk discovered so far
G.bedMenu = function (bed) {
  const st = G.st, order = ['vault', 'surface', 'rustyard', 'metro', 'plant', 'deep'];
  const others = Object.keys(st.beds || {}).filter((k) => k !== bed.s.key).map((k) => Object.assign({ key: k }, st.beds[k]));
  if (!others.length) return G.rest(bed);
  others.sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region) || a.x - b.x);
  const reg = (r) => (CD.REGIONS[r] || { name: r }).name;
  const tree = {
    root: { text: 'A bunk. Safe enough to sleep on. Resting heals you, saves the game and lets the wasteland reset.', choices: [
      { label: 'Rest and save.', act: () => G.rest(bed), end: true },
      { label: 'Travel to another bunk...', go: 'travel' },
      { label: 'Never mind.', end: true }] },
    travel: { text: 'Where to? (Travelling does not heal you or save the game.)', choices: others.map((b) => ({ label: b.name + '  -  ' + reg(b.region), act: () => G.travelTo(b), end: true })).concat([{ label: 'Back.', go: 'root' }]) },
  };
  CD.dialog.openTree('BUNK', tree);
};
G.travelTo = function (b) {
  const p = G.player; if (G.resting || !b) return;
  G.resting = true; G.cutscene = true; CD.audio.play('door');
  G.fade = { t: 0, dur: 1.6, onMid: () => {
    p.x = b.x - p.w / 2; p.y = b.y - p.h; p.vx = p.vy = 0; G.projectiles.length = 0; G.snapCamera(); G.updateRooms(true);
  }, onEnd: () => { G.resting = false; G.cutscene = false; } };
};
G.rest = function (bed) {
  const st = G.st, p = G.player; if (G.resting) return;
  G.resting = true; G.cutscene = true; CD.audio.play('rest');
  G.fade = { t: 0, dur: 1.6, onMid: () => {
    st.hp = G.maxHP(); st.ap = G.maxAP(); st.buffs = {}; st.rad = Math.max(0, st.rad - 15);
    G.respawnEnemies(); st.bed = { x: bed.cx, y: bed.y + bed.h, id: bed.s.key, room: G.room && G.room.id };
    p.x = bed.cx - p.w / 2; p.y = bed.y + bed.h - p.h; p.vx = p.vy = 0;
    G.autosave(); G.notify('Rested. Game saved.', 'perk'); CD.audio.play('save');
  }, onEnd: () => { G.resting = false; G.cutscene = false; } };
};

// ------------------------------------------------------------------ terminal
class Terminal extends CD.Entity {
  constructor(s) { super(cellX(s) - 22, cellB(s) - 44, 44, 44); this.kind = 'prop'; this.z = 2; this.range = 60; this.s = s; this.id = s.id || ('term_' + s.key); this.lines = s.lines; this.title = s.title; this.hack = s.hack; this.unlock = s.unlock; this.scroll = 0; }
  canInteract() { return true; }
  interact(p) { CD.terminal.open(this); }
  update(dt) { this.t += dt; }
  draw(ctx) {
    const x = this.x, y = this.y; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, y + 44, 24, 3, 0, 0, 7); ctx.fill();
    metalRect(ctx, x + 2, y + 34, 40, 10, [90, 84, 70]); metalRect(ctx, x, y + 30, 44, 5, [110, 104, 88]);
    metalRect(ctx, x + 6, y + 2, 32, 28, [150, 144, 126]); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 6, y + 2, 32, 1.4);
    ctx.fillStyle = '#04100a'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 9, y + 5, 26, 20, 3) : ctx.rect(x + 9, y + 5, 26, 20); ctx.fill();
    const done = G.st && G.st.terminals[this.id];
    ctx.fillStyle = done ? '#6eff9c' : '#2cff86'; ctx.globalAlpha = 0.85;
    for (let i = 0; i < 4; i++) { const l = 8 + ((Math.sin(this.s.tx * 7 + i * 3 + Math.floor(G.time * 0.7)) * 0.5 + 0.5) * 12); ctx.fillRect(x + 11, y + 8 + i * 4.4, l, 1.6); }
    if (Math.floor(G.time * 2) % 2) ctx.fillRect(x + 11, y + 22, 3, 1.8); ctx.globalAlpha = 1;
    const gl = ctx.createLinearGradient(x + 9, y + 5, x + 35, y + 25); gl.addColorStop(0, 'rgba(255,255,255,0.16)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(x + 9, y + 5, 26, 20);
    ctx.fillStyle = '#20241f'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * 6, y + 37, 4.4, 3);
  }
  light(L) { L.add({ x: this.cx, y: this.y + 14, r: 120, color: [0.25, 1, 0.55], i: 0.7, flicker: 0.06, shadow: false, glow: 26, glowA: 0.5 }); }
}
S.terminal = (s) => new Terminal(s);

// ------------------------------------------------------------------ Nuka-Cola vending machine (shop)
class NukaMachine extends CD.Entity {
  constructor(s) { super(cellX(s) - 22, cellB(s) - 68, 44, 68); this.kind = 'prop'; this.z = 2; this.range = 60; this.s = s; this.stock = s.stock; }
  canInteract() { return true; }
  interact() { CD.shop.open(this.stock || 'vending'); }
  draw(ctx) {
    const x = this.x, y = this.y; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, y + 68, 26, 3.4, 0, 0, 7); ctx.fill();
    const gr = ctx.createLinearGradient(x, 0, x + 44, 0); gr.addColorStop(0, '#5a1410'); gr.addColorStop(0.25, '#c2261c'); gr.addColorStop(0.7, '#9a1a14'); gr.addColorStop(1, '#440c0a'); ctx.fillStyle = gr; ctx.fillRect(x, y, 44, 68);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, 44, 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, y + 66, 44, 2);
    ctx.fillStyle = '#f4f0e0'; ctx.font = 'italic bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Nuka-Cola', x + 22, y + 11);
    ctx.fillStyle = '#100808'; ctx.fillRect(x + 5, y + 16, 26, 38);
    const fl = 0.7 + Math.sin(G.time * 3 + this.s.tx) * 0.05; const g2 = ctx.createLinearGradient(0, y + 16, 0, y + 54); g2.addColorStop(0, 'rgba(255,240,210,' + 0.5 * fl + ')'); g2.addColorStop(1, 'rgba(255,180,120,' + 0.2 * fl + ')'); ctx.fillStyle = g2; ctx.fillRect(x + 6, y + 17, 24, 36);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = (r + c) % 2 ? '#d33' : '#9a4a2a'; ctx.fillRect(x + 8 + c * 5.6, y + 22 + r * 11, 3.4, 8); ctx.fillStyle = '#e8e8dc'; ctx.fillRect(x + 8 + c * 5.6, y + 22 + r * 11, 3.4, 1.6); }
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x + 34, y + 18, 7, 22); ctx.fillStyle = '#4dff86'; ctx.fillRect(x + 35, y + 20, 5, 3); ctx.fillStyle = '#c8c8b8'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 35, y + 26 + i * 4, 5, 2.4);
    ctx.fillStyle = '#100808'; ctx.fillRect(x + 8, y + 57, 28, 7); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x + 8, y + 57, 28, 1);
  }
  light(L) { L.add({ x: this.cx - 6, y: this.y + 34, r: 170, color: [1, 0.55, 0.4], i: 0.7, flicker: 0.05, shadow: false, glow: 40, glowA: 0.4 }); }
}
S.nuka = (s) => new NukaMachine(s);

// ------------------------------------------------------------------ containers
class Crate extends CD.Entity {
  constructor(s) { super(cellX(s) - 17, cellB(s) - 34, 34, 34); this.kind = 'prop'; this.z = 2; this.hittable = true; this.hp = 22; this.s = s; this.key = s.key; this.head = false; this.metal = false; this.seed = s.tx * 5 + s.ty; this.flash = 0; this.caps = 0; this.crate = true; }
  onBlast(x, y, r) { if (Math.hypot(this.cx - x, this.cy - y) < r) { this.hp = 0; G.killEnemy(this, {}); } }
  update(dt) { this.t += dt; if (this.flash > 0) this.flash -= dt; }
  onDeath() { G.fx.debris(this.cx, this.cy, 12, '150,110,70', 260); G.fx.dust(this.cx, this.cy + 10, 5, 0); CD.audio.play('wall_break'); if (this.s.contains) G.spawnPickup(this.s.contains.k || this.s.contains, this.cx, this.cy, this.s.contains); else { const r = Math.random(); if (r < 0.4) G.spawnPickup('caps', this.cx, this.cy, { n: 4 + Math.floor(Math.random() * 12) }); else if (r < 0.62) G.spawnPickup('ammo', this.cx, this.cy, { type: G.ammoTypeForDrop(), n: 8 }); else if (r < 0.74) G.spawnPickup('stimpak', this.cx, this.cy, {}); } }
  draw(ctx) {
    const x = this.x, y = this.y; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, y + 34, 20, 3, 0, 0, 7); ctx.fill();
    const gr = ctx.createLinearGradient(x, y, x + 34, y + 34); gr.addColorStop(0, '#a88450'); gr.addColorStop(1, '#5e4526'); ctx.fillStyle = gr; ctx.fillRect(x, y, 34, 34);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 32, 32); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34, y + 34); ctx.moveTo(x + 34, y); ctx.lineTo(x, y + 34); ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,180,0.25)'; ctx.fillRect(x, y, 34, 1.6); ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 4 + i * 8, y + 3, 1, 28);
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x, y, 34, 34); }
  }
}
S.crate = (s) => (G.st && G.st.flags['got:' + s.key]) ? null : new Crate(s);

class Locker extends CD.Entity {
  constructor(s) { super(cellX(s) - 17, cellB(s) - 66, 34, 66); this.kind = 'prop'; this.z = 2; this.range = 50; this.s = s; this.key = s.key; this.open = !!(G.st && G.st.flags['got:' + s.key]); this.openT = this.open ? 1 : 0; this.loot = s.loot; }
  canInteract() { return !this.open; }
  interact() {
    if (this.open) return; this.open = true; G.st.flags['got:' + this.key] = 1; CD.audio.play('door_lock');
    const loot = this.loot || [{ k: 'caps', n: 10 + Math.floor(Math.random() * 30) }, Math.random() < 0.5 ? { k: 'stimpak' } : { k: 'ammo', type: G.ammoTypeForDrop(), n: 14 }];
    loot.forEach((l, i) => { const pk = G.spawnPickup(l.k, this.cx, this.y + 30, Object.assign({}, l)); pk.vx = (i - (loot.length - 1) / 2) * 80; pk.vy = -240; });
  }
  update(dt) { this.t += dt; if (this.open && this.openT < 1) this.openT = Math.min(1, this.openT + dt * 4); }
  draw(ctx) {
    const x = this.x, y = this.y; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, y + 66, 22, 3, 0, 0, 7); ctx.fill();
    metalRect(ctx, x, y, 34, 66, [76, 92, 88], true); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 16.5, y, 1, 66);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; for (let i = 0; i < 4; i++) { ctx.fillRect(x + 4, y + 6 + i * 3, 9, 1.4); ctx.fillRect(x + 21, y + 6 + i * 3, 9, 1.4); }
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, 34, 1.6);
    if (this.openT > 0) { ctx.fillStyle = '#101414'; ctx.fillRect(x + 18, y + 2, 14, 62); ctx.save(); ctx.translate(x + 33, y); ctx.transform(1 - this.openT * 0.85, 0, 0, 1, 0, 0); metalRect(ctx, -14, 2, 14, 62, [64, 78, 74], true); ctx.restore(); }
    else { ctx.fillStyle = '#20282a'; ctx.fillRect(x + 12, y + 30, 3, 8); ctx.fillRect(x + 19, y + 30, 3, 8); }
  }
}
S.locker = (s) => new Locker(s);

// ------------------------------------------------------------------ static world pickups (glyphs)
function pk(kind, extra) {
  return (s) => {
    if (G.st && G.st.flags['got:' + s.key]) return null;
    const o = Object.assign({ key: s.key, static: true }, extra || {}, s.opts || {});
    if (kind === 'ammo' && !o.type) { const reg = (G.world.rooms[s.room] || {}).def; o.type = (reg && reg.ammo) || '10mm'; o.n = 12; }
    const e = new CD.Pickup(cellX(s), s.ty * T + T - 12, Object.assign({ k: kind }, o)); e.grounded = true; e.key = s.key; return e;
  };
}
S.caps = (s) => { if (G.st && G.st.flags['got:' + s.key]) return null; const e = new CD.Pickup(cellX(s), s.ty * T + T - 12, { k: 'caps', static: true, n: s.n || (6 + Math.floor(U.hash2(s.tx, s.ty, 1) * 14)), key: s.key }); e.grounded = true; e.key = s.key; return e; };
S.stimpak = pk('stimpak', { n: 1 });
S.radaway = pk('radaway', { n: 1 });
S.ammo = pk('ammo', {});
S.junk = (s) => S.caps(Object.assign({}, s, { n: 20 }));
// marked pickups: ['pickup', {k:'ability', id:'jetboots'}]
S.pickup = (s) => {
  if (G.st && G.st.flags['got:' + s.key]) return null;
  const o = Object.assign({}, s, { static: true, key: s.key }); const e = new CD.Pickup(cellX(s), s.ty * T + T - (o.k === 'ability' ? 26 : 22), o); e.grounded = true; e.key = s.key; e.n = s.n || 1; return e;
};

// ------------------------------------------------------------------ doors
class Door extends CD.Entity {
  constructor(s) {
    const wT = s.w || 1, hT = s.h || 3;
    super(s.tx * T, (s.ty + 1 - hT) * T, wT * T, hT * T); this.kind = 'door'; this.z = 3; this.s = s; this.key = s.key; this.range = 70; this.lock = s.lock || 'none'; this.style = s.style || 'vault';
    this.open = !!(G.st && G.st.flags['door:' + this.key]); this.openT = this.open ? 1 : 0; this.wT = wT; this.hT = hT; this.tries = 0; this.always = true;
    this.setTiles(!this.open);
  }
  setTiles(closed) { const w = G.world; for (let y = 0; y < this.hT; y++) for (let x = 0; x < this.wT; x++) { const tx = this.s.tx + x, ty = this.s.ty - y; const cur = w.tile(tx, ty); if (closed && cur === TILE.AIR) w.tiles[ty * w.W + tx] = TILE.DOOR; else if (!closed && cur === TILE.DOOR) w.tiles[ty * w.W + tx] = TILE.AIR; } if (G.chunks) G.chunks.invalidateTile(this.s.tx, this.s.ty); }
  unlocked() {
    const st = G.st, l = this.lock;
    if (l === 'none' || l === 'open') return true;
    if (l.indexOf('key:') === 0) return !!st.keys[l.slice(4)];
    if (l.indexOf('flag:') === 0) return !!st.flags[l.slice(5)];
    if (l.indexOf('terminal:') === 0) return !!st.terminals[l.slice(9)];
    if (l.indexOf('ability:') === 0) return G.hasAbility(l.slice(8));
    return false;
  }
  canInteract() { return !this.open; }
  label() { return this.unlocked() ? 'Open' : 'Locked'; }
  interact(p) {
    if (this.open) return;
    if (this.unlocked()) { this.openDoor(); }
    else { CD.audio.play('door_lock'); this.tries++; G.notify(this.s.hint || (this.lock.indexOf('key:') === 0 ? 'Requires a ' + this.lock.slice(4).toUpperCase() + ' keycard.' : this.lock.indexOf('terminal:') === 0 ? 'Access denied. Find the controlling terminal.' : 'Locked.'), 'warn'); }
  }
  openDoor(silent) { this.open = true; G.st.flags['door:' + this.key] = 1; if (!silent) CD.audio.play('door'); this.opening = true; if (this.s.onOpen && CD.story) CD.story.event(this.s.onOpen); }
  update(dt) {
    this.t += dt;
    if (!this.open && this.lock.indexOf('flag:') === 0 && this.unlocked() && this.s.auto !== false && Math.abs(G.player.cx - this.cx) < 220) this.openDoor();
    if (!this.open && this.lock === 'open' && Math.abs(G.player.cx - this.cx) < 90 && Math.abs(G.player.cy - this.cy) < this.h) this.openDoor();
    if (this.open && this.openT < 1) { this.openT = Math.min(1, this.openT + dt * 0.7); if (this.openT > 0.6 && this.tilesClosed !== false) { this.setTiles(false); this.tilesClosed = false; } }
    if (!this.open && this.openT > 0) this.openT = 0;
    if (this.opening && this.openT < 1 && Math.random() < 0.3) G.fx.dust(this.cx, this.y + this.h, 1, 0);
  }
  drawHatch(ctx) {   // wide+short doors are floor hatches: two leaves that slide apart over a dark shaft
    const x = this.x, y = this.y, w = this.w, h = this.h, k = U.ease.inOutQuad(this.openT), un = this.unlocked(), half = w / 2, slide = k * (half - 8);
    ctx.fillStyle = '#04060a'; ctx.fillRect(x, y, w, h + 2);
    const base = this.style === 'wood' ? [110, 80, 52] : this.style === 'scrap' ? [120, 84, 56] : [86, 100, 112];
    for (const side of [-1, 1]) {
      const lx = side < 0 ? x - slide : x + half + slide; ctx.save(); ctx.beginPath(); ctx.rect(x, y - 3, w, h + 5); ctx.clip();
      metalRect(ctx, lx + 1, y - 2, half - 2, h + 1, base);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; for (let i = 1; i < 4; i++) ctx.fillRect(lx + 1 + ((half - 2) / 4) * i, y - 1, 2, h - 2);
      ctx.save(); ctx.beginPath(); ctx.rect(lx + 1, y - 2, half - 2, 7); ctx.clip(); ctx.fillStyle = '#c9a51c'; ctx.fillRect(lx, y - 2, half, 7); ctx.fillStyle = '#16140f';
      for (let sx = lx - 12; sx < lx + half + 12; sx += 14) { ctx.beginPath(); ctx.moveTo(sx, y + 5); ctx.lineTo(sx + 7, y + 5); ctx.lineTo(sx + 14, y - 2); ctx.lineTo(sx + 7, y - 2); ctx.fill(); } ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(lx + 1, y - 2, half - 2, 1.2); ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + half - 1.5, y - 2, 3, h + 1);
    if (this.s.label && k < 0.5) { ctx.fillStyle = '#e8c53a'; ctx.font = 'bold 11px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillText(this.s.label, x + half, y + h - 13); }
    metalRect(ctx, x - 3, y - 4, 5, h + 6, [40, 46, 52], true); metalRect(ctx, x + w - 2, y - 4, 5, h + 6, [40, 46, 52], true);
    if (!this.open) { const col = un ? '#4dff86' : '#ff4a38'; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x + w / 2, y - 8, 3.6, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  }
  draw(ctx) {
    if (this.wT >= this.hT * 2) return this.drawHatch(ctx);
    const x = this.x, y = this.y, w = this.w, h = this.h, k = U.ease.inOutQuad(this.openT), lift = k * (h - 6);
    const un = this.unlocked();
    ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - 4, w + 4, h + 6); ctx.clip();
    // frame recess
    ctx.fillStyle = '#06080a'; ctx.fillRect(x, y, w, h);
    // door leaf slides up
    const dy = y - lift; const base = this.style === 'wood' ? [110, 80, 52] : this.style === 'scrap' ? [120, 84, 56] : [86, 100, 112];
    metalRect(ctx, x + 3, dy, w - 6, h, base);
    if (this.style === 'vault' || this.style === 'blast') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; for (let i = 1; i < 4; i++) ctx.fillRect(x + 3, dy + (h / 4) * i, w - 6, 2.4);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; for (let i = 1; i < 4; i++) ctx.fillRect(x + 3, dy + (h / 4) * i + 2.4, w - 6, 1);
      // hazard stripes at the bottom
      ctx.save(); ctx.beginPath(); ctx.rect(x + 3, dy + h - 14, w - 6, 10); ctx.clip(); ctx.fillStyle = '#c9a51c'; ctx.fillRect(x + 3, dy + h - 14, w - 6, 10); ctx.fillStyle = '#16140f'; for (let sx = x - 10; sx < x + w + 10; sx += 14) { ctx.beginPath(); ctx.moveTo(sx, dy + h - 4); ctx.lineTo(sx + 7, dy + h - 4); ctx.lineTo(sx + 17, dy + h - 14); ctx.lineTo(sx + 10, dy + h - 14); ctx.fill(); } ctx.restore();
      // number plate
      if (this.s.label) { ctx.fillStyle = '#e8c53a'; ctx.font = 'bold 11px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillText(this.s.label, x + w / 2, dy + 22); }
    } else if (this.style === 'wood') { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.6; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 3 + ((w - 6) / 3) * i, dy); ctx.lineTo(x + 3 + ((w - 6) / 3) * i, dy + h); ctx.stroke(); } }
    ctx.restore();
    // side pillars
    metalRect(ctx, x - 3, y - 4, 5, h + 6, [40, 46, 52], true); metalRect(ctx, x + w - 2, y - 4, 5, h + 6, [40, 46, 52], true);
    // status light
    if (!this.open) { const col = un ? '#4dff86' : '#ff4a38'; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x + w / 2, y - 8, 3.6, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  }
  light(L) { if (!this.open) { const un = this.unlocked(); L.add({ x: this.cx, y: this.y - 8, r: 100, color: un ? [0.3, 1, 0.5] : [1, 0.25, 0.15], i: 0.55, shadow: false, glow: 20, glowA: 0.6 }); } }
}
S.door = (s) => new Door(s);

// ------------------------------------------------------------------ elevator / moving platforms
class Elevator extends CD.Entity {
  constructor(s) {
    const w = (s.w || 3) * T; super(s.tx * T, (s.ty + 1) * T, w, 10); this.kind = 'platform'; this.z = 1; this.s = s; this.range = 90; this.always = true;
    this.bot = this.y; this.top = this.y - (s.rise || 8) * T; this.speed = s.speed || 150; this.target = this.y; this.dy = 0; this.dx = 0; this.stateT = 0; this.moving = false;
    this.startTop = !!s.startTop; if (this.startTop) { this.y = this.top; this.target = this.top; }
    this.auto = s.auto; this.hint = s.hint;
  }
  playerOn() { const p = G.player; return p.onGround && p.platform === this || (Math.abs(p.y + p.h - this.y) < 6 && p.x + p.w > this.x && p.x < this.x + this.w); }
  canInteract(p) { return !this.moving && (this.playerOn() || Math.abs(p.cx - this.cx) < this.w / 2 + 70); }
  interact(p) {
    if (this.moving) return; const atTop = Math.abs(this.y - this.top) < 2;
    if (this.playerOn()) { this.target = atTop ? this.bot : this.top; } else { this.target = (Math.abs(p.y + p.h - this.top) < Math.abs(p.y + p.h - this.bot)) ? this.top : this.bot; }
    if (Math.abs(this.target - this.y) > 2) { this.moving = true; CD.audio.play('elevator'); }
  }
  update(dt) {
    this.dy = 0; this.t += dt;
    if (this.moving) { const d = this.target - this.y, step = Math.min(Math.abs(d), this.speed * dt) * Math.sign(d); this.y += step; this.dy = step; if (Math.abs(this.target - this.y) < 0.01) { this.y = this.target; this.moving = false; CD.audio.play('thud'); } if (Math.random() < 0.05) CD.audio.play('elevator'); }
    else if (this.auto && this.playerOn()) { const atTop = Math.abs(this.y - this.top) < 2; this.target = atTop ? this.bot : this.top; this.moving = true; }
  }
  draw(ctx) {
    const x = this.x, y = this.y, w = this.w;
    // guide rails
    ctx.fillStyle = '#12161a'; ctx.fillRect(x + 4, this.top - 12, 5, this.bot - this.top + 30); ctx.fillRect(x + w - 9, this.top - 12, 5, this.bot - this.top + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x + 4, this.top - 12, 1.5, this.bot - this.top + 30); ctx.fillRect(x + w - 9, this.top - 12, 1.5, this.bot - this.top + 30);
    // cable
    ctx.strokeStyle = '#0c0e10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, this.top - 30); ctx.lineTo(x + w / 2, y); ctx.stroke();
    metalRect(ctx, x, y, w, 10, [96, 104, 110]); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, w, 1.5);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + 2, w, 7); ctx.clip(); ctx.fillStyle = '#c9a51c'; ctx.fillRect(x, y + 2, w, 7); ctx.fillStyle = '#16140f'; for (let sx = x - 10; sx < x + w + 10; sx += 14) { ctx.beginPath(); ctx.moveTo(sx, y + 9); ctx.lineTo(sx + 7, y + 9); ctx.lineTo(sx + 14, y + 2); ctx.lineTo(sx + 7, y + 2); ctx.fill(); } ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + 9, w, 2);
    // console
    metalRect(ctx, x + w - 22, y - 28, 12, 28, [58, 64, 70]); ctx.fillStyle = this.moving ? '#ffb040' : '#4dff86'; ctx.fillRect(x + w - 19, y - 24, 6, 3);
  }
  light(L) { L.add({ x: this.x + this.w - 16, y: this.y - 22, r: 80, color: this.moving ? [1, 0.7, 0.3] : [0.3, 1, 0.5], i: 0.4, shadow: false }); }
}
S.elevator = (s) => new Elevator(s);

class MovingPlatform extends CD.Entity {
  constructor(s) { super(s.tx * T, s.ty * T + T - 12, (s.w || 3) * T, 12); this.kind = 'platform'; this.s = s; this.ox = this.x; this.oy = this.y; this.rx = (s.rx || 0) * T; this.ry = (s.ry || 0) * T; this.spd = s.spd || 1.0; this.dx = 0; this.dy = 0; this.z = 1; this.phase = s.phase || 0; this.always = false; }
  update(dt) { this.t += dt; const nx = this.ox + Math.sin((this.t * this.spd + this.phase)) * this.rx / 2 + this.rx / 2, ny = this.oy + Math.sin((this.t * this.spd + this.phase)) * this.ry / 2 + this.ry / 2; this.dx = nx - this.x; this.dy = ny - this.y; this.x = nx; this.y = ny; }
  draw(ctx) { const x = this.x, y = this.y, w = this.w; metalRect(ctx, x, y, w, 12, [100, 104, 108]); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, w, 1.5); ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < w / 6; i++) ctx.fillRect(x + 3 + i * 6, y + 4, 2.5, 5); ctx.fillStyle = '#c9a51c'; ctx.fillRect(x, y + 10, w, 2); }
}
S.mplat = (s) => new MovingPlatform(s);

// ------------------------------------------------------------------ trigger zones (story lines, tutorial hints)
class Trigger extends CD.Entity {
  constructor(s) { super(s.tx * T, (s.ty + 1 - (s.h || 3)) * T, (s.w || 2) * T, (s.h || 3) * T); this.kind = 'trigger'; this.s = s; this.id = s.id || s.key; this.z = 0; this.always = true; this.done = !!(G.st && G.st.flags['trig:' + this.id]) && s.once !== false; this.delay = 0; }
  update(dt) {
    const p = G.player; if (!p || p.dead || G.state !== 'play') return;
    const inside = U.overlap(p, this);
    if (this.done) { if (this.s.repeat && !inside) this.done = false; return; }
    if (!inside) return;
    if (this.s.requires && !G.st.flags[this.s.requires]) return;
    this.done = true; if (this.s.once !== false && !this.s.repeat) G.st.flags['trig:' + this.id] = 1;
    if (CD.story) CD.story.event(this.s);
  }
  draw(ctx) { if (G.debug) { ctx.strokeStyle = 'rgba(255,0,255,0.5)'; ctx.strokeRect(this.x, this.y, this.w, this.h); } }
}
S.trigger = (s) => new Trigger(s);

// ------------------------------------------------------------------ NPCs
class NPC extends CD.Entity {
  constructor(s) { super(cellX(s) - 11, cellB(s) - 66, 22, 66); this.kind = 'npc'; this.z = 4; this.s = s; this.id = s.id; this.face = s.face || -1; this.range = 90; this.rig = CD.Rig.get(s.outfit || 'trader'); this.name = s.name || 'Stranger'; this.phase = 0; this.talkT = 0; }
  canInteract() { return true; }
  interact(p) { this.face = p.cx > this.cx ? 1 : -1; CD.dialog.open(this); }
  update(dt) { this.t += dt; }
  draw(ctx) {
    const pose = CD.Rig.pose({ mode: 'idle', t: this.t + (this.s.tx || 0), phase: 0, speed: 0, aim: this.s.armed ? 0.5 : undefined, twoHand: false });
    const wp = this.s.weapon ? (() => { const sp = CD.Rig.weaponSprite(this.s.weapon); return sp ? { sprite: sp, mx: sp.mx, melee: !!sp.melee } : null; })() : null;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, this.y + 66, 14, 3, 0, 0, 7); ctx.fill();
    CD.Rig.draw(ctx, this.rig, pose, { x: this.cx, y: this.y + 66, scale: 1, face: this.face, weapon: wp });
  }
  light(L) { if (this.s.light) L.add({ x: this.cx, y: this.y + 20, r: 120, color: [1, 0.8, 0.5], i: 0.4, shadow: false }); }
}
S.npc = (s) => new NPC(s);

// ------------------------------------------------------------------ boss arena definition (invisible marker)
// ['arena', {boss:'warlord', floor:18, gates:[{dx:-20,dy:-2,w:2,h:3}], spawn:[dx,dy]}] placed anywhere inside the arena room.
// floor = local row (in the room) of the floor's top surface; gates are offsets in tiles from the mark; spawn is an offset in tiles from the mark.
G.arenas = G.arenas || {};
class ArenaMark extends CD.Entity {
  constructor(s) { super(s.tx * T, s.ty * T, T, T); this.kind = 'arena'; this.always = true; this.dead = false; const r = G.world.rooms[s.room];
    G.arenas[s.boss] = { boss: s.boss, room: r, floorY: (r.y0 + s.floor) * T, x0: (r.x0 + 2) * T, x1: (r.x1 - 2) * T, y0: (r.y0 + 2) * T,
      gates: (s.gates || []).map((g) => ({ tx: s.tx + g.dx, ty: s.ty + g.dy, w: g.w, h: g.h })), spawn: { tx: s.tx + (s.spawn ? s.spawn[0] : 0), ty: s.ty + (s.spawn ? s.spawn[1] : 0) }, cx: (r.x0 + r.x1) / 2 * T, spec: s }; }
  update() { } draw() { }
}
S.arena = (s) => new ArenaMark(s);

// ------------------------------------------------------------------ hazards
class SteamVent extends CD.Entity {
  constructor(s) { super(cellX(s) - 16, s.ty * T + T - 10, 32, 10); this.kind = 'hazard'; this.z = 2; this.s = s; this.period = s.period || 3.2; this.on = s.on || 1.1; this.phase = (s.tx * 0.37) % this.period; this.len = (s.len || 3) * T; this.dir = s.dir || -1; }
  update(dt) {
    this.t += dt; const u = (this.t + this.phase) % this.period; this.active = u > this.period - this.on; this.warn = !this.active && u > this.period - this.on - 0.5;
    if (!this.awake) return;
    if (this.active) {
      if (Math.random() < 0.7) G.fx.add({ t: 'smoke', x: this.cx + (Math.random() - 0.5) * 10, y: this.y + this.dir * Math.random() * this.len * 0.7, vx: (Math.random() - 0.5) * 30, vy: this.dir * (120 + Math.random() * 120), life: 0.5, max: 0.5, col: '210,220,220', size: 8, grow: 24, a: 0.5 });
      const p = G.player, top = this.dir < 0 ? this.y - this.len : this.y, h = this.len; if (p && !p.dead && p.x + p.w > this.x && p.x < this.x + this.w && p.y + p.h > top && p.y < top + h) G.hurtPlayer(18, { kind: 'hazard', knock: 120 });
      if (u < this.period - this.on + dt * 2) CD.audio.play('stimpak');
    } else if (this.warn && Math.random() < 0.15) G.fx.add({ t: 'smoke', x: this.cx, y: this.y - 2, vx: 0, vy: -20, life: 0.4, max: 0.4, col: '200,210,210', size: 4, grow: 10, a: 0.35 });
  }
  draw(ctx) { metalRect(ctx, this.x, this.y, 32, 10, [70, 74, 78]); ctx.fillStyle = '#0a0a0a'; ctx.fillRect(this.x + 4, this.y, 24, 3); }
}
S.steam = (s) => new SteamVent(s);

class ArcTrap extends CD.Entity {   // electric arc between two pylons
  constructor(s) { const len = (s.len || 4) * T; super(s.tx * T, s.ty * T + T / 2 - 14, len, 28); this.kind = 'hazard'; this.z = 2; this.s = s; this.period = s.period || 2.6; this.onT = s.on || 1.0; this.phase = (s.tx * 0.53) % this.period; }
  update(dt) { this.t += dt; const u = (this.t + this.phase) % this.period; this.active = u > this.period - this.onT; if (this.active && this.awake) { const p = G.player; if (p && !p.dead && U.overlap(p, this)) G.hurtPlayer(20, { kind: 'hazard', knock: 200 }); if (Math.random() < 0.2) CD.audio.play('zap'); } }
  draw(ctx) {
    const x = this.x, y = this.y + 14, w = this.w;
    metalRect(ctx, x - 6, y - 16, 12, 32, [70, 74, 78], true); metalRect(ctx, x + w - 6, y - 16, 12, 32, [70, 74, 78], true);
    ctx.fillStyle = this.active ? '#9fe8ff' : '#2a4650'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.arc(x + w, y, 4, 0, 7); ctx.fill();
    if (this.active) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(140,220,255,0.9)'; ctx.lineWidth = 2.4; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(x, y); for (let i = 1; i <= 12; i++) ctx.lineTo(x + (w / 12) * i, y + (Math.random() - 0.5) * 22); ctx.stroke(); } ctx.restore(); }
  }
  light(L) { if (this.active) L.add({ x: this.x + this.w / 2, y: this.y + 14, r: this.w * 0.7 + 60, color: [0.4, 0.8, 1], i: 0.9, flicker: 0.4, fspeed: 30, shadow: false }); }
}
S.arc = (s) => new ArcTrap(s);

class Fan extends CD.Entity {   // animated wall fan (decor entity)
  constructor(s) { super(cellX(s) - 24, s.ty * T - 4, 48, 48); this.kind = 'prop'; this.z = 0; this.a = Math.random() * 6; }
  update(dt) { this.a += dt * 6; }
  draw(ctx) { const cx = this.cx, cy = this.cy; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(cx + 2, cy + 3, 24, 0, 7); ctx.fill(); metalRect(ctx, cx - 24, cy - 24, 48, 48, [60, 66, 72]); ctx.fillStyle = '#04070a'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 7); ctx.fill(); ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.a); ctx.fillStyle = '#3a4046'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.ellipse(9, 0, 9, 3.4, 0, 0, 7); ctx.fill(); } ctx.restore(); ctx.strokeStyle = 'rgba(160,170,180,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 7); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20); ctx.stroke(); }
}
S.fan = (s) => new Fan(s);

// props from marks: cryo pod, intercom speaker etc. are static decor; dynamic screens:
class Screen extends CD.Entity {   // big wall monitor with scrolling text
  constructor(s) { super(s.tx * T, (s.ty - (s.h || 2) + 1) * T, (s.w || 3) * T, (s.h || 2) * T); this.kind = 'prop'; this.z = 0; this.s = s; this.lines = s.lines || ['VAULT-TEC', 'SYSTEM ONLINE']; this.col = s.col || [0.2, 1, 0.5]; }
  draw(ctx) {
    const x = this.x, y = this.y, w = this.w, h = this.h; metalRect(ctx, x - 4, y - 4, w + 8, h + 8, [50, 56, 62]); ctx.fillStyle = '#031008'; ctx.fillRect(x, y, w, h);
    const c = 'rgb(' + (this.col[0] * 255 | 0) + ',' + (this.col[1] * 255 | 0) + ',' + (this.col[2] * 255 | 0) + ')'; ctx.fillStyle = c; ctx.globalAlpha = 0.9; ctx.font = 'bold 13px "Courier New", monospace'; ctx.textAlign = 'left';
    this.lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 22 + i * 18)); if (Math.floor(G.time * 2) % 2) ctx.fillRect(x + 10, y + h - 20, 8, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < h; i += 3) ctx.fillRect(x, y + i, w, 1);
    const gl = ctx.createLinearGradient(x, y, x + w, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(x, y, w, h);
  }
  light(L) { L.add({ x: this.cx, y: this.cy, r: 150 + this.w * 0.5, color: this.col, i: 0.6, flicker: 0.05, shadow: false, glow: 40, glowA: 0.3 }); }
}
S.screen = (s) => new Screen(s);

})();
