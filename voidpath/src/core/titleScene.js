// Title backdrop: the four travelers on the ISV Halcyon's observation deck, gazing out through the
// panoramic window at the ringed gas giant. Planet light pours through the glass (strut shadows on
// the deck, light shafts, dust), a cyan bounce and an amber work lamp rim the sprites, and the camera
// eases in, then drifts. After a clear the window shows Ione at dawn instead (setDawn). TitleState
// wraps it for the game: ui.title over it (Continue / New Journey / Load), 'title' music.
//
// export class TitleScene { constructor(engine); warm() -> Promise; setDawn(on); reset(); update(dt, t) }
// export class TitleState { constructor(ctx, view); enter({ deferUI }); showUI(); exit(); update(dt, t) }
// export function hasCleared() -> bool   voidpath.cleared in localStorage, else the latest save's summary

import * as THREE from 'three';
import { SpriteActor } from './spriteActor.js';
import { Particles } from './particles.js';
import { makeGlow, makeLightShaft, makeFlicker, updateVfx } from './vfx.js';
import { makeMaterial, textureSet, setTextureFrame } from '../art/tiles.js';
import { buildBattleSprite, PARTY_IDS } from '../art/characters.js';
import { makeCanvas } from '../art/painter.js';
import { clamp, ease, lerp } from './util.js';
import { latestSlot, readSlot, isCleared } from './save.js';

const FOV = 30;
const WALL_Z = -6;
const SILL = 0.75;                     // low wall under the glass
const GLASS_TOP = 11;
const HEADER_TOP = GLASS_TOP + 3;      // pipe run above the glass
const X0 = -14, X1 = 16, DECK_Z1 = 24;
// window struts per layout (they frame the view; lamps hang on the first and last)
const STRUTS_WIDE = [-9.6, 0.4, 9.4];
const STRUTS_TALL = [-3.3, 4.3, 11];

// space_backdrop (1024x512) shown mirrored so the planet sits on the left: planet centre at texel
// (1024 - 690, 262), radius 132 texels. The painting hangs far away, so camera drift barely moves it.
const SPACE_DIST = 90;
const PLANET_U = 1 - 690 / 1024, PLANET_V = 262 / 512, PLANET_R = 132 / 1024;

// Formations [x, z] in PARTY_IDS order (kade, nyx, orion, sera): a staggered line facing the planet
// (left) on wide screens, a tighter cluster on portrait phones.
const WIDE = [[1.75, 1.0], [2.8, 0.1], [3.85, -0.8], [4.85, -1.7]];
const TALL = [[-0.8, 0.9], [0.0, 0.2], [0.8, -0.5], [1.55, -1.2]];

// Where the planet sits on screen ([x, y] from the top-left, 0..1) and its angular radius (degrees).
const PLANET_WIDE = { x: 0.18, y: 0.44, r: 6.7 };
const PLANET_TALL = { x: 0.38, y: 0.19, r: 4.2 };
// Ione at dawn (bd_ione_dawn, 2:1): its centre on screen and its angular width (degrees)
const DAWN_WIDE = { x: 0.3, y: 0.42, w: 64 };
const DAWN_TALL = { x: 0.5, y: 0.24, w: 50 };
// the planet light shadow map per quality (shadows are off on low)
const SHADOW_SIZE = { low: 512, medium: 1024, high: 2048 };

/** A completed journey: the title then shows Ione at dawn. */
export function hasCleared() {
  if (isCleared()) return true;
  const slot = latestSlot();
  return !!(slot && readSlot(slot)?.summary?.cleared);
}

const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();

/** Faint diagonal glare streaks for the glass (pixel-art lines, mostly transparent). */
function glareCanvas() {
  const W = 128, H = 128;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const streak = (x0, width, alpha) => {
    for (let y = 0; y < H; y++) {
      for (let w = 0; w < width; w++) {
        const x = (x0 + w + Math.floor(y * 0.7)) % W;
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = alpha;
      }
    }
  };
  streak(10, 3, 30);
  streak(18, 1, 22);
  streak(70, 2, 18);
  g.putImageData(img, 0, 0);
  return c;
}

