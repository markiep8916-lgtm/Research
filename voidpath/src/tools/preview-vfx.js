// VFX preview: lit SpriteActors (flip, aura, hologram, hit flash, dithered fade), every particle
// preset, light shafts, glows and light flicker in a small diorama. Keys 1-4 switch camera views,
// Space pauses the orbiting lights. window.__PREVIEW.setView(name) does the same for tests.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Painter, packSheet, makeNormalMap, makeEmissiveMap, toTexture, parseColor } from '../art/painter.js';
import { RAMPS, GLOW, OUTLINE } from '../art/palette.js';
import { injectCSS, el } from '../core/util.js';
import { SpriteActor } from '../core/spriteActor.js';
import { Particles, PARTICLE_PRESETS } from '../core/particles.js';
import { makeGlow, makeLightShaft, makeFlicker, updateVfx } from '../core/vfx.js';

// ---------------------------------------------------------------- stand-in pixel art

const N = RAMPS.navy, ST = RAMPS.steel, GM = RAMPS.gunmetal, CR = RAMPS.crimson, HW = RAMPS.hairWhite;
const GLOWS = new Set([GLOW.amber, '#fff3cf', GLOW.cyan, '#e6fffb', GLOW.red, '#ff9b6a', '#ffd9a8'].map((c) => parseColor(c).slice(0, 3).join(',')));
const isGlow = (c) => GLOWS.has(`${c[0]},${c[1]},${c[2]}`);

/** Thick pixel limb: stamps discs along a segment. */
function limb(p, x0, y0, x1, y1, r, c) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
  }
}

function boot(p, fx, fy, dark) {
  const c = dark ? GM[2] : GM[3], hi = dark ? GM[3] : GM[4];
  p.rect(fx - 1, fy - 2, 3, 1, c);
  p.rect(fx - 2, fy - 1, 5, 1, c);
  p.rect(fx - 2, fy, 6, 1, GM[1]);
  p.px(fx, fy - 2, hi);
}

/** 32x48 side-view scout facing right. pose: { bob, near: [kx,ky,fx,fy], far: [...], arm (-1 back..1 fwd), scarf } */
function drawScout(pose) {
  const p = new Painter(32, 48);
  const b = pose.bob;
  const arm = (s, dark) => {
    const sx = 16, sy = 21 + b;
    const ex = sx + s * 1.5, ey = 25 + b;
    const hx = sx + s * 3.5, hy = 29 + b - Math.abs(s);
    limb(p, sx, sy, ex, ey, 1.4, dark ? ST[2] : ST[4]);
    limb(p, ex, ey, hx, hy, 1.4, dark ? N[1] : N[3]);
    p.rect(Math.round(hx) - 1, Math.round(hy), 2, 2, dark ? ST[3] : ST[5]);
  };
  const leg = (L, dark) => {
    const hx = dark ? 14 : 16, hy = 31 + b;
    limb(p, hx, hy, L[0], L[1], 1.9, dark ? GM[1] : GM[3]);
    limb(p, L[0], L[1], L[2], L[3] - 2, 1.7, dark ? N[1] : N[3]);
    p.px(Math.round(L[0]), Math.round(L[1]), dark ? ST[3] : ST[5]); // knee pad
    boot(p, Math.round(L[2]), Math.round(L[3]), dark);
  };
  arm(-pose.arm, true);
  leg(pose.far, true);
  // backpack with status LEDs
  p.rect(8, 20 + b, 4, 9, GM[2]);
  p.rect(8, 20 + b, 4, 1, GM[4]);
  p.px(9, 22 + b, GLOW.cyan);
  p.px(9, 24 + b, GLOW.cyan);
  // torso plate
  p.poly([[11, 19 + b], [20, 19 + b], [21.5, 23 + b], [20.5, 31 + b], [12, 32 + b], [10.5, 27 + b]], N[3]);
  p.rect(17, 20 + b, 3, 6, N[4]);
  p.px(18, 21 + b, N[5]);
  p.rect(11, 27 + b, 9, 1, N[2]);
  leg(pose.near, false);
  // belt + buckle light
  p.rect(11, 30 + b, 10, 2, GM[2]);
  p.px(19, 30 + b, GLOW.amber);
  // scarf, tail fluttering behind
  p.rect(12, 17 + b, 9, 3, CR[2]);
  p.hline(12, 20, 17 + b, CR[3]);
  const sw = pose.scarf;
  p.rect(8, 18 + b + sw, 4, 2, CR[2]);
  p.rect(5, 19 + b + sw * 2, 4, 2, CR[1]);
  p.px(4, 20 + b + sw * 2, CR[1]);
  // hair tuft under the helmet
  p.rect(9, 12 + b, 3, 5, HW[2]);
  p.px(10, 16 + b, HW[3]);
  // helmet
  p.ellipse(16.5, 11.5 + b, 6.5, 6.4, N[3]);
  p.ellipse(15.5, 9.5 + b, 4.5, 3.4, N[4]);
  p.hline(13, 17, 6 + b, N[5]);
  p.rect(10, 14 + b, 4, 3, N[2]);
  // antenna with a warm tip LED
  p.line(12, 6 + b, 10, 2 + b, ST[4]);
  p.px(10, 1 + b, GLOW.amber);
  // visor
  p.hline(18, 22, 10 + b, GLOW.amber);
  p.hline(17, 23, 11 + b, GLOW.amber);
  p.hline(19, 22, 11 + b, '#fff3cf');
  p.hline(18, 22, 12 + b, GLOW.amber);
  p.hline(18, 22, 13 + b, GM[1]);
  // shoulder pad
  p.ellipse(16.5, 21 + b, 3.4, 2.4, N[4]);
  p.hline(15, 18, 19 + b, N[5]);
  arm(pose.arm, false);
  p.rimShade({ skip: isGlow });
  p.outline(OUTLINE);
  return p;
}

