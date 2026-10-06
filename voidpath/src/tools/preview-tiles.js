// Preview for art/tiles.js + art/fx.js: a lit three.js diorama, tiling checks, every texture at 3x
// (map | emissive | normal), every effect sheet at 3x and the space backdrop at 1x.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TEXTURE_NAMES, buildTexture, textureSet, setTextureFrame, textureHasAlpha, makeMaterial } from '../art/tiles.js';
import { FX_NAMES, fxSheet, softGlowCanvas } from '../art/fx.js';
import { injectCSS, el } from '../core/util.js';

injectCSS('preview-tiles', `
  html, body { overflow: auto !important; height: auto !important; touch-action: auto !important; user-select: text; }
  #app { position: relative !important; inset: auto !important; width: 1280px; height: 720px; }
  #vp-boot { display: none; }
  #pt { padding: 20px 24px 60px; font: 13px/1.35 var(--vp-font-ui); color: var(--vp-ink); background: var(--vp-void); }
  #pt h2 { font: 600 18px var(--vp-font-display); letter-spacing: .14em; text-transform: uppercase; color: var(--vp-amber); margin: 28px 0 12px; }
  #pt .grid { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
  #pt .card { background: #0b1222; border: 1px solid var(--vp-line-dim); padding: 8px; }
  #pt .lbl { font: 12px var(--vp-font-pixel); color: var(--vp-ink-dim); margin-bottom: 6px; }
  #pt .lbl b { color: var(--vp-cyan); font-weight: normal; }
  #pt .row { display: flex; gap: 6px; align-items: flex-start; }
  #pt canvas { display: block; image-rendering: pixelated; }
`);

const SCALE = 3;
const CHECKER = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const g = c.getContext('2d');
  g.fillStyle = '#1a2033'; g.fillRect(0, 0, 12, 12);
  g.fillStyle = '#232b42'; g.fillRect(0, 0, 6, 6); g.fillRect(6, 6, 6, 6);
  return c;
})();