export class TitleScene {
  constructor(engine) {
    this.engine = engine;
    this.scene = new THREE.Scene();
    this.scene.userData.perf = false;      // the title never triggers an automatic quality drop
    this.scene.background = new THREE.Color('#03050c');
    this.scene.fog = new THREE.FogExp2('#08142c', 0.02);
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.3, 200);
    this.animated = [];
    this.time = 0;
    this.intro = 0;
    this.dawn = false;
    this.fx = {
      tiltShift: { enabled: true, focusY: 0.34, band: 0.2, falloff: 0.36, maxBlur: 0.85 },
      bloom: { enabled: true, strength: 1.0, radius: 0.62, threshold: 0.76 },
      grade: {
        enabled: true, exposure: 1.06, contrast: 1.1, saturation: 1.1, vignette: 0.5, vignetteSoftness: 0.55, grain: 0.035,
        aberration: 0.0018, shadowTint: [0.9, 0.97, 1.1], highlightTint: [1.07, 1.0, 0.9],
      },
    };
    this._buildDeck();
    this._buildWindow();
    this._buildSpace();
    this._buildLights();
    this._buildParty();
    this.particles = new Particles(this.scene, { max: engine.quality === 'low' ? 500 : 900 });
    this.particles.addEmitter('dust', { position: [1.5, 2.2, -1.5], area: [16, 4.4, 9], rate: 13, color: '#cfe4ff' });
    this.particles.addEmitter('dust', { position: [5.6, 1.6, 2.4], area: [3, 2.4, 3], rate: 4, color: '#ffd9a8' });
    for (let i = 0; i < 90; i++) this.particles.update(0.1);
    this.reset();
  }

  // ------------------------------------------------------------------ build

  _buildDeck() {
    const s = this.scene;
    const w = X1 - X0, d = DECK_Z1 - WALL_Z - 1;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), makeMaterial('floor_bridge', {
      repeat: [w, d], emissiveIntensity: 0.14, roughness: 0.38, metalness: 0.35,
    }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((X0 + X1) / 2, 0, WALL_Z + 1 + d / 2);
    floor.receiveShadow = true;
    s.add(floor);
    // hazard band along the glass
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w, 1), makeMaterial('floor_hazard', { repeat: [w, 1] }));
    band.rotation.x = -Math.PI / 2;
    band.position.set((X0 + X1) / 2, 0, WALL_Z + 0.5);
    band.receiveShadow = true;
    s.add(band);
  }

  _wallRun(name, y, h) {
    const w = X1 - X0;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), makeMaterial(name, { repeat: [w, 1] }));
    mesh.position.set((X0 + X1) / 2, y + h / 2, WALL_Z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  _buildWindow() {
    const s = this.scene;
    this._wallRun('wall_low', 0, SILL);
    this._wallRun('wall_pipes', GLASS_TOP, HEADER_TOP - GLASS_TOP);
    // dark hull above the header: space only shows through the glass
    const hull = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ color: '#03050c', fog: false }));
    hull.position.set(0, HEADER_TOP + 30 - 0.01, WALL_Z - 0.05);
    s.add(hull);

    // panoramic glass: slim struts, a top and bottom frame, faint glare on the pane
    const metal = new THREE.MeshStandardMaterial({ color: '#2b3448', roughness: 0.45, metalness: 0.6 });
    const glassH = GLASS_TOP - SILL;
    const strutGeo = new THREE.BoxGeometry(0.28, glassH, 0.42);
    const fixMat = makeMaterial('ceiling_lamp', { emissiveIntensity: 2.6 });
    this.struts = STRUTS_WIDE.map((x, i) => {
      const strut = new THREE.Mesh(strutGeo, metal);
      strut.position.set(x, SILL + glassH / 2, WALL_Z + 0.05);
      strut.castShadow = true;
      strut.receiveShadow = true;
      s.add(strut);
      if (i !== 1) {
        // amber work lamp on the strut
        const fix = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), fixMat);
        fix.position.set(0, 2.5 - SILL - glassH / 2, 0.23);
        const g = makeGlow('#ffbf4d', 1.1, 1.1);
        g.position.set(0, 2.5 - SILL - glassH / 2, 0.31);
        strut.add(fix, g);
      }
      return strut;
    });
    for (const [y, h] of [[GLASS_TOP - 0.12, 0.24], [SILL + 0.06, 0.12]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, h, 0.5), metal);
      bar.position.set((X0 + X1) / 2, y, WALL_Z + 0.08);
      bar.castShadow = true;
      bar.receiveShadow = true;
      s.add(bar);
    }
    const glareTex = new THREE.CanvasTexture(glareCanvas());
    glareTex.magFilter = glareTex.minFilter = THREE.NearestFilter;
    glareTex.generateMipmaps = false;
    glareTex.wrapS = glareTex.wrapT = THREE.RepeatWrapping;
    glareTex.repeat.set((X1 - X0) / 4, glassH / 4);
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, glassH), new THREE.MeshBasicMaterial({
      map: glareTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    glare.position.set((X0 + X1) / 2, SILL + glassH / 2, WALL_Z - 0.02);
    s.add(glare);

    // consoles at the glass, screens animated
    const top = makeMaterial('console_top');
    for (const [x, ry] of [[-5.2, 0.12], [8.6, -0.1]]) {
      const front = makeMaterial('console_front', { emissiveIntensity: 2.4 });
      this.animated.push({ set: front.userData.set, fps: front.userData.set.fps, phase: x });
      const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.7), [metal, metal, top, metal, front, metal]);
      c.position.set(x, 0.5, WALL_Z + 1.9);
      c.rotation.y = ry;
      c.castShadow = true;
      c.receiveShadow = true;
      s.add(c);
    }
  }

  _buildSpace() {
    const s = this.scene;
    const set = textureSet('space_backdrop');
    set.map.repeat.x = -1;     // mirrored: the planet on the left, open space toward the travelers
    set.map.offset.x = 1;
    this._spaceMap = set.map;
    this.space = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: set.map, fog: false, color: new THREE.Color(0.9, 0.9, 0.95) }));
    s.add(this.space);
    // volumetric light falling through the glass toward the deck (and the travelers)
    for (const [x, lean, w] of [[-8, 0.42, 1.7], [-4, 0.36, 1.5], [0, 0.4, 1.9], [4, 0.32, 1.5], [8, 0.38, 1.7]]) {
      const shaft = makeLightShaft({ width: w, height: 12, color: '#a8d4ff', opacity: 0.11, floorFade: 1.2 });
      shaft.position.set(x, 7, WALL_Z + 0.3);
      shaft.rotation.set(-0.6, 0, lean);
      s.add(shaft);
    }
  }

  _buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#3c5288', '#05070e', 0.75));
    // planet light through the window: the one shadow caster
    const sun = new THREE.DirectionalLight('#a9c8ff', 1.8);
    sun.position.set(-7, 9, -13);
    sun.target.position.set(1.5, 0, 0);
    sun.castShadow = true;
    this._shadowQ = this.engine.quality;
    sun.shadow.mapSize.setScalar(SHADOW_SIZE[this._shadowQ] || 1024);
    this.sun = sun;
    Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 50 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    s.add(sun, sun.target);
    // cool bounce from the glass rims the travelers' faces; an amber work lamp warms them from the right
    this.rim = new THREE.PointLight('#7fd8ff', 22, 10, 1.6);
    s.add(this.rim);
    const fill = new THREE.DirectionalLight('#9fc4ff', 0.4);
    fill.position.set(2, 3, 12);
    s.add(fill);
    const lamp = new THREE.PointLight('#ffb45a', 36, 13, 1.6);
    lamp.position.set(7.4, 2.2, 3.6);
    s.add(lamp);
    const lampGlow = makeGlow('#ffb45a', 0.9, 0.8);
    lampGlow.position.copy(lamp.position);
    s.add(lampGlow);
    makeFlicker(lamp, { mode: 'pulse', amount: 0.12, speed: 1.3, glow: lampGlow });
  }

  _buildParty() {
    this.party = PARTY_IDS.map((id, i) => {
      const actor = new SpriteActor(buildBattleSprite(id), { tilt: 0.14, emissiveIntensity: 0.9 });
      actor.play('idle');
      actor.update(i * 0.37);   // out of step with each other
      this.scene.add(actor.object3d);
      return actor;
    });
  }

  // ------------------------------------------------------------------ frame

  /** Restart the slow push-in (called when the title is entered). */
  reset() {
    this.intro = 0;
    this._layout();
  }

  /** Compile every program for the composer's render target now, so the first title frame does not hitch. */
  warm() {
    return this.engine.compileScene(this.scene, this.camera);
  }

  /** Ione at dawn through the glass (after a clear) instead of the ringed giant. */
  setDawn(on) {
    if (this.dawn === !!on) return;
    this.dawn = !!on;
    const mat = this.space.material;
    mat.map = on ? (this._dawnMap ||= textureSet('bd_ione_dawn').map) : this._spaceMap;
    mat.color.setScalar(on ? 1 : 0.92);
    mat.needsUpdate = true;
    // dawn light: a warm low sun through the glass, a rose rim on the travelers
    this.sun.color.set(on ? '#ffc8a4' : '#a9c8ff');
    this.rim.color.set(on ? '#ffb8c8' : '#7fd8ff');
    this._placeSpace();
  }

  _layout() {
    const aspect = this.engine.size.aspect || 16 / 9;
    this._aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // 0 = landscape, 1 = narrow portrait
    const k = clamp((1.3 - aspect) / 0.8, 0, 1);
    this._k = k;
    this.party.forEach((a, i) => {
      a.object3d.position.set(lerp(WIDE[i][0], TALL[i][0], k), 0, lerp(WIDE[i][1], TALL[i][1], k));
    });
    // the cool rim light stands just ahead of the front traveler, toward the planet
    const front = this.party[0].object3d.position;
    this.rim.position.set(front.x - 2.3, 2.2, front.z + 0.9);
    this.struts.forEach((m, i) => { m.position.x = lerp(STRUTS_WIDE[i], STRUTS_TALL[i], k); });
    this._fit();
    this._pose(0, 0);
    this._placeSpace();
    // tilt-shift band on the travelers; portrait screens see more depth, so blur them more gently
    const ts = this.fx.tiltShift;
    const lead = this.party[1].object3d.position;
    ts.focusY = clamp((_v.set(lead.x, 0.8, lead.z).project(this.camera).y + 1) / 2, 0.2, 0.6);
    ts.band = lerp(0.2, 0.27, k);
    ts.maxBlur = lerp(0.85, 0.55, k);
    if (this.engine.scene === this.scene) this.engine.setFx(this.fx);
  }

  update(dt, t) {
    if (this.engine.size.aspect !== this._aspect) this._layout();
    if (this.engine.quality !== this._shadowQ) this._resizeShadow();
    this.time += dt;
    this.intro = Math.min(1, this.intro + dt / 5);
    for (const a of this.party) a.update(dt);
    for (const a of this.animated) setTextureFrame(a.set, (t + a.phase) * a.fps);
    this.particles.update(dt);
    this._pose(this.time, 1 - ease.outCubic(this.intro));
  }

  /** Camera at drift time `tt`, `push` (1..0) of the way back along the opening push-in. */
  _pose(tt, push) {
    const k = this._k;
    const D = this._D + push * 2.2;
    const tx = this._tx + Math.sin(tt * 0.11) * 0.25;
    const ty = lerp(1.45, 1.6, k) + Math.sin(tt * 0.07 + 1) * 0.05;
    const tz = lerp(-0.5, -0.4, k);
    const yaw = 0.05 + Math.sin(tt * 0.05) * 0.03;
    const pitch = -0.05 + push * 0.06;
    const cam = this.camera;
    cam.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * D, ty + Math.sin(pitch) * D, tz + Math.cos(yaw) * Math.cos(pitch) * D);
    cam.lookAt(tx, ty, tz);
    cam.updateMatrixWorld();
  }

  /**
   * Solve the resting camera distance and target so the travelers fill a screen span: right of
   * centre on wide screens (the planet owns the left), nearly full width on phones. A few rounds of
   * project-and-correct handle the perspective of the staggered line.
   */
  _fit() {
    const k = this._k;
    const s0 = lerp(0.55, 0.06, k), s1 = lerp(0.97, 0.94, k);
    const dMin = lerp(8.6, 9, k);
    this._D = dMin;
    this._tx = 2;
    for (let i = 0; i < 4; i++) {
      this._pose(0, 0);
      let lo = Infinity, hi = -Infinity;
      for (const a of this.party) {
        const p = a.object3d.position;
        for (const dx of [-0.6, 0.6]) {
          const x = (_v.set(p.x + dx, 0.8, p.z).project(this.camera).x + 1) / 2;
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
        }
      }
      const scale = (hi - lo) / (s1 - s0);
      const target = this._D * scale < dMin ? (s0 + s1) / 2 - (hi - lo) / 2 : s0;
      // world units per screen width at the group's depth
      const unitsPerScreen = 2 * this._D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * this._aspect;
      this._tx += (lo - target) * unitsPerScreen;
      this._D = Math.max(dMin, this._D * scale);
    }
  }

  _resizeShadow() {
    this._shadowQ = this.engine.quality;
    const sh = this.sun.shadow;
    sh.mapSize.setScalar(SHADOW_SIZE[this._shadowQ] || 1024);
    sh.map?.dispose();
    sh.map = null;
  }

  /** Hang the painted planet (or Ione's dawn) far away at the layout's screen spot and size. */
  _placeSpace() {
    if (this.dawn) {
      this._placeDawn();
      return;
    }
    const p = this._k > 0.5 ? PLANET_TALL : PLANET_WIDE;
    const cam = this.camera;
    _dir.set(p.x * 2 - 1, 1 - p.y * 2, 0.5).unproject(cam).sub(cam.position).normalize();
    const W = (SPACE_DIST * Math.tan(THREE.MathUtils.degToRad(p.r))) / PLANET_R;
    const sp = this.space;
    sp.scale.set(W / 2, W / 2, 1);
    sp.position.copy(cam.position).addScaledVector(_dir, SPACE_DIST);
    sp.lookAt(_v.copy(cam.position));
    // shift the plane so the planet texel (not the plane centre) lands on the ray
    sp.translateX(-(PLANET_U - 0.5) * W);
    sp.translateY(-(0.5 - PLANET_V) * (W / 2));
  }

  _placeDawn() {
    const p = this._k > 0.5 ? DAWN_TALL : DAWN_WIDE;
    const cam = this.camera;
    _dir.set(p.x * 2 - 1, 1 - p.y * 2, 0.5).unproject(cam).sub(cam.position).normalize();
    const W = 2 * SPACE_DIST * Math.tan(THREE.MathUtils.degToRad(p.w / 2));
    const sp = this.space;
    sp.scale.set(W / 2, W / 2, 1);
    sp.position.copy(cam.position).addScaledVector(_dir, SPACE_DIST);
    sp.lookAt(_v.copy(cam.position));
  }
}

