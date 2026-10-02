// The game: fixed-timestep loop, state machine, room loading, entity management and combat resolution.
import * as THREE from 'three';
import { Gfx } from '../gfx/gfx.js';
import { CameraRig } from '../gfx/camera.js';
import { Particles } from '../gfx/particles.js';
import { RoomView } from '../gfx/roomView.js';
import { THEMES, AREA_NAMES } from '../gfx/themes.js';
import { Input } from '../core/input.js';
import { GameAudio } from '../core/audio.js';
import { RoomRuntime } from '../world/room.js';
import { ROOMS, START } from '../world/world.js';
import { T, FLAGS, F_CLIMB } from '../sim/tiles.js';
import { overlapsSolid } from '../sim/physics.js';
import { Player } from './player.js';
import { overlap } from './entity.js';
import { Boomerang } from './projectiles.js';
import { Banana, HeartFruit, Relic, SaveBarrel, Sign, Switch, GoldenBanana } from './pickups.js';
import { Snapjaw, Thornbug, Bat, Tiki, Magma, Spider, Wisp, Cannon, Enemy } from './enemies.js';
import { makeBoss } from './bosses.js';
import { newSave, loadSave, writeSave, clearSave, loadSettings, saveSettings } from './save.js';
import { Hud } from '../ui/hud.js';
import { Menus } from '../ui/menus.js';
import { clamp } from '../core/util.js';

const STEP = 1 / 60;

export const ABILITY_INFO = {
  roll: { name: 'Barrel Roll', key: 'C', desc: 'Curl into a rolling ball. Smash crates, squeeze through narrow tunnels, and leap huge gaps by jumping out of a roll.' },
  pound: { name: 'Ground Pound', key: 'Down + X in the air', desc: 'Slam the ground from the air to shatter cracked slabs, stun foes and shake the world.' },
  grip: { name: 'Gorilla Grip', key: 'Hold toward a wall, then Jump', desc: 'Cling to walls and kick off them to scale tall shafts.' },
  boom: { name: 'Banana Boomerang', key: 'V', desc: 'Hurl a boomerang that strikes foes, flips far-away crystal switches and snatches distant bananas.' },
};

export class Game {
  constructor(container) {
    this.container = container;
    const settings = loadSettings();
    this.settings = { volume: 0.7, music: true, shake: true, ...settings };
    this.gfx = new Gfx(container, { shadows: !/[?&]noshadow/.test(location.search), shadowSize: /[?&]lowq/.test(location.search) ? 1024 : 2048 });
    this.camera = new CameraRig(this.gfx.camera);
    this.fx = new Particles(this.gfx.scene);
    this.gfx.fx = this.fx;
    this.entityGroup = new THREE.Group();
    this.gfx.scene.add(this.entityGroup);
    this.input = new Input();
    this.audio = new GameAudio(this.settings);
    this.hud = new Hud(this);
    this.menus = new Menus(this);

    this.state = 'boot';
    this.time = 0;
    this.acc = 0;
    this.entities = [];
    this.room = null; this.grid = null; this.view = null;
    this.player = null;
    this.save = newSave(START);
    this.hitstopT = 0;
    this.slow = null;
    this.transition = null;
    this.itemGet = null;
    this.deadT = 0;
    this.boss = null;
    this.bossDef = null;
    this.paused = false;
    this.frameMs = 16; this.perfT = 0; this.perfN = 0; this.perfAcc = 0;
    this.lastSaveWrite = 0;
    this.hasSave = !!loadSave();
    this.runTime = 0;
    this.signIndex = 0;
    this.manual = /[?&]manual/.test(location.search); // tests drive the clock themselves

    this.player = new Player(this, START.x, START.y);
    this.gfx.scene.add(this.player.model);
    this.enterTitle();
    this.last = performance.now();
    this._raf = (t) => this.frame(t);
    requestAnimationFrame(this._raf);
  }