/** Nearest-neighbour scaled copy of a canvas, optionally over a checkerboard (for alpha). */
function scaled(src, s = SCALE, { checker = false, bg = null } = {}) {
  const c = document.createElement('canvas');
  c.width = src.width * s;
  c.height = src.height * s;
  const g = c.getContext('2d');
  if (checker) { g.fillStyle = g.createPattern(CHECKER, 'repeat'); g.fillRect(0, 0, c.width, c.height); }
  else if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Tile a canvas region (one frame) nx * ny times, scaled. */
function tiled(src, nx, ny, s = 2, { fw = src.width, fh = src.height, checker = false } = {}) {
  const c = document.createElement('canvas');
  c.width = fw * nx * s;
  c.height = fh * ny * s;
  const g = c.getContext('2d');
  if (checker) { g.fillStyle = g.createPattern(CHECKER, 'repeat'); g.fillRect(0, 0, c.width, c.height); }
  g.imageSmoothingEnabled = false;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g.drawImage(src, 0, 0, fw, fh, i * fw * s, j * fh * s, fw * s, fh * s);
  return c;
}

/** A wall run built from a list of [name, frame] pieces, scaled. */
function wallRun(pieces, s = 2) {
  const parts = pieces.map(([n, f = 0]) => ({ t: buildTexture(n), f }));
  const w = parts.reduce((a, p) => a + p.t.w, 0);
  const c = document.createElement('canvas');
  c.width = w * s;
  c.height = 96 * s;
  const g = c.getContext('2d');
  g.fillStyle = '#05070d'; g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  let x = 0;
  for (const { t, f } of parts) {
    g.drawImage(t.map, f * t.w, 0, t.w, t.h, x * s, (96 - t.h) * s, t.w * s, t.h * s);
    x += t.w;
  }
  return c;
}

function card(label, canvases) {
  const name = label.match(/<b>([^<]+)<\/b>/)[1];
  return el('div', { class: 'card', 'data-name': name }, [el('div', { class: 'lbl', html: label }), el('div', { class: 'row' }, canvases)]);
}

// contract self-check used by the headless runner: missing names, sizes, frame counts, texture sets
window.__verify = (req, fx) => {
  const sizes = { wall_panel: [32, 96], window_frame: [64, 96], space_backdrop: [1024, 512], stars_layer: [256, 256], door_frame: [8, 96], wall_low: [32, 24], locker: [32, 64], cryo_pod: [32, 64], reactor_core: [64, 64], holo_table: [64, 64], ceiling_lamp: [16, 16], alarm_light: [16, 16], sign_cryo: [64, 16] };
  const frames = { wall_panel_screen: 4, console_front: 4, reactor_core: 4, holo_table: 4 };
  const errs = [];
  for (const n of req) {
    if (!TEXTURE_NAMES.includes(n)) { errs.push(`missing ${n}`); continue; }
    const t = buildTexture(n);
    const [w, h] = sizes[n] || [32, 32];
    if (n.startsWith('floor') && (t.w !== 32 || t.h !== 32)) errs.push(`${n} size ${t.w}x${t.h}`);
    if (sizes[n] && (t.w !== w || t.h !== h)) errs.push(`${n} size ${t.w}x${t.h} want ${w}x${h}`);
    if ((frames[n] || 1) !== t.frames) errs.push(`${n} frames ${t.frames}`);
    if (t.map.width !== t.w * t.frames || t.normal.width < 1) errs.push(`${n} canvas ${t.map.width}`);
    const set = textureSet(n, { repeat: [2, 2] });
    if (!set.map || !set.normalMap || set.frames !== t.frames || set.map.colorSpace !== THREE.SRGBColorSpace || set.normalMap.colorSpace !== THREE.NoColorSpace) errs.push(`${n} set`);
    if (set.emissiveMap && set.emissiveMap.colorSpace !== THREE.SRGBColorSpace) errs.push(`${n} emissive colorspace`);
  }
  for (const [n, count] of Object.entries(fx)) {
    const s = fxSheet(n);
    if (s.count !== count || s.anims.play.frames.length !== count || s.anims.play.loop !== false) errs.push(`fx ${n} count ${s.count}`);
    if (s.canvas.width !== s.frameW * s.cols || s.frameW < 8 || s.frameW > 64) errs.push(`fx ${n} frame ${s.frameW}`);
  }
  return { ok: errs.length === 0, errs, textures: TEXTURE_NAMES.length, fx: FX_NAMES.length };
};

// bounding boxes of every card (page coordinates) for clipped screenshots
window.__cardRects = () => JSON.stringify([...document.querySelectorAll('#pt .card')].map((c) => {
  const r = c.getBoundingClientRect();
  return [c.dataset.name, Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)];
}));

// ---------------------------------------------------------------- build timing (cold caches)

const tTex = performance.now();
const perTex = {};
for (const n of TEXTURE_NAMES) { const t = performance.now(); buildTexture(n); perTex[n] = Math.round(performance.now() - t); }
const texMs = Math.round(performance.now() - tTex);
const tFx = performance.now();
for (const n of FX_NAMES) fxSheet(n);
const fxMs = Math.round(performance.now() - tFx);

// ---------------------------------------------------------------- page sections

const root = el('div', { id: 'pt' });
document.body.appendChild(root);

function section(title) {
  root.appendChild(el('h2', { text: title }));
  const g = el('div', { class: 'grid' });
  root.appendChild(g);
  return g;
}

const spaceGrid = section('space_backdrop (1x) + stars_layer (1x)');
spaceGrid.appendChild(card('<b>space_backdrop</b> 1024x512', [scaled(buildTexture('space_backdrop').map, 1)]));
spaceGrid.appendChild(card('<b>stars_layer</b> 256x256 tiled 2x2', [tiled(buildTexture('stars_layer').map, 2, 2, 1, { checker: true })]));