/** The 'title' game state: the backdrop above with ui.title over it. */
export class TitleState {
  constructor(ctx, view) {
    this.ctx = ctx;
    this.view = view;
  }

  /**
   * params.deferUI: leave the title overlay hidden until showUI() (the boot screen or the fade back
   * to the title is still running, so no press can act before the title is visible).
   */
  enter(params = {}) {
    const { engine, ui, audio, input } = this.ctx;
    this.view.setDawn(hasCleared());
    this.view.reset();
    engine.setView(this.view.scene, this.view.camera);
    engine.setFx(this.view.fx);
    ui.dialog.clear();
    if (ui.menu.isOpen) ui.menu.close();
    // neither the pause menu nor battle buttons may appear over the title or the New Journey iris
    input.setContext('title');
    ui.menuEnabled = false;
    ui.hud.setPrompt(null);
    ui.hud.setDanger(0);
    ui.hud.setVisible(false);
    audio.music('title');
    if (!params.deferUI) this.showUI();
  }

  showUI() {
    const { ui, game } = this.ctx;
    ui.title.show({
      hasSave: !!latestSlot(),
      onStart: () => { game.newJourney(); },
      // a refused Continue (no readable save) keeps the title up instead of hiding it for nothing
      onContinue: () => {
        if (!latestSlot()) return false;
        game.continue().then((ok) => { if (!ok && game.name === 'title' && !ui.title.isOpen) this.showUI(); });
        return undefined;
      },
      onLoad: () => { game.loadMenu(); },
    });
  }

  exit() {
    this.ctx.ui.title.hide();
  }

  update(dt, t) {
    updateVfx(dt, t);
    this.view.update(dt, t);
  }
}