function scoutSheet() {
  const idleL = { near: [16.5, 38, 17, 46], far: [14, 38, 13, 46] };
  const poses = [
    { bob: 0, arm: 0, scarf: 0, ...idleL },
    { bob: 1, arm: 0, scarf: 1, ...idleL },
    { bob: 0, arm: -1, scarf: 0, near: [18.5, 37, 20, 46], far: [13, 38, 11, 46] },
    { bob: -1, arm: 0, scarf: 1, near: [16, 38, 16, 46], far: [17, 36, 14, 42] },
    { bob: 0, arm: 1, scarf: 0, near: [13, 38, 11, 46], far: [18.5, 37, 20, 46] },
    { bob: -1, arm: 0, scarf: 1, near: [17, 36, 14, 42], far: [16, 38, 16, 46] },
  ];
  const frames = poses.map(drawScout);
  const s = packSheet(frames, 6);
  return {
    canvas: s.canvas,
    normal: makeNormalMap(s.painter, { frameW: 32, frameH: 48 }).canvas,
    emissive: makeEmissiveMap(s.painter, isGlow).canvas,
    frameW: 32, frameH: 48, cols: s.cols, rows: s.rows, count: s.count,
    anims: {
      idle_side: { frames: [0, 1], fps: 2, loop: true },
      walk_side: { frames: [2, 3, 4, 5], fps: 8, loop: true },
    },
    pxPerUnit: 32,
    facing: 'right',
  };
}