  // ===================================================================== services used by entities
  get aspect() { return this.gfx.aspect; }
  sfx(name, x) {
    let vol = 1;
    if (x !== undefined && this.player) vol = clamp(1 - Math.abs(x - this.player.x) / 28, 0.1, 1);
    this.audio.sfx(name, vol);
  }
  shake(a) { if (this.settings.shake) this.camera.addShake(a); }
  hitstop(sec) { this.hitstopT = Math.max(this.hitstopT, sec); }
  toast(text, sec = 2.5) { this.hud.toast(text, sec); }
  add(e) {
    this.entities.push(e);
    if (e.model) this.entityGroup.add(e.model);
    if (e.model && e.render) e.render(1);
    return e;
  }
  dropBanana(x, y) { this.add(new Banana(this, x, y, null, true)); }
  spawnBoomerang(owner) {
    owner.boomerang = this.add(new Boomerang(this, owner));
    this.sfx('throw');
  }
  get enemies() { return this.entities.filter((e) => (e.kind === 'enemy' || e.kind === 'boss') && !e.dead && !(e.dying > 0)); }

  setSettings(patch) {
    Object.assign(this.settings, patch);
    saveSettings(this.settings);
    this.audio.configure(this.settings);
  }

  // ===================================================================== state transitions
  enterTitle() {
    this.state = 'title';
    this.hud.show(false);
    this.loadRoom(START.room, { x: START.x, y: START.y, face: 1 }, { title: true });
    this.camera.fixed = null;
    this.menus.showTitle();
    this.audio.music('title');
  }

  newGame() {
    this.save = newSave(START);
    clearSave();
    this.runTime = 0;
    this.beginPlay();
  }

  continueGame() {
    const s = loadSave();
    if (!s) return this.newGame();
    this.save = s;
    this.beginPlay();
  }

  beginPlay() {
    this.menus.hideAll();
    this.hud.show(true);
    const sp = this.save.spawn;
    this.loadRoom(sp.room, { x: sp.x, y: sp.y, face: 1 });
    this.player.invuln = 1.0;
    this.state = 'play';
    this.audio.unlock();
    this.input.clear();
    this.hud.refresh(true);
  }

  togglePause() {
    if (this.state === 'play') { this.state = 'pause'; this.menus.showPause(); this.audio.duck(true); }
    else if (this.state === 'pause') this.resume();
  }
  resume() { this.menus.hideAll(); this.state = 'play'; this.audio.duck(false); this.input.clear(); }
  openMap() { if (this.state === 'play') { this.state = 'map'; this.menus.showMap(); } else if (this.state === 'map') this.closeMap(); }
  closeMap() { this.menus.hideAll(); this.state = 'play'; this.input.clear(); }
  quitToTitle() { this.persist(); this.menus.hideAll(); this.audio.duck(false); this.hasSave = !!loadSave(); this.enterTitle(); }

  persist() { if (writeSave(this.save)) this.hasSave = true; }

  // ===================================================================== room loading
  clearEntities() {
    for (const e of this.entities) e.destroy();
    this.entities = [];
    this.boss = null;
    this.player.boomerang = null;
  }

  loadRoom(id, arrival, { title = false } = {}) {
    const def = ROOMS[id];
    if (!def) throw new Error('unknown room ' + id);
    this.clearEntities();
    if (this.view) this.view.dispose();
    this.fx.clear();
    this.room = new RoomRuntime(def, this.save);
    this.grid = this.room.grid;
    this.gfx.applyTheme(def.area);
    this.view = new RoomView(this.gfx, def, this.grid, def.area);
    this.gfx.scene.add(this.view.group);
    this.room.onTile = (tx, ty, t, kind) => this.onTileChange(tx, ty, t, kind);
    this.save.visited[id] = true;
    this.camera.setRoom(def.w, def.h);
    this.camera.fixed = null; this.camera.zoom = 1;
    this.signIndex = 0;
    this.bossDef = null;
    this.spawnFromMarks(def, title);

    const a = this.resolveArrival(def, arrival);
    this.player.place(a.x, a.y, a.face);
    if (a.vy) this.player.body.vy = a.vy;
    const b = this.player.body;
    for (let i = 0; i < 12 && overlapsSolid(this.grid, b.x, b.y, b.hw, b.h); i++) b.y += 0.5;
    this.player.snap();
    this.camera.snap(b.x, b.y, b.face, this.aspect);
    this.camera.look = 0;
    this.hud.roomEntered(def, title);
    if (!title) this.audio.music(THEMES[def.area].music);
    this.render(1);
  }