const tilingGrid = section('Tiling check (2x)');
for (const n of ['floor_plate', 'floor_plate_worn', 'floor_grate', 'floor_hazard', 'floor_bridge', 'floor_cryo', 'wall_cap', 'pipe']) {
  tilingGrid.appendChild(card(`<b>tile ${n}</b> 4x3`, [tiled(buildTexture(n).map, 4, 3, 2)]));
}
{
  const t = buildTexture('reactor_core');
  tilingGrid.appendChild(card('<b>tile reactor_core</b> f0 3x2', [tiled(t.map, 3, 2, 2, { fw: 64, fh: 64 })]));
}
tilingGrid.appendChild(card('<b>mixed floor</b> plate / worn / grate / hazard', [(() => {
  const names = [['floor_plate', 'floor_plate_worn', 'floor_plate', 'floor_hazard', 'floor_plate', 'floor_plate'], ['floor_plate', 'floor_grate', 'floor_plate', 'floor_plate', 'floor_plate_worn', 'floor_plate'], ['floor_plate_worn', 'floor_plate', 'floor_plate', 'floor_grate', 'floor_plate', 'floor_plate']];
  const c = document.createElement('canvas');
  c.width = 6 * 64; c.height = 3 * 64;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  names.forEach((row, j) => row.forEach((n, i) => g.drawImage(buildTexture(n).map, i * 64, j * 64, 64, 64)));
  return c;
})()]));
tilingGrid.appendChild(card('<b>wall run</b> panel | vent | screen | panel | frame+door+frame | window | pipes x2 | locked door', [
  wallRun([['wall_panel'], ['wall_panel_vent'], ['wall_panel_screen', 1], ['wall_panel'], ['door_frame'], ['door'], ['door_frame'], ['window_frame'], ['wall_pipes'], ['wall_pipes'], ['door_locked']]),
]));
tilingGrid.appendChild(card('<b>tile wall_low</b> x6', [tiled(buildTexture('wall_low').map, 6, 1, 2)]));

const texGrid = section('Textures (3x): map | emissive | normal  (animated: strips stacked)');
for (const name of TEXTURE_NAMES) {
  if (name === 'space_backdrop' || name === 'stars_layer') continue;
  const t = buildTexture(name);
  const alpha = textureHasAlpha(name);
  const parts = [scaled(t.map, SCALE, { checker: alpha }), t.emissive ? scaled(t.emissive) : null, scaled(t.normal)].filter(Boolean);
  const info = `<b>${name}</b> ${t.w}x${t.h}${t.frames > 1 ? ` x${t.frames}f` : ''}${t.emissive ? ' +emissive' : ''}${alpha ? ' (alpha)' : ''}`;
  const c = card(info, parts);
  if (t.frames > 1) c.querySelector('.row').style.flexDirection = 'column';
  texGrid.appendChild(c);
}

const fxGrid = section('FX sheets (3x, additive look on black)');
for (const name of FX_NAMES) {
  const s = fxSheet(name);
  fxGrid.appendChild(card(`<b>${name}</b> ${s.frameW}x${s.frameH} x${s.count}f @${s.anims.play.fps}fps`, [scaled(s.canvas, SCALE, { bg: '#000000' })]));
}
fxGrid.appendChild(card('<b>softGlowCanvas</b> 64 white / amber / cyan / magenta', ['#ffffff', '#ffbf4d', '#7ff4ff', '#ff4fc0'].map((c) => scaled(softGlowCanvas(64, c), 1, { bg: '#000000' }))));

// ---------------------------------------------------------------- diorama

const canvas = document.getElementById('view');
const W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || 720;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#04060c');
scene.fog = new THREE.FogExp2('#05070d', 0.028);

const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
const target = new THREE.Vector3(0, 0.95, -0.2);
const pitch = THREE.MathUtils.degToRad(35), dist = 12.5;
camera.position.set(target.x, target.y + Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist);
camera.lookAt(target);