/** 64x64 heavy trooper with an arm cannon and a reactor core, drawn facing right then mirrored (battle sprites face left). */
function drawHeavy(bob, core) {
  const p = new Painter(64, 64);
  const b = bob;
  // far leg + far arm
  limb(p, 29, 43 + b, 26, 52, 3.4, GM[1]);
  limb(p, 26, 52, 25, 59, 3, GM[2]);
  p.rect(20, 59, 10, 3, GM[1]);
  p.rect(20, 62, 11, 1, GM[0]);
  limb(p, 23, 30 + b, 20, 37 + b, 2.6, ST[2]);
  p.ellipse(19.5, 40 + b, 3, 2.6, ST[3]);
  // exhaust pack
  p.rect(14, 25 + b, 7, 13, GM[2]);
  p.rect(14, 25 + b, 7, 1, GM[4]);
  for (let i = 0; i < 3; i++) p.hline(15, 19, 28 + b + i * 3, '#ff9b6a');
  // chest
  p.poly([[21, 23 + b], [42, 23 + b], [46, 30 + b], [43.5, 43 + b], [24, 44 + b], [19.5, 34 + b]], ST[3]);
  p.poly([[25, 25 + b], [41, 25 + b], [43, 30 + b], [41, 39 + b], [27, 40 + b]], ST[4]);
  p.hline(27, 40, 26 + b, ST[5]);
  p.rect(24, 41 + b, 19, 3, GM[2]);
  // reactor core
  p.circle(35.5, 33.5 + b, 4, GM[1]);
  p.circle(35.5, 33.5 + b, 3, GLOW.cyan);
  p.circle(35.5, 33.5 + b, core ? 2 : 1.4, '#e6fffb');
  // near leg
  limb(p, 35, 44 + b, 37, 52, 3.6, GM[3]);
  limb(p, 37, 52, 38, 58, 3.2, ST[3]);
  p.ellipse(37.5, 51.5, 2.6, 2.2, ST[5]);
  p.rect(33, 58, 11, 4, GM[3]);
  p.hline(33, 43, 58, GM[4]);
  p.rect(33, 62, 12, 1, GM[1]);
  // helmet
  p.ellipse(33.5, 16.5 + b, 6.5, 6.5, ST[3]);
  p.ellipse(32.5, 14.5 + b, 4.5, 3.5, ST[4]);
  p.hline(30, 35, 11 + b, ST[5]);
  p.hline(34, 40, 16 + b, GLOW.cyan);
  p.hline(35, 39, 17 + b, GLOW.cyan);
  p.hline(36, 38, 16 + b, '#e6fffb');
  p.rect(29, 20 + b, 9, 3, GM[2]);
  // near pauldron with hazard stripes
  p.ellipse(40.5, 26 + b, 7, 5, ST[4]);
  p.ellipse(40.5, 24.5 + b, 5.5, 3, ST[5]);
  for (let x = 36; x <= 45; x += 3) p.line(x, 29 + b, x + 2, 27 + b, RAMPS.amber[3]);
  // arm cannon
  limb(p, 42, 30 + b, 44, 35 + b, 2.6, GM[3]);
  p.rect(39, 34 + b, 17, 7, GM[3]);
  p.rect(39, 34 + b, 17, 2, GM[4]);
  p.rect(41, 39 + b, 13, 2, GM[2]);
  p.rect(55, 35 + b, 2, 5, GM[1]);
  p.rect(57, 36 + b, 1, 3, '#ffd9a8');
  p.px(46, 36 + b, GLOW.red);
  p.px(48, 36 + b, GLOW.red);
  p.rimShade({ skip: isGlow });
  p.outline(OUTLINE);
  return p.flippedX();
}

function heavySheet() {
  const frames = [drawHeavy(0, true), drawHeavy(0, false), drawHeavy(1, false), drawHeavy(1, true)];
  const s = packSheet(frames, 4);
  return {
    canvas: s.canvas,
    normal: makeNormalMap(s.painter, { frameW: 64, frameH: 64 }).canvas,
    emissive: makeEmissiveMap(s.painter, isGlow).canvas,
    frameW: 64, frameH: 64, cols: s.cols, rows: s.rows, count: s.count,
    anims: { idle: { frames: [0, 1, 2, 3], fps: 3, loop: true } },
    pxPerUnit: 32,
    facing: 'left',
  };
}