  resolveArrival(def, arrival) {
    if (arrival.portal !== undefined) {
      const p = def.portals[arrival.portal];
      if (!p) throw new Error(`room ${def.id} has no portal ${arrival.portal}`);
      const cx = (p.x0 + p.x1) / 2 + 0.5;
      switch (p.side) {
        case 'left': return { x: 2.3, y: p.y0, face: 1 };
        case 'right': return { x: def.w - 2.3, y: p.y0, face: -1 };
        case 'top': return { x: cx, y: def.h - 3.2, face: this.player.face, vy: 0 };
        default: return { x: cx, y: p.y1 + 0.6, face: this.player.face, vy: 14 };
      }
    }
    return { x: arrival.x, y: arrival.y, face: arrival.face || 1 };
  }

  spawnFromMarks(def, title) {
    const g = this;
    let signI = 0;
    const flags = this.save.flags;
    for (const m of def.marks) {
      const id = `${def.id}:${m.kind[0]}:${m.x},${m.y}`;
      switch (m.kind) {
        case 'banana': if (!this.save.collected[id]) this.add(new Banana(g, m.x, m.y, id)); break;
        case 'heart': if (!this.save.collected[id]) this.add(new HeartFruit(g, m.x, m.y, id)); break;
        case 'relic': {
          const ab = def.props.relic;
          if (ab && !this.save.abilities[ab]) this.add(new Relic(g, m.x, m.y, ab, 'relic:' + ab));
          break;
        }
        case 'save': this.add(new SaveBarrel(g, m.x, m.y)); break;
        case 'sign': this.add(new Sign(g, m.x, m.y, (def.props.signs || [])[signI++] || '...')); break;
        case 'switchA': this.add(new Switch(g, m.x, m.y, T.GATE_A, !!def.props.slapA)); break;
        case 'switchB': this.add(new Switch(g, m.x, m.y, T.GATE_B, !!def.props.slapB)); break;
        case 'goal': this.add(new GoldenBanana(g, m.x, m.y)); break;
        case 'boss': if (!flags['boss:' + def.props.boss]) this.bossDef = { kind: def.props.boss, x: m.x + 0.5, y: m.y, def: def.props }; break;
        default: break;
      }
      if (title) continue;
      switch (m.kind) {
        case 'snapjaw': this.add(new Snapjaw(g, m.x, m.y)); break;
        case 'thornbug': this.add(new Thornbug(g, m.x, m.y)); break;
        case 'bat': this.add(new Bat(g, m.x, m.y)); break;
        case 'tiki': this.add(new Tiki(g, m.x, m.y, -1)); break;
        case 'tikiR': this.add(new Tiki(g, m.x, m.y, 1)); break;
        case 'magma': this.add(new Magma(g, m.x, m.y)); break;
        case 'spider': this.add(new Spider(g, m.x, m.y)); break;
        case 'wisp': this.add(new Wisp(g, m.x, m.y)); break;
        case 'cannon': this.add(new Cannon(g, m.x, m.y, -1)); break;
        case 'cannonR': this.add(new Cannon(g, m.x, m.y, 1)); break;
        default: break;
      }
    }
    if (def.props.bossRoom && this.bossDef) this.boss = null;
  }

  // ===================================================================== world events
  onTileChange(tx, ty, t, kind) {
    this.view.setTile(tx, ty, t);
    const cx = tx + 0.5, cy = ty + 0.5;
    if (kind === 'roll') { this.fx.debris(cx, cy, 9, 0xb97f3e, { speed: 7 }); this.sfx('crate'); this.shake(0.18); }
    else if (kind === 'pound') { this.fx.debris(cx, cy, 8, 0x888c96, { speed: 6 }); this.fx.burst(cx, cy, 5, { colors: [0xffb347, 0xffffff], speed: 4, life: 0.4 }); this.sfx('slab'); }
    else if (kind === 'gate') { this.fx.burst(cx, cy, 4, { colors: [0xffffff], speed: 3, life: 0.5 }); }
    else if (kind === 'crumble') { this.fx.debris(cx, cy, 6, 0x9a7a5a, { speed: 3, life: 1.2 }); this.fx.dust(cx, cy, 3, 0); }
  }
  onTileBroken() { /* handled via RoomRuntime.onTile */ }