const animated = [];
const matCache = new Map();
function mat(name, { repeat = null, emissive = 1.8, alpha = false } = {}) {
  const key = `${name}|${repeat}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = makeMaterial(name, { repeat, emissiveIntensity: emissive, alphaTest: alpha ? 0.02 : 0, transparent: alpha });
  if (m.userData.set.frames > 1) animated.push(m.userData.set);
  matCache.set(key, m);
  return m;
}
const plain = (color, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.2 });

function plane(w, h, material, pos, rotX = 0, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(...pos);
  m.rotation.set(rotX, rotY, 0);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// floor 6x4 (x -3..3, z -2..2)
const floorLayout = [
  ['floor_plate', 'floor_plate_worn', 'floor_plate', 'floor_plate', 'floor_hazard', 'floor_plate'],
  ['floor_plate', 'floor_plate', 'floor_grate', 'floor_plate', 'floor_plate', 'floor_plate_worn'],
  ['floor_plate_worn', 'floor_plate', 'floor_plate', 'floor_plate', 'floor_plate', 'floor_plate'],
  ['floor_plate', 'floor_plate', 'floor_plate', 'floor_plate_worn', 'floor_plate', 'floor_plate'],
];
floorLayout.forEach((row, j) => row.forEach((n, i) => plane(1, 1, mat(n), [i - 3 + 0.5, 0, j - 2 + 0.5], -Math.PI / 2)));
// decals
for (const [n, x, z, rot] of [['decal_oil', 0.5, -0.4, 0.3], ['decal_arrow', 1.5, -0.6, 0], ['decal_scorch', -0.6, 1.3, 0], ['decal_grime', -2.4, -1.0, 0]]) {
  const d = plane(1, 1, mat(n, { alpha: true }), [x, 0.004, z], -Math.PI / 2);
  d.rotation.z = rot;
  d.material.depthWrite = false;
  d.material.polygonOffset = true;
  d.material.polygonOffsetFactor = -2;
}

// back wall (z = -2): panel | screen | window (2) | door | pipes
const wallZ = -2;
plane(1, 3, mat('wall_panel'), [-2.5, 1.5, wallZ]);
plane(1, 3, mat('wall_panel_screen'), [-1.5, 1.5, wallZ]);
plane(2, 3, mat('window_frame', { alpha: true, emissive: 1.4 }), [0, 1.5, wallZ]);
plane(1, 3, mat('door'), [1.5, 1.5, wallZ]);
plane(1, 3, mat('wall_pipes'), [2.5, 1.5, wallZ]);
plane(0.25, 3, mat('door_frame', { emissive: 2.2 }), [1.0, 1.5, wallZ + 0.02]);
plane(0.25, 3, mat('door_frame', { emissive: 2.2 }), [2.0, 1.5, wallZ + 0.02]);
// wall top cap and window reveal
plane(6, 0.5, mat('wall_cap', { repeat: [6, 0.5] }), [0, 3, wallZ - 0.25], -Math.PI / 2);
const reveal = plain('#1e2536', 0.85);
plane(0.5, 1.84, reveal, [-0.86, 1.64, wallZ - 0.25], 0, Math.PI / 2);
plane(0.5, 1.84, reveal, [0.86, 1.64, wallZ - 0.25], 0, -Math.PI / 2);
plane(1.72, 0.5, reveal, [0, 0.72, wallZ - 0.25], -Math.PI / 2);

// space through the window: painted backdrop + a parallax star layer
// space through the window: painted backdrop (~1.2 screen px per texel) + a parallax star layer,
// behind a black hull that only leaves the window aperture open
const hull = new THREE.MeshBasicMaterial({ color: scene.background, fog: false });
for (const [x0, x1, y0, y1] of [[-20, -0.95, -10, 20], [0.95, 20, -10, 20], [-0.95, 0.95, 2.62, 20], [-0.95, 0.95, -10, 0.7]]) {
  plane(x1 - x0, y1 - y0, hull, [(x0 + x1) / 2, (y0 + y1) / 2, wallZ - 0.55]);
}
const space = textureSet('space_backdrop');
const back = new THREE.Mesh(new THREE.PlaneGeometry(17, 8.5), new THREE.MeshBasicMaterial({ map: space.map, fog: false }));
back.position.set(-1.3, -0.6, -6);
scene.add(back);
const starsSet = textureSet('stars_layer', { repeat: [3, 1.5] });
const stars = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: starsSet.map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
stars.position.set(0, 0.6, -4);
scene.add(stars);

// props
function box(w, h, d, mats, pos, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.set(...pos);
  m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
const podSide = plain('#5d6780', 0.55), metal = plain('#323b4e');
box(1, 2, 0.7, [podSide, podSide, podSide, podSide, mat('cryo_pod', { emissive: 1.5 }), podSide], [-2.5, 1, -1.62]);
box(1, 1, 0.7, [metal, metal, mat('console_top'), metal, mat('console_front'), metal], [-1.5, 0.5, -1.62]);
const crateSide = mat('crate_side'), crateTop = mat('crate_top');
const crate = [crateSide, crateSide, crateTop, crateTop, crateSide, crateSide];
box(1, 1, 1, crate, [2.45, 0.5, -1.0]);
box(0.75, 0.75, 0.75, crate, [2.4, 1.375, -1.05], 0.25);
box(1, 1, 1, crate, [1.55, 0.5, 0.75], 0.4);

// fixtures: lamp over the pod, alarm over the door, signage
plane(0.5, 0.5, mat('ceiling_lamp', { alpha: true, emissive: 2.6 }), [-2.5, 2.48, wallZ + 0.03]);
plane(0.5, 0.5, mat('alarm_light', { alpha: true, emissive: 2.4 }), [1.5, 2.72, wallZ + 0.03]);
plane(2, 0.5, mat('sign_spine', { emissive: 2.2 }), [-0.0, 2.76, wallZ + 0.03]);
const glowSprite = (color, size, pos, opacity = 0.7) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(softGlowCanvas(64, color)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.set(size, size, 1);
  s.position.set(...pos);
  scene.add(s);
  return s;
};
glowSprite('#ffbf4d', 1.1, [-2.5, 2.42, wallZ + 0.1], 0.4);
const alarmGlow = glowSprite('#ff3b4e', 1.0, [1.5, 2.7, wallZ + 0.1], 0.5);

// lights
scene.add(new THREE.HemisphereLight('#3d4f7a', '#07080d', 0.65));
const amber = new THREE.PointLight('#ffa64a', 26, 10, 1.6);
amber.position.set(-1.7, 2.1, -0.5);
amber.castShadow = true;
amber.shadow.mapSize.set(512, 512);
amber.shadow.bias = -0.004;
scene.add(amber);
const cyan = new THREE.PointLight('#45d4ff', 11, 7.5, 1.6);
cyan.position.set(0.4, 1.3, -0.9);
scene.add(cyan);
const alarm = new THREE.PointLight('#ff3b4e', 3, 2.6, 1.8);
alarm.position.set(1.5, 2.65, -1.8);
scene.add(alarm);
const moon = new THREE.DirectionalLight('#8fb8ff', 0.35);
moon.position.set(-1, 4, -6);
scene.add(moon);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.75, 0.5, 0.82));
composer.addPass(new OutputPass());

let t0 = performance.now();
let frames = 0;
function tick(now) {
  const t = (now - t0) / 1000;
  for (const set of animated) setTextureFrame(set, t * set.fps);
  amber.intensity = 26 * (0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 7.3));
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  alarm.intensity = 1 + 2 * pulse;
  alarmGlow.material.opacity = 0.25 + 0.4 * pulse;
  starsSet.map.offset.x = t * 0.004;
  composer.render();
  if (++frames === 2) window.__PREVIEW = { ready: true, texMs, fxMs, perTex };
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