function floorTile() {
  const p = new Painter(64, 64);
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      const x = tx * 32, y = ty * 32;
      const worn = tx !== ty;
      p.rect(x, y, 32, 32, worn ? '#1b2131' : ST[1]);
      p.noise(x + 1, y + 1, 30, 30, [ST[0], GM[2], ST[2]], 0.07, 11 + tx * 3 + ty * 7);
      p.hline(x, x + 31, y, GM[0]);
      p.vline(x, y, y + 31, GM[0]);
      p.hline(x + 1, x + 31, y + 1, ST[2]);
      p.vline(x + 1, y + 1, y + 31, ST[2]);
      for (const [rx, ry] of [[4, 4], [27, 4], [4, 27], [27, 27]]) {
        p.px(x + rx, y + ry, ST[4]);
        p.px(x + rx + 1, y + ry + 1, GM[0]);
      }
      if (!worn) p.rect(x + 10, y + 14, 12, 4, GM[2]).hline(x + 10, x + 21, y + 14, GM[1]);
    }
  }
  return p;
}

function wallTile() {
  const p = new Painter(32, 96);
  p.rect(0, 0, 32, 96, GM[1]);
  p.gradientV(1, 8, 30, 70, [GM[2], GM[1], GM[0]]);
  p.hline(0, 31, 8, GM[3]);
  p.hline(0, 31, 78, GM[3]);
  p.rect(0, 79, 32, 17, GM[2]);
  p.hline(0, 31, 80, GM[4]);
  p.vline(0, 8, 78, GM[0]);
  for (let y = 14; y < 74; y += 20) { p.px(4, y, GM[4]); p.px(27, y, GM[4]); }
  p.rect(0, 0, 32, 4, GM[3]);
  p.hline(0, 31, 4, GM[0]);
  p.rect(6, 86, 20, 2, GM[0]);
  return p;
}

function windowTex() {
  const p = new Painter(48, 64);
  p.gradientV(0, 0, 48, 64, ['#060a1a', '#0b1530', '#162453', '#2a1b4f']);
  p.noise(0, 0, 48, 64, ['#c8f3ff', '#ffffff', '#9fd8ff'], 0.02, 5);
  // gas giant limb with rings
  p.ellipse(40, 70, 30, 26, '#c97a4a');
  p.ellipse(40, 70, 28, 24, '#e8a46a');
  p.ellipse(44, 74, 26, 22, '#b25a17');
  p.line(0, 52, 47, 40, '#ffd98a');
  p.line(0, 53, 47, 41, '#b2c2d4');
  p.rectOutline(0, 0, 48, 64, ST[3]);
  p.rectOutline(1, 1, 46, 62, GM[1]);
  p.vline(24, 1, 62, ST[3]);
  p.hline(1, 46, 32, ST[3]);
  return p;
}

// ---------------------------------------------------------------- renderer + post

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#05070d');
scene.fog = new THREE.FogExp2('#070b16', 0.028);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 120);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.55, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(innerWidth, innerHeight);

// ---------------------------------------------------------------- diorama

const floorMap = toTexture(floorTile(), { repeat: [12, 7] });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.7, metalness: 0.35 }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, 0.5);
floor.receiveShadow = true;
scene.add(floor);

const wallMap = toTexture(wallTile(), { repeat: [24, 1] });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 3), new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.8, metalness: 0.3 }));
wall.position.set(0, 1.5, -4.5);
wall.receiveShadow = true;
scene.add(wall);

const winTex = toTexture(windowTex());
for (const x of [-3, 3]) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), new THREE.MeshBasicMaterial({ map: winTex, color: new THREE.Color(1.6, 1.6, 1.8) }));
  w.position.set(x, 1.6, -4.48);
  scene.add(w);
  const shaft = makeLightShaft({ width: 1.2, height: 6.5, color: '#9fd8ff' });
  shaft.position.set(x, 2.3, -4.4);
  shaft.rotation.set(-0.72, 0, 0.42);
  scene.add(shaft);
}