  onPoundImpact(player, ev) {
    const b = player.body;
    this.shake(0.9);
    this.hitstop(0.07);
    this.sfx('pound');
    this.fx.dust(b.x - 0.4, b.y, 7, -1, { size: 0.8 }); this.fx.dust(b.x + 0.4, b.y, 7, 1, { size: 0.8 });
    this.fx.burst(b.x, b.y + 0.2, 16, { colors: [0xffd27a, 0xffffff], speed: 8, arc: Math.PI, dir: -Math.PI / 2 + Math.PI, life: 0.5, size: 0.35, grav: 12 });
    for (const e of this.enemies) {
      if (Math.abs(e.x - b.x) < 3.2 && e.y - b.y < 1.6 && e.y - b.y > -1.8) e.hit(3, Math.sign(e.x - b.x) || 1, 'pound');
    }
    if (this.boss && this.boss.onPound) this.boss.onPound(player);
    void ev;
  }

  startItemGet(relic) {
    this.state = 'itemget';
    this.itemGet = { ability: relic.ability, t: 0, color: relic.color };
    this.camera.zoom = 0.62;
    this.audio.sfx('item');
    this.audio.duck(true);
    this.hud.showItem(relic.ability, ABILITY_INFO[relic.ability]);
    this.fx.burst(this.player.x, this.player.y + 1.2, 40, { colors: [relic.color, 0xffffff, 0xffe27a], speed: 9, life: 1.2, size: 0.45, grav: 0 });
    this.persist();
  }
  endItemGet() {
    this.hud.hideItem();
    this.camera.zoom = 1;
    this.state = 'play';
    this.audio.duck(false);
    this.input.clear();
    const a = this.itemGet && ABILITY_INFO[this.itemGet.ability];
    if (a) this.toast(`${a.name}:  ${a.key}`, 5);
    this.itemGet = null;
    this.hud.refresh(true);
  }

  saveCheckpoint(barrel) {
    const s = this.save;
    s.hp = s.hpMax;
    s.spawn = { room: this.room.def.id, x: barrel.x, y: barrel.y };
    for (const e of this.entities) if (e instanceof SaveBarrel) e.active = e === barrel;
    this.persist();
    this.sfx('save');
    this.fx.burst(barrel.x, barrel.y + 1, 22, { colors: [0xffe14a, 0xffffff], speed: 7, life: 0.8, size: 0.4 });
    this.toast('Checkpoint!  Health restored', 2.6);
    this.hud.bumpHearts();
  }