const hemi = new THREE.HemisphereLight('#3a4a70', '#0a0c14', 0.7);
scene.add(hemi);
const key = new THREE.DirectionalLight('#cfe0ff', 1.1);
key.position.set(-5, 10, 7);
key.target.position.set(0, 0, 0);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -13, right: 13, top: 9, bottom: -9, near: 1, far: 40 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;
scene.add(key, key.target);

// three coloured lights orbiting the actor row, each with a glow
const orbiters = [
  { color: '#ff3344', phase: 0 },
  { color: '#33d6ff', phase: (Math.PI * 2) / 3 },
  { color: '#ffaa33', phase: (Math.PI * 4) / 3 },
].map((o) => {
  const light = new THREE.PointLight(o.color, 6, 7, 2);
  const glow = makeGlow(o.color, 0.8, 1.1);
  scene.add(light, glow);
  return { ...o, light, glow };
});
makeFlicker(orbiters[1].light, { mode: 'pulse', amount: 0.45, speed: 2.4, glow: orbiters[1].glow });

// wall lamps: a failing amber work lamp and a red alarm strobe
function wallLamp(x, color, opts) {
  const light = new THREE.PointLight(color, 5, 6, 2);
  light.position.set(x, 2.3, -4.0);
  const glow = makeGlow(color, 1.1, 1.8);
  glow.position.copy(light.position);
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3) }));
  fixture.position.set(x, 2.3, -4.42);
  scene.add(light, glow, fixture);
  makeFlicker(light, { ...opts, glow });
}
wallLamp(7.5, '#ffb347', { mode: 'flicker', amount: 0.7, speed: 6 });
wallLamp(-7.5, '#ff3b4e', { mode: 'strobe', amount: 0.9, speed: 5 });

// ---------------------------------------------------------------- actors

const scout = scoutSheet();
const heavy = heavySheet();
const ROW_Z = -1.4;
const actors = [];
function addActor(sheet, x, label, setup) {
  const a = new SpriteActor(sheet);
  a.object3d.position.set(x, 0, ROW_Z);
  scene.add(a.object3d);
  setup(a);
  actors.push({ actor: a, label, pos: new THREE.Vector3(x, -0.25, ROW_Z) });
  return a;
}
addActor(scout, -5.2, 'walk', (a) => a.play('walk_side'));
addActor(scout, -3.8, 'walk flipX', (a) => { a.play('walk_side'); a.flipX = true; });
addActor(heavy, -1.6, 'boost aura x2', (a) => { a.play('idle'); a.setGlow('#ffb347', 2); });
const holo = addActor(scout, 0.6, 'hologram', (a) => { a.play('idle_side'); a.hologram = true; });
const flasher = addActor(scout, 2.2, 'hit flash', (a) => a.play('idle_side'));
addActor(scout, 3.7, 'opacity 0.5', (a) => { a.play('idle_side'); a.setOpacity(0.5); a.flipX = true; });
addActor(heavy, 5.9, 'target glow', (a) => { a.play('idle'); a.setGlow('#7fe3ff', 1); });
const flashColors = ['#ffffff', '#ff4fa3', '#ffe066'];
let flashIdx = 0;

// isolated rim-light test: the same idle frame, plain and flipped, each with a red light on its
// LEFT and a cyan light on its RIGHT at identical offsets (short range, so they do not overlap)
const rimScene = new THREE.Scene();
rimScene.background = new THREE.Color('#05070d');
rimScene.add(new THREE.HemisphereLight('#3a4a70', '#0a0c14', 0.25));
// soft key light from the upper left: the sprite silhouettes (antenna, legs) must show in the floor shadows
const rimKey = new THREE.DirectionalLight('#cfe0ff', 0.9);
rimKey.position.set(-2.5, 4, 1.2);
rimKey.castShadow = true;
rimKey.shadow.mapSize.set(1024, 1024);
Object.assign(rimKey.shadow.camera, { left: -4, right: 4, top: 3, bottom: -3, near: 0.5, far: 12 });
rimKey.shadow.bias = -0.0005;
rimKey.shadow.normalBias = 0.02;
rimScene.add(rimKey);
const rimFloor = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), floor.material);
rimFloor.rotation.x = -Math.PI / 2;
rimFloor.receiveShadow = true;
rimScene.add(rimFloor);
const rimActors = [-1.4, 1.4].map((x, i) => {
  const a = new SpriteActor(scout);
  a.setFrame(0);
  a.flipX = i === 1;
  a.object3d.position.set(x, 0, 0);
  rimScene.add(a.object3d);
  const red = new THREE.PointLight('#ff2a3a', 3, 1.5, 2);
  red.position.set(x - 0.75, 0.95, 0.35);
  const cyan = new THREE.PointLight('#2ad8ff', 3, 1.5, 2);
  cyan.position.set(x + 0.75, 0.95, 0.35);
  rimScene.add(red, cyan);
  return a;
});

// ---------------------------------------------------------------- particles

const particles = new Particles(scene, { max: 4000 });
particles.addEmitter('dust', { position: new THREE.Vector3(0, 1.6, 0), area: [20, 3.2, 10], rate: 9 });
const stations = [];
const CONT = {
  dust: { area: [1.2, 1.4, 1.2], rate: 6, y: 0.8 },
  spark: { burst: 14, rate: 1.4, area: [0.1, 0.1, 0.1], y: 0.9 },
  steam: { area: [0.15, 0.05, 0.15], rate: 9, y: 0.05 },
  frost: { area: [1, 1, 1], rate: 10, y: 0.7 },
  ember: { area: [0.5, 0.1, 0.5], rate: 9, y: 0.1 },
  holo: { area: [0.8, 0.8, 0.8], rate: 14, y: 0.6 },
  boost: { area: [0, 0, 0], rate: 16, y: 0.05 },
  heal: { area: [0, 0, 0], rate: 9, y: 0.1 },
  smoke: { area: [0.2, 0.05, 0.2], rate: 4, y: 0.05 },
};
PARTICLE_PRESETS.forEach((name, i) => {
  const x = -6.3 + (i % 8) * 1.8, z = i < 8 ? 1.3 : 3.3;
  const c = CONT[name];
  const pos = new THREE.Vector3(x, c ? c.y : 0.6, z);
  if (c) particles.addEmitter(name, { position: pos, ...c });
  stations.push({ name, pos, burst: !c, timer: 0.3 + (i % 8) * 0.17, label: name, labelPos: new THREE.Vector3(x, -0.05, z + 0.45) });
});

// ---------------------------------------------------------------- labels

injectCSS('preview-vfx', `
.pv-label { position: absolute; transform: translate(-50%, 0); font: 10px/1 var(--vp-font-pixel); letter-spacing: .08em;
  color: var(--vp-ink-dim); text-shadow: 0 1px 2px #000; white-space: nowrap; pointer-events: none; }
.pv-label.pv-actor { color: var(--vp-amber); }
.pv-help { position: absolute; left: 12px; top: 10px; font: 11px/1.5 var(--vp-font-ui); color: var(--vp-ink-faint); pointer-events: none; }
`);
const uiRoot = document.getElementById('ui-root');
uiRoot.appendChild(el('div', { class: 'pv-help vp-passthrough', text: 'VFX preview: 1 overview, 2 actors, 3 particles, 4 rim test, space pause lights' }));
const labels = [
  ...actors.map((a) => ({ el: el('div', { class: 'pv-label pv-actor vp-passthrough', text: a.label }), pos: a.pos })),
  ...stations.map((s) => ({ el: el('div', { class: 'pv-label vp-passthrough', text: s.label }), pos: s.labelPos })),
];
labels.forEach((l) => uiRoot.appendChild(l.el));

// ---------------------------------------------------------------- views