  playerDied() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.deadT = 0;
    this.save.deaths++;
    this.player.dead = true;
    this.player.body.vy = 13; this.player.body.vx = -this.player.body.face * 3; this.player.body.ground = false;
    this.player.model.visible = true;
    this.sfx('die');
    this.audio.duck(true);
    this.camera.fixed = null;
    this.hud.showDeath(true);
  }

  respawnAfterDeath() {
    this.player.dead = false;
    this.save.hp = this.save.hpMax;
    this.hud.showDeath(false);
    this.audio.duck(false);
    this.player.kong.root.rotation.z = 0;
    const sp = this.save.spawn;
    this.loadRoom(sp.room, { x: sp.x, y: sp.y, face: 1 });
    this.player.invuln = 1.5;
    this.state = 'play';
    this.hud.refresh(true);
  }

  goPortal(p) {
    if (this.transition) return;
    this.transition = { phase: 'out', t: 0, portal: p, climbing: this.player.body.mode === 'climb' };
    this.state = 'transition';
    this.sfx('door');
  }

  // ===================================================================== bosses
  startBoss() {
    const d = this.bossDef;
    if (!d || this.boss) return;
    this.boss = makeBoss(this, d);
    if (!this.boss) return;
    this.add(this.boss);
  }

  bossDefeated(kind) {
    this.save.flags['boss:' + kind] = true;
    for (const o of this.room.openGate(T.GATE_B)) this.fx.burst(o.x + 0.5, o.y + 0.5, 6, { colors: [0xff5ad8, 0xffffff], speed: 4, life: 0.7, size: 0.3 });
    this.persist();
    this.camera.fixed = null;
    this.hud.hideBoss();
    this.boss = null;
    this.audio.music(THEMES[this.room.def.area].music);
  }

  // ===================================================================== main loop
  frame(now) {
    requestAnimationFrame(this._raf);
    if (this.manual) { this.last = now; return; }
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.perfAcc += dt; this.perfN++;
    if (this.perfAcc > 2) { this.adaptQuality(this.perfAcc / this.perfN); this.perfAcc = 0; this.perfN = 0; }
    if (this.slow) { dt *= this.slow.scale; this.slow.t -= dt / this.slow.scale; if (this.slow.t <= 0) this.slow = null; }
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 5) { this.tick(STEP); this.acc -= STEP; n++; }
    if (n === 5) this.acc = 0;
    this.render(this.state === 'play' || this.state === 'dead' ? this.acc / STEP : 1);
  }

  adaptQuality(avg) {
    if (this.settings.fixedQuality) return;
    const g = this.gfx;
    if (avg > 1 / 36 && g.resScale > 0.55) g.setResolutionScale(g.resScale - 0.12);
    else if (avg < 1 / 55 && g.resScale < 1) g.setResolutionScale(g.resScale + 0.08);
  }

  /** One fixed 1/60 s simulation step. */
  tick(dt) {
    const frame = this.input.poll();
    this.input.lastFrame = frame;
    this.time += dt;
    this.menus.update(frame, dt);
    switch (this.state) {
      case 'title': this.tickTitle(dt, frame); break;
      case 'play': this.tickPlay(dt, frame); break;
      case 'pause': this.view.update(dt * 0.0, null, 0, 0); break;
      case 'map': break;
      case 'itemget': this.tickItemGet(dt, frame); break;
      case 'dead': this.tickDead(dt); break;
      case 'transition': this.tickTransition(dt); break;
      case 'ending': this.tickEnding(dt); break;
      case 'endcine': this.tickEndCine(dt); break;
      default: break;
    }
    this.hud.update(dt);
  }

  tickTitle(dt) {
    const p = this.player;
    this.entities.forEach((e) => e.update && e.kind !== 'enemy' && e.update(dt));
    this.entities = this.entities.filter((e) => !e.dead);
    p.kong.update({ face: 1, vx: 0, vy: 0, ground: true, mode: 'move', attack: -1, throwing: -1, hurt: 0 }, dt, this.time);
    const t = this.time * 0.12;
    this.camera.x = 11 + Math.sin(t) * 5; this.camera.y = 5.5; this.camera.apply(this.aspect, dt);
    this.view.update(dt, this.fx, this.camera.x, this.camera.y);
    this.fx.update(dt);
    this.gfx.followShadow(this.camera.x, this.camera.y);
    this.gfx.setPointLights(this.view.pointLights, this.camera.x, this.camera.y, this.time);
  }

  tickPlay(dt, frame) {
    if (frame.pressed.pause) { this.togglePause(); return; }
    if (frame.pressed.map) { this.openMap(); return; }
    this.runTime += dt;
    this.save.playtime += dt;
    if (this.hitstopT > 0) { this.hitstopT -= dt; this.afterUpdate(dt); return; }

    const p = this.player;
    p.snap();
    p.update(dt, frame);

    for (const e of this.entities) if (!e.dead) e.update(dt);
    if (this.entities.some((e) => e.dead)) this.entities = this.entities.filter((e) => !e.dead);

    const box = p.box;
    for (const ev of this.room.updateCrumbles(dt, box)) {
      this.view.setTile(ev.x, ev.y, ev.t);
      if (ev.phase === 'fell') this.onTileChange(ev.x, ev.y, ev.t, 'crumble');
    }
    this.checkContacts(frame);
    this.checkPortals();
    if (this.bossDef && !this.boss) this.checkBossTrigger();
    this.afterUpdate(dt);
  }

  afterUpdate(dt) {
    const p = this.player;
    const b = p.body;
    this.camera.update(dt, b.x, b.y, b.face, b.vy, this.aspect);
    this.view.update(dt, this.fx, this.camera.x, this.camera.y);
    this.fx.update(dt);
    this.gfx.followShadow(this.camera.x, this.camera.y);
    this.gfx.setPointLights(this.view.pointLights, this.camera.x, this.camera.y, this.time);
  }

  checkBossTrigger() {
    const d = this.bossDef, p = this.player;
    const trig = d.def.bossTrigger ?? 6;
    if (Math.abs(p.x - d.x) < trig && Math.abs(p.y - d.y) < 12) this.startBoss();
  }

  checkPortals() {
    const p = this.player;
    if (p.respawnT >= 0) return;
    const portal = this.room.portalAt(p.x, p.y + 0.8);
    if (portal) this.goPortal(portal);
  }

  checkContacts(frame) {
    const p = this.player, b = p.body;
    if (p.respawnT >= 0) return;
    // ---- slap
    if (p.attacking) {
      const sb = p.slapBox();
      for (const e of this.entities) {
        if (e.dead || p.attackHit.has(e)) continue;
        if ((e.kind === 'enemy' || e.kind === 'boss') && !(e.dying > 0) && overlap(sb, e.box)) {
          p.attackHit.add(e);
          if (e.hit(1, b.face, 'slap')) { this.hitstop(0.05); this.shake(0.14); }
        } else if (e.reflectable && overlap(sb, e.box)) { p.attackHit.add(e); e.onSlap(p); this.hitstop(0.04); }
      }
    }
    // ---- bodies
    const pbox = p.box;
    for (const e of this.entities) {
      if (e.dead || !(e.kind === 'enemy' || e.kind === 'boss') || e.dying > 0 || !e.contact) continue;
      if (!overlap(pbox, e.box)) continue;
      const falling = b.vy < -1 && b.y > e.y + e.h * 0.5 && b.mode !== 'climb';
      if (b.mode === 'pound' && b.poundPhase === 1) { if (e.hit(3, b.face, 'pound')) p.bounce(false); continue; }
      if (b.mode === 'roll' && Math.abs(b.vx) > 5.5 && !(e.noRollKill)) { if (e.hit(2, b.face, 'roll')) { this.hitstop(0.05); this.shake(0.12); } else p.hurt(1, e.x); continue; }
      if (falling && e.stompable) { if (e.hit(1, b.face, 'stomp')) { p.bounce(false); this.hitstop(0.05); this.sfx('stomp'); } continue; }
      if (falling && !e.stompable && b.vy < -3 && e.stompBounce) { p.bounce(false); this.sfx('clang'); continue; }
      p.hurt(e.contactDamage || 1, e.x);
    }
    void frame;
  }

  tickItemGet(dt, frame) {
    const it = this.itemGet;
    if (!it) { this.state = 'play'; return; }
    it.t += dt;
    this.player.kong.update({ face: 1, vx: 0, vy: 0, ground: true, mode: 'move', attack: -1, throwing: -1, hurt: 0 }, dt, this.time);
    this.camera.update(dt, this.player.x, this.player.y + 1.2, 1, 0, this.aspect);
    this.view.update(dt, this.fx, this.camera.x, this.camera.y);
    this.fx.update(dt);
    if (Math.random() < 0.5) this.fx.spark(this.player.x + (Math.random() - 0.5) * 3, this.player.y + Math.random() * 3, { vy: 2, color: it.color, size: 0.3, life: 0.8, grav: -1 });
    if (it.t > 1.6 && (frame.pressed.jump || frame.pressed.confirm || frame.pressed.slap || frame.any)) this.endItemGet();
    if (it.t > 12) this.endItemGet();
  }

  tickDead(dt) {
    this.deadT += dt;
    const p = this.player, b = p.body;
    b.vy -= 45 * dt; b.y += b.vy * dt; b.x += b.vx * dt;
    p.kong.root.rotation.z += dt * 7 * -b.face;
    p.snap();
    p.kong.update({ face: b.face, vx: 0, vy: b.vy, ground: false, mode: 'move', attack: -1, throwing: -1, hurt: 1 }, dt, this.time);
    this.fx.update(dt);
    this.view.update(dt, this.fx, this.camera.x, this.camera.y);
    this.hud.fade(clamp((this.deadT - 1.1) / 0.8, 0, 1));
    if (this.deadT > 2.1) { this.hud.fade(0); this.respawnAfterDeath(); }
  }

  tickTransition(dt) {
    const tr = this.transition;
    tr.t += dt;
    if (tr.phase === 'out') {
      this.hud.fade(clamp(tr.t / 0.28, 0, 1));
      if (tr.t >= 0.28) {
        const p = tr.portal;
        this.loadRoom(p.to, { portal: p.at });
        this.player.invuln = Math.max(this.player.invuln, 0.6);
        this.continueClimb(tr.climbing);
        tr.phase = 'in'; tr.t = 0;
      }
    } else {
      this.hud.fade(1 - clamp(tr.t / 0.28, 0, 1));
      this.camera.update(dt, this.player.x, this.player.y, this.player.face, 0, this.aspect);
      this.view.update(dt, this.fx, this.camera.x, this.camera.y);
      if (tr.t >= 0.28) { this.hud.fade(0); this.transition = null; this.state = 'play'; this.input.clear(); }
    }
  }

  /** Keep climbing when a ladder/vine carries straight through a top/bottom portal. */
  continueClimb(wasClimbing) {
    const b = this.player.body;
    if (!wasClimbing) return;
    const cx = Math.floor(b.x);
    for (const dy of [0.3, 1.0]) {
      if (FLAGS[this.grid.tile(cx, Math.floor(b.y + dy))] & F_CLIMB) { b.mode = 'climb'; b.x = cx + 0.5; b.vx = 0; b.vy = 0; b.ground = false; return; }
    }
  }

  startEndCinematic(goal) {
    this.state = 'endcine';
    this.endT = 0;
    this.audio.sfx('item');
    this.audio.music('victory');
    this.camera.zoom = 0.75;
    this.fx.burst(goal.x, goal.y + 2.5, 80, { colors: [0xffe27a, 0xffffff, 0xff9a3a, 0x7aff9a], speed: 12, life: 2.0, size: 0.5, grav: 3 });
    this.hud.show(false);
  }

  tickEndCine(dt) {
    this.endT += dt;
    this.player.kong.update({ face: 1, vx: 0, vy: 0, ground: true, mode: 'move', attack: -1, throwing: -1, hurt: 0 }, dt, this.time);
    this.entities.forEach((e) => e.update && e.update(dt));
    this.camera.update(dt, this.player.x, this.player.y + 1.0, 1, 0, this.aspect);
    this.view.update(dt, this.fx, this.camera.x, this.camera.y);
    if (Math.random() < 0.35) this.fx.burst(this.player.x + (Math.random() - 0.5) * 10, this.player.y + 3 + Math.random() * 4, 14, { colors: [0xffe27a, 0xffffff, 0xff9a3a, 0x7aff9a, 0xff7ab0], speed: 7, life: 1.4, size: 0.4, grav: 5 });
    this.fx.update(dt);
    this.hud.fade(clamp((this.endT - 4.2) / 1.2, 0, 1));
    if (this.endT > 5.5) { this.camera.zoom = 1; this.hud.fade(0); this.startEnding(); }
  }

  tickEnding(dt) {
    this.view.update(dt, this.fx, this.camera.x, this.camera.y);
    this.fx.update(dt);
    this.camera.x += dt * 0.5; this.camera.apply(this.aspect, dt);
  }

  startEnding() {
    this.state = 'ending';
    this.persist();
    this.hud.show(false);
    this.menus.showEnding();
    this.audio.music('victory');
  }

  // ===================================================================== render
  render(alpha) {
    const gfx = this.gfx;
    this.fx.setScale((gfx.h * gfx.renderer.getPixelRatio()) / (2 * Math.tan((gfx.camera.fov * Math.PI) / 360)));
    for (const e of this.entities) if (e.render) e.render(alpha);
    if (this.player) this.player.render(this.state === 'dead' ? 1 : alpha);
    gfx.render();
  }

  // ===================================================================== testing hooks
  /** Compact JSON-safe view of the state, for tests. */
  snapshot() {
    const b = this.player.body;
    return {
      state: this.state, room: this.room && this.room.def.id, hp: this.save.hp, hpMax: this.save.hpMax, bananas: this.save.bananas,
      x: +b.x.toFixed(2), y: +b.y.toFixed(2), vx: +b.vx.toFixed(2), vy: +b.vy.toFixed(2), mode: b.mode, ground: b.ground, face: b.face,
      abil: { ...this.save.abilities }, entities: this.entities.length, boss: this.boss ? { hp: this.boss.hp, state: this.boss.stateName } : null,
      cam: [+this.camera.x.toFixed(1), +this.camera.y.toFixed(1)],
    };
  }

  /** Advance n fixed steps synchronously (used by headless tests). */
  stepFrames(n, scripted) {
    if (scripted) this.input.scripted = scripted;
    for (let i = 0; i < n; i++) this.tick(STEP);
    this.input.scripted = null;
    this.render(1);
  }
}