const VIEWS = {
  overview: { target: [0, 0.3, 0.7], dist: 21, pitch: 0.58 },
  actors: { target: [0.3, 0.9, -1.2], dist: 12.5, pitch: 0.52 },
  particles: { target: [0, 0.5, 2.3], dist: 13.5, pitch: 0.6 },
  rimtest: { target: [0, 0.8, 0], dist: 6.5, pitch: 0.45 },
  closeup: { target: [-2.6, 0.85, -1.4], dist: 6.5, pitch: 0.5 },
  shadows: { target: [-1, 0, -1.6], dist: 11, pitch: 1.15 },
  trio: { target: [2.2, 0.8, -1.4], dist: 5.5, pitch: 0.45 },
};
let view = 'overview';
let paused = false;
function setView(name) {
  const v = VIEWS[name];
  if (!v) return;
  view = name;
  renderPass.scene = name === 'rimtest' ? rimScene : scene;
  labels.forEach((l) => { l.el.hidden = name === 'rimtest'; });
  const [tx, ty, tz] = v.target;
  camera.position.set(tx, ty + Math.sin(v.pitch) * v.dist, tz + Math.cos(v.pitch) * v.dist);
  camera.lookAt(tx, ty, tz);
}
setView('overview');
addEventListener('keydown', (e) => {
  if (e.key === ' ') paused = !paused;
  const names = Object.keys(VIEWS);
  const i = Number(e.key) - 1;
  if (i >= 0 && i < names.length) setView(names[i]);
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- loop

const _p = new THREE.Vector3();
let last = performance.now();
let t = 0, lightT = 0, flashTimer = 0.4;
function placeLights() {
  orbiters.forEach((o, i) => {
    const a = lightT * 0.45 + o.phase;
    const cx = [-4.5, 0.6, 4.6][i], rx = [2.1, 1.3, 2.1][i];
    // elliptical orbits passing in front of and behind the row, rimming the actors from the side
    o.light.position.set(cx + Math.cos(a) * rx, 1.15 + Math.sin(a * 1.7) * 0.25, ROW_Z + 0.2 + Math.sin(a) * 1.7);
    o.glow.position.copy(o.light.position);
  });
}

/** Advance the simulation by `dt` without rendering. */
function step(dt) {
  t += dt;
  if (!paused) lightT += dt;
  placeLights();
  flashTimer -= dt;
  if (flashTimer <= 0) {
    flashTimer = 1.1;
    flasher.flash(flashColors[flashIdx++ % flashColors.length], 0.22);
  }
  for (const s of stations) {
    if (!s.burst) continue;
    s.timer -= dt;
    if (s.timer <= 0) {
      s.timer = 1.7;
      particles.emit(s.name, s.pos);
    }
  }
  for (const a of actors) a.actor.update(dt);
  for (const a of rimActors) a.update(dt);
  particles.update(dt);
  updateVfx(dt, t);
}

function frame(now) {
  const dt = Math.min(1 / 20, (now - last) / 1000);
  last = now;
  step(dt);
  composer.render(dt);
  for (const l of labels) {
    _p.copy(l.pos).project(camera);
    const vis = _p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05;
    l.el.style.display = vis ? '' : 'none';
    if (vis) {
      l.el.style.left = `${((_p.x + 1) / 2) * innerWidth}px`;
      l.el.style.top = `${((1 - _p.y) / 2) * innerHeight}px`;
    }
  }
  if (!window.__PREVIEW) {
    document.getElementById('vp-boot').classList.add('vp-hide');
    window.__PREVIEW = {
      ready: true, setView, actors: actors.map((a) => a.actor), particles,
      pause: (v = true) => { paused = v; },
      holo, flasher,
      // headless helpers: SwiftShader renders ~2 fps, so screenshots advance simulated time explicitly
      advance: (sec) => { for (let i = 0; i < Math.round(sec * 30); i++) step(1 / 30); },
      burstAll: () => stations.forEach((s) => { if (s.burst) { s.timer = 1.7; particles.emit(s.name, s.pos); } }),
      rimActors,
      scene,
      mod: { SpriteActor },
    };
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
