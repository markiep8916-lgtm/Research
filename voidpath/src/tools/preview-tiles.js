// Preview for art/tiles.js, art/fx.js, world/paint.js, the prop builders and the art cache.
//   #textures (default)  a lit three.js diorama, tiling checks, every registered texture at 3x
//                        (map | emissive | normal), every effect sheet at 3x, the space backdrop at 1x
//   #props[:view]        every built-in prop type in a small world, off / closed on the left of each
//                        pair and on / open on the right; views: switches, gates, misc, water, actors
//   #sky[:low]           an open map edge with the camera-anchored sky (default pitch, or 12 degrees)
//   #cache               the byte-budgeted art cache under a forced 20 MB budget: trim, evictLocation,
//                        releaseCanvas and the missing-art fallbacks
//   #world:<map>,<view>  a registered map built by the real World at one of its viewpoints, with the
//                        visualLint result (window.__PREVIEW.lint)
// window.__PREVIEW = { ready, ... } once the page has rendered; props/sky expose advance(sec).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TEXTURE_NAMES, buildTexture, textureSet, setTextureFrame, textureHasAlpha, makeMaterial, registerTexture } from '../art/tiles.js';
import { FX_NAMES, fxSheet, softGlowCanvas } from '../art/fx.js';
import { artCache, releaseCanvas, missingArt } from '../art/cache.js';
import { buildFieldSprite, buildPortrait } from '../art/characters.js';
import { Particles } from '../core/particles.js';
import { updateVfx } from '../core/vfx.js';
import { Batch, Materials } from '../world/geometry.js';
import { buildProp } from '../world/props.js';
import { buildWater } from '../world/water.js';
import { buildSky, buildUnderlay } from '../world/sky.js';
import { NpcActor } from '../world/actors.js';
import { showEmote } from '../world/emotes.js';
import { visualLint } from '../world/lint.js';
import { World } from '../world/world.js';
import { Lighting } from '../world/lighting.js';
import { registerAll, getMap } from '../content/index.js';
import { gameState, resetGame } from '../core/state.js';
import { injectCSS, el } from '../core/util.js';
import '../world/paint.js';

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
  #pt pre { font: 12px/1.5 var(--vp-font-pixel); color: var(--vp-ink); white-space: pre-wrap; }
  .pt-tag { position: absolute; transform: translate(-50%, 0); font: 11px var(--vp-font-pixel); color: #e9f2ff;
    background: rgba(5, 8, 16, 0.72); border: 1px solid rgba(140, 214, 255, 0.35); padding: 1px 5px; white-space: nowrap; pointer-events: none; z-index: 5; }
  .pt-title { position: absolute; left: 16px; top: 12px; font: 600 15px var(--vp-font-display); letter-spacing: .14em; color: var(--vp-amber); z-index: 5;
    text-transform: uppercase; text-shadow: 0 1px 2px #000; }
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

function pageTextures() {
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
}

// ---------------------------------------------------------------- shared 3D setup (props, sky)

function makeRenderer({ fog = '#06080f', density = 0.02, scene: given = null } = {}) {
  const canvas = document.getElementById('view');
  const W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = given || new THREE.Scene();
  if (!given) {
    scene.background = new THREE.Color(fog);
    scene.fog = new THREE.FogExp2(fog, density);
  }
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 140);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.5, 0.82));
  composer.addPass(new OutputPass());
  return { renderer, scene, camera, composer, W, H };
}

/** Field camera: target, pitch (degrees) and distance like the explore camera. */
function aim(camera, x, z, { pitch = 34, dist = 16, y = 0.9 } = {}) {
  const p = THREE.MathUtils.degToRad(pitch);
  camera.position.set(x, y + Math.sin(p) * dist, z + Math.cos(p) * dist);
  camera.lookAt(x, y, z);
  camera.updateMatrixWorld();
}

/** A minimal World for prop builders (the builder API of TECH_PLAN 3.3). */
function makeWorld(scene, map) {
  const sounds = [];
  const W = {
    map: { id: 'preview', w: 1, h: 1, props: [], interactables: [], lights: [], areas: [], ...map },
    scene, root: new THREE.Group(), mats: new Materials(), particles: new Particles(scene, { max: 4000 }),
    state: { flags: {} }, glows: [], actors: [], updaters: [], boxes: [], circles: [], emitters: [], interactables: [], npcs: [],
    static: new Batch(), sounds,
    batchFor() { return this.static; },
    groupFor() { return this.root; },
    addBox(x, z, w, d) { const b = { x, z, w, d, enabled: true }; this.boxes.push(b); return b; },
    addCircle(x, z, r) { const c = { x, z, r, enabled: true }; this.circles.push(c); return c; },
    addInteractable(it) { this.interactables.push(it); return it; },
    addEmitter(preset, opts) { const em = this.particles.addEmitter(preset, opts); this.emitters.push({ em, x: em.position.x, y: em.position.y, z: em.position.z }); return em; },
    addGlow(sprite, x, z) { this.glows.push({ sprite, x, z }); },
    addUpdater(fn) { this.updaters.push(fn); },
    addActor(a) { this.actors.push(a); },
    test(c) { return !c || !!this.state.flags[c]; },
    track(d) { return d; },
    onSound(name) { sounds.push(name); },
    update(dt, t) {
      this.mats.update(t);
      this.particles.update(dt);
      for (const a of this.actors) a.update(dt);
      for (const n of this.npcs) n.update(dt, t);
      for (const fn of this.updaters) fn(dt, t);
    },
  };
  scene.add(W.root);
  return W;
}

/** Floor tiles everywhere except `holes`, plus a back wall along z = 1. */
function floorAndWall(W, x0, x1, z1, holes = new Set()) {
  const fl = W.mats.tile('floor_plate', { emissive: 2.0, cast: false });
  const worn = W.mats.tile('floor_plate_worn', { emissive: 2.0, cast: false });
  const wall = W.mats.tile('wall_panel', { emissive: 2.2 });
  const screen = W.mats.tile('wall_panel_screen', { emissive: 2.3 });
  const cap = W.mats.tile('wall_cap', { cast: false });
  for (let z = 1; z < z1; z++) for (let x = x0; x < x1; x++) {
    if (holes.has(`${x},${z}`)) continue;
    W.static.faceY((x * 7 + z * 3) % 5 === 0 ? worn : fl, x, x + 1, z, z + 1, 0);
  }
  for (let x = x0; x < x1; x++) {
    W.static.faceZ(x % 6 === 2 ? screen : wall, x, x + 1, 0, 3, 1, 1);
    W.static.faceY(cap, x, x + 1, 0, 1, 3);
  }
}

function lights(scene, spots) {
  scene.add(new THREE.HemisphereLight('#4a5f8f', '#0b0d14', 0.75));
  const key = new THREE.DirectionalLight('#cfe0ff', 0.9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  scene.add(key, key.target);
  for (const [x, y, z, color, intensity, dist] of spots) {
    const l = new THREE.PointLight(color, intensity, dist, 1.6);
    l.position.set(x, y, z);
    scene.add(l);
  }
  return key;
}

function tagLayer() {
  const layer = el('div', { style: 'position:fixed;inset:0;pointer-events:none;z-index:5' });
  document.body.appendChild(layer);
  const tags = [];
  const v = new THREE.Vector3();
  return {
    add(text, x, y, z) { const t = el('div', { class: 'pt-tag', text }); layer.appendChild(t); tags.push({ t, p: new THREE.Vector3(x, y, z) }); },
    title(text) { layer.appendChild(el('div', { class: 'pt-title', text })); },
    place(camera, w, h) {
      for (const { t, p } of tags) {
        v.copy(p).project(camera);
        const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        t.style.display = vis ? '' : 'none';
        if (vis) { t.style.left = `${(v.x * 0.5 + 0.5) * w}px`; t.style.top = `${(-v.y * 0.5 + 0.5) * h}px`; }
      }
    },
  };
}

/** Run a simulation loop; sim time advances with real time and with __PREVIEW.advance(sec). */
function runLoop({ composer, camera, W: w, H: h, tags, step, extra = {} }) {
  let simT = 0, last = performance.now(), frames = 0;
  const advance = (sec) => { for (let k = 0; k < Math.round(sec * 30); k++) { simT += 1 / 30; step(1 / 30, simT); } };
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    simT += dt;
    step(dt, simT);
    updateVfx(dt, simT);
    if (tags) tags.place(camera, w, h);
    composer.render();
    if (++frames === 3) window.__PREVIEW = { ready: true, advance, ...extra };
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- #props

// Each bay is built alone (SwiftShader renders a lit, shadowed scene slowly): off / closed on the
// left of each pair, on / open on the right. Bays: switches, gates, misc, water, actors.
const BAYS = {
  switches: { at: [7, 5.2], lights: [[4, 2.2, 3.5, '#ffb04a', 14, 9], [10, 2.2, 6, '#45d4ff', 12, 9]] },
  gates: { at: [21.5, 5.6], lights: [[18, 2.2, 4, '#ff3b4e', 12, 9], [24, 2.2, 6.5, '#7fd6ff', 12, 9]] },
  misc: { at: [35, 5.4], lights: [[31, 2.2, 4, '#5dff9c', 10, 9], [37, 2.2, 6, '#b98cff', 12, 9]] },
  water: { at: [49, 5.4], lights: [[46, 2.2, 5, '#4fd2ff', 12, 9], [52, 2.2, 5, '#ffb04a', 12, 9]] },
  actors: { at: [63, 5.2], lights: [[60, 2.2, 5.5, '#ffb04a', 14, 9], [66, 2.2, 5.5, '#45d4ff', 12, 9]] },
};

function pageProps(name) {
  const bay = BAYS[name] ? name : 'switches';
  const [cx, cz] = BAYS[bay].at;
  const { scene, camera, composer, W: w, H: h } = makeRenderer();
  const holes = new Set();
  const waterA = [], waterB = [];
  for (let x = 44; x < 48; x++) for (let z = 3; z < 5; z++) { waterA.push([x, z]); holes.add(`${x},${z}`); }
  for (let x = 50; x < 54; x++) for (let z = 3; z < 5; z++) { waterB.push([x, z]); holes.add(`${x},${z}`); }
  const pitA = [[16, 8], [17, 8], [18, 8]], pitB = [[21, 8], [22, 8], [23, 8]];
  for (const [c, r] of [...pitA, ...pitB]) holes.add(`${c},${r}`);
  const W = makeWorld(scene, { id: 'preview', w: 72, h: 11 });
  floorAndWall(W, Math.max(0, Math.floor(cx - 11)), Math.ceil(cx + 11), 10, holes);
  const key = lights(scene, BAYS[bay].lights);
  key.position.set(cx - 6, 14, cz + 8);
  key.target.position.set(cx, 0, cz);
  const tags = tagLayer();
  tags.title(`props: ${bay}`);
  const L = {};
  const prop = (p, label) => {
    const living = buildProp(W, p);
    if (p.id) L[p.id] = living;
    if (label) tags.add(label, p.x, p.labelY ?? 2.3, p.z + (p.labelDz ?? 0.4));
    return living;
  };
  const flip = (id, on) => { const l = L[id]; (l.setOpen || l.setState).call(l, on, false); };
  const events = [];
  const tick = [];

  if (bay === 'switches') {
    prop({ t: 'chest', id: 'chestA', x: 2, z: 3 }, 'chest');
    prop({ t: 'chest', id: 'chestB', x: 4, z: 3 }, 'chest open');
    prop({ t: 'switch.panel', id: 'panelA', x: 6.6, z: 3 }, 'switch.panel');
    prop({ t: 'switch.panel', id: 'panelB', x: 8.2, z: 3 }, 'on');
    prop({ t: 'switch.valve', id: 'valveA', x: 10.2, z: 3.2 }, 'switch.valve');
    prop({ t: 'switch.valve', id: 'valveB', x: 11.8, z: 3.2 }, 'on');
    prop({ t: 'switch.lever', id: 'leverA', x: 2.5, z: 6.4, labelY: 1.3 }, 'switch.lever');
    prop({ t: 'switch.lever', id: 'leverB', x: 4.5, z: 6.4, labelY: 1.3 }, 'on');
    prop({ t: 'starchart', id: 'chart', x: 9.5, z: 6.2, labelY: 2.6 }, 'starchart (new)');
    prop({ t: 'guide', id: 'guideA', from: [1, 8.6], to: [6, 8.6], link: 'leverA', labelY: 0.3 }, 'guide off');
    prop({ t: 'guide', id: 'guideB', from: [8, 8.6], to: [13, 8.6], link: 'leverB', color: '#7ff4ff', labelY: 0.3 }, 'guide on');
    events.push([0.3, () => {
      for (const id of ['chestB', 'panelB', 'valveB', 'leverB']) flip(id, true);
      L.guideB.setState(true);
      L.chart.setState(true);
    }]);
  } else if (bay === 'gates') {
    prop({ t: 'gate.laser', id: 'laserA', cells: [[16, 3], [17, 3], [18, 3]], x: 17.5, z: 3.5 }, 'gate.laser');
    prop({ t: 'gate.laser', id: 'laserB', cells: [[21, 3], [22, 3], [23, 3]], x: 22.5, z: 3.5 }, 'open');
    prop({ t: 'gate.laser', id: 'laserC', cells: [[26, 3], [26, 4], [26, 5]], x: 26.5, z: 4.5, labelY: 2.1 }, 'along z');
    prop({ t: 'gate.shutter', id: 'shutA', cells: [[16, 6], [17, 6]], x: 17, z: 6.5, labelY: 3.5 }, 'gate.shutter');
    prop({ t: 'gate.shutter', id: 'shutB', cells: [[21, 6], [22, 6]], x: 22, z: 6.5, labelY: 3.5 }, 'open');
    prop({ t: 'gate.bridge', id: 'bridgeA', cells: pitA, x: 17.5, z: 8.5, labelY: 0.8 }, 'gate.bridge (pit, underlay)');
    prop({ t: 'gate.bridge', id: 'bridgeB', cells: pitB, x: 22.5, z: 8.5, labelY: 0.8 }, 'open');
    const under = buildUnderlay(W, { texture: 'stars_layer', y: -4, repeat: [18, 4], color: '#9fd8ff' });
    tick.push((dt) => under.update(dt));
    events.push([0.3, () => { for (const id of ['laserB', 'shutB', 'bridgeB']) flip(id, true); }]);
  } else if (bay === 'misc') {
    prop({ t: 'pod', id: 'podA', x: 30, z: 2.2, status: 'pods_on', delay: 0, labelY: 2.9 }, 'pod deferred');
    prop({ t: 'pod', id: 'podB', x: 31.4, z: 2.2, status: 'pods_on2', delay: 0.4, labelY: 2.9, labelDz: 0.8 }, 'authorized');
    prop({ t: 'shard', id: 'shardA', x: 34, z: 3.4 }, 'shard');
    prop({ t: 'shard', id: 'shardB', x: 35.6, z: 3.4 }, 'collected (flies off)');
    prop({ t: 'screen', id: 'scrA', x: 38, z: 1.04, y: 1.3, w: 1.6, h: 0.8, labelY: 2.4 }, 'screen');
    prop({ t: 'screen', id: 'scrB', x: 40.2, z: 1.04, y: 1.3, w: 1.2, h: 1.2, labelY: 2.8 }, 'warden_sigil');
    prop({ t: 'box', x: 29.8, z: 6, w: 1.2, d: 0.8, h: 0.9, tex: { front: 'crate_side', side: 'metal_side', top: 'crate_top' }, labelY: 1.4 }, 'box');
    prop({ t: 'plane', x: 31.6, z: 6, w: 1, h: 1.375, tex: 'chair', alpha: true, labelY: 1.8 }, 'plane');
    prop({ t: 'floorPlane', x: 33.4, z: 6.3, w: 1.6, d: 1.2, tex: 'decal_arrow', labelY: 0.4 }, 'floorPlane');
    prop({ t: 'cylinder', x: 35.4, z: 6, r: 0.45, h: 2.4, tex: 'reactor_core', emissive: 1.4, labelY: 2.8 }, 'cylinder');
    prop({ t: 'sprite', x: 37.2, z: 6.2, sheet: 'npc:sera', anim: 'idle_down', labelY: 1.9 }, 'sprite');
    prop({ t: 'sprite', x: 38.6, z: 6.2, sheet: 'npc:holo', hologram: true, labelY: 1.9 }, 'hologram');
    prop({ t: 'glow', x: 40, z: 6.2, y: 1, color: '#ff63b6', size: 1.4, intensity: 1.2, labelY: 1.7 }, 'glow');
    prop({ t: 'not.a.prop', x: 41.4, z: 6.2, labelY: 1.4 }, 'unknown type');
    prop({ t: 'box', x: 30.5, z: 8.6, w: 1, d: 1, h: 1, tex: 'nope_texture', labelY: 1.4 }, 'unknown texture');
    events.push([0.3, () => {
      W.state.flags.pods_on2 = true;
      L.podB.setState(true);
      L.scrB.setState('warden_sigil');
    }], [2.75, () => flip('shardB', true)]);
  } else if (bay === 'water') {
    const spec = { t: 'water', tex: 'water', bank: 'water_bank', depth: 0.35, path: 'water_path' };
    const waters = [buildWater(W, waterA, spec), buildWater(W, waterB, spec)];
    tags.add('water', 46, 1.0, 5.2);
    tags.add('drained (walkway)', 52, 1.0, 5.2);
    W.addEmitter('drip', { position: [46, 2.6, 3.5], area: [3, 0.2, 1.2], rate: 2 });
    prop({ t: 'switch.valve', id: 'valveW', x: 49, z: 6.5, labelY: 2.0 }, 'drain valve (on)');
    tick.push((dt, t) => { for (const wb of waters) wb.update(dt, t); });
    events.push([0.3, () => { waters[1].setDrained(true); flip('valveW', true); }]);
  } else {
    const npcs = [
      ['kade', 57, 4.2, '!', null], ['nyx', 59, 4.2, '?', 'arms_crossed'], ['orion', 61, 4.2, 'idea', 'point'],
      ['sera', 63, 4.2, 'heart', 'hand_to_chest'], ['bolt', 65, 4.2, 'note', null], ['holo', 67, 4.2, '...', null],
    ].map(([sprite, x, z, emo, pose]) => {
      const n = new NpcActor(W, { id: sprite, sprite, x, z, facing: 'down', pose });
      W.npcs.push(n);
      tags.add(`${sprite} ${emo}${pose ? ` / ${pose}` : ''}`, x, -0.2, z + 0.9);
      return { n, emo };
    });
    const walker = new NpcActor(W, { id: 'walker', sprite: 'nyx', x: 56, z: 7.4, facing: 'right' });
    const kneel = new NpcActor(W, { id: 'kneel', sprite: 'kade', x: 64.4, z: 7.6, facing: 'left', pose: 'kneel' });
    const sleeper = new NpcActor(W, { id: 'sleeper', sprite: 'sera', x: 67.4, z: 7.8, facing: 'right', pose: 'collapse' });
    W.npcs.push(walker, kneel, sleeper);
    tags.add('walkTo + anger', 59, -0.2, 8.4);
    tags.add('kneel (left) + sweat', 64.4, -0.2, 8.6);
    tags.add('collapse + zzz', 67.4, -0.2, 8.6);
    events.push([0.3, () => {
      for (const { n, emo } of npcs) showEmote(W, n, emo, { ms: 600000 });
      walker.walkTo([[60, 7.4], [61, 8.0]]).then(() => showEmote(W, walker, 'anger', { ms: 600000 }));
      showEmote(W, kneel, 'sweat', { ms: 600000 });
      showEmote(W, sleeper, 'zzz', { ms: 600000 });
    }]);
  }

  W.static.build(W.root);
  for (let i = 0; i < 60; i++) W.particles.update(0.1);
  let ei = 0;
  aim(camera, cx, cz);
  runLoop({
    composer, camera, W: w, H: h, tags,
    step(dt, t) {
      while (ei < events.length && events[ei][0] <= t) events[ei++][1]();
      W.update(dt, t);
      for (const fn of tick) fn(dt, t);
    },
    extra: { W, L, sounds: W.sounds },
  });
}

// ---------------------------------------------------------------- #sky

function pageSky(mode) {
  const { scene, camera, composer, W: w, H: h } = makeRenderer({ fog: '#0a0c18', density: 0.012 });
  const W = makeWorld(scene, { id: 'sky', w: 16, h: 10 });
  // an open deck: floor rows 0..9, no north wall, a railing and some props near the edge
  const fl = W.mats.tile('floor_bridge', { emissive: 0.2, cast: false });
  const hz = W.mats.tile('floor_hazard', { emissive: 2.0, cast: false });
  for (let z = 0; z < 10; z++) for (let x = 0; x < 16; x++) W.static.faceY(z === 0 ? hz : fl, x, x + 1, z, z + 1, 0);
  const edge = W.mats.tile('wall_low', { emissive: 2.0 });
  for (let x = 0; x < 16; x++) W.static.faceZ(edge, x, x + 1, -0.5, 0, 10, 1);
  buildProp(W, { t: 'crate', x: 3, z: 2 });
  buildProp(W, { t: 'starchart', x: 11, z: 4 });
  buildProp(W, { t: 'glow', x: 2, z: 0.3, y: 0.4, color: '#ffbf4d', size: 1.2 });
  W.addEmitter('snow', { position: [8, 2, 5], area: [16, 3, 10], rate: 14 });
  const sky = buildSky(W, { texture: 'space_backdrop', stars: 'stars_layer', horizonV: 0.62, parallax: 0.12 });
  const walker = new NpcActor(W, { id: 'kade', sprite: 'kade', x: 7, z: 5, facing: 'up' });
  W.npcs.push(walker);
  W.static.build(W.root);
  lights(scene, [[4, 2, 3, '#ffb04a', 12, 9], [12, 2, 5, '#45d4ff', 12, 9], [8, 2, 1, '#ff63b6', 8, 7]]);
  const low = mode === 'low';
  aim(camera, 8, low ? 3.5 : 5, low ? { pitch: 12, dist: 14, y: 1.2 } : {});
  const tags = tagLayer();
  tags.title(low ? 'sky: low shot (12 degrees)' : 'sky: default pitch (34 degrees)');
  for (let i = 0; i < 60; i++) W.particles.update(0.1);
  runLoop({ composer, camera, W: w, H: h, tags, step(dt, t) { W.update(dt, t); sky.update(dt); }, extra: { W } });
}

// ---------------------------------------------------------------- #cache

function pageCache() {
  const MB = 1024 * 1024;
  document.getElementById('app')?.remove();   // no diorama on this page
  const root = el('div', { id: 'pt' });
  document.body.appendChild(root);
  const out = (title, text) => {
    root.appendChild(el('h2', { text: title }));
    root.appendChild(el('pre', { text }));
  };
  const fmt = () => {
    const s = artCache.stats();
    const by = Object.entries(s.byLoc).map(([k, v]) => `${k}: ${(v / MB).toFixed(1)} MB`).join(', ');
    return `${s.entries} entries, ${(s.bytes / MB).toFixed(1)} MB (budget ${(artCache.budget / MB).toFixed(0)} MB), acquired ${s.acquired}\n${by}`;
  };
  // test textures: 1024x512 canvases (2 MB each) owned by two fake locations
  const big = (seed) => () => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = `hsl(${seed * 47 % 360} 60% 30%)`;
    g.fillRect(0, 0, 1024, 512);
    return c;
  };
  for (let i = 0; i < 6; i++) {
    registerTexture(`cache_a_${i}`, { w: 1024, h: 512, raw: big(i) });
    registerTexture(`cache_b_${i}`, { w: 1024, h: 512, raw: big(i + 10) });
  }
  artCache.locate = (kind, key) => (key.startsWith('cache_a') ? 'locA' : key.startsWith('cache_b') ? 'locB' : 'core');
  artCache.budget = 20 * MB;
  const log = [];
  log.push(`budget forced to 20 MB\n${fmt()}`);
  const canvases = {};
  for (let i = 0; i < 6; i++) {
    canvases[`a${i}`] = buildTexture(`cache_a_${i}`).map;
    canvases[`b${i}`] = buildTexture(`cache_b_${i}`).map;
  }
  // locA's first texture is in use by a live material: acquired through textureSet
  const inUse = textureSet('cache_a_0');
  buildTexture('cache_b_5');   // touched last: most recently used
  log.push(`after painting 12 x 2 MB\n${fmt()}`);
  const n1 = artCache.trim();
  log.push(`trim() dropped ${n1} entries (LRU, unacquired, not pinned)\n${fmt()}`);
  const kept = Object.entries(canvases).map(([k, c]) => `${k}:${c.width ? 'live' : 'released'}`).join(' ');
  log.push(`canvases after trim (width 0 = releaseCanvas freed it): ${kept}`);
  const n2 = artCache.evictLocation('locB');
  log.push(`evictLocation('locB') dropped ${n2}\n${fmt()}`);
  const n3 = artCache.evictLocation('locA');
  log.push(`evictLocation('locA') dropped ${n3}: cache_a_0 stays while a texture uses it -> ${artCache.has('tex:cache_a_0')}`);
  for (const t of [inUse.map, inUse.normalMap, inUse.emissiveMap]) if (t) t.dispose();
  const n4 = artCache.evictLocation('locA');
  log.push(`after disposing its textures, evictLocation('locA') dropped ${n4}; canvas width now ${canvases.a0.width}`);
  const again = buildTexture('cache_b_1');
  log.push(`evicted art repaints on demand: cache_b_1 ${again.map.width}x${again.map.height} (old canvas ${canvases.b1.width}x${canvases.b1.height})`);
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  releaseCanvas(c);
  log.push(`releaseCanvas(64x64) -> ${c.width}x${c.height}`);
  out('Art cache (TECH_PLAN 11.5) under a forced 20 MB budget', log.join('\n\n'));

  // fallbacks: one console.warn each, listed by missingArt()
  buildTexture('nope_texture');
  buildTexture('nope_texture');
  const sheet = buildFieldSprite('nobody_registered');
  buildFieldSprite('nobody_registered');
  const portrait = buildPortrait('kade:grumpy');
  const p = new Particles(new THREE.Scene(), { max: 64 });
  p.emit('nope_preset', [0, 0, 0]);
  p.emit('nope_preset', [0, 0, 0]);
  out('Fallbacks (debug.missingArt)', JSON.stringify(missingArt(), null, 1));
  const grid = el('div', { class: 'grid' });
  root.appendChild(grid);
  grid.appendChild(card('<b>unknown texture</b> magenta checker', [scaled(buildTexture('nope_texture').map, 4)]));
  grid.appendChild(card('<b>unknown character</b> tinted silhouette', [scaled(sheet.canvas, 2, { checker: true })]));
  grid.appendChild(card('<b>unknown expression</b> kade:grumpy -> neutral', [scaled(portrait, 4)]));
  window.__PREVIEW = { ready: true, missing: missingArt(), stats: artCache.stats() };
}

// ---------------------------------------------------------------- #world

function pageWorld(arg = '') {
  const [mapId = 'dev_box', viewName] = arg.split(',');
  registerAll();
  resetGame();
  const map = getMap(mapId);
  const camera0 = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 140);
  const world = new World({ engine: { quality: 'high' }, map, state: gameState, rig: new Lighting({ quality: 'high' }), camera: camera0 });
  world.attachRig(map.areas[0]?.mood);
  world.syncFlags({ instant: true });
  const { camera, composer, W: w, H: h } = makeRenderer({ scene: world.scene });
  world.camera = camera;
  const views = map.viewpoints || {};
  const vp = views[viewName] || Object.values(views)[0] || map.spawns[Object.keys(map.spawns)[0]];
  const view = map.view || { pitch: 34, dist: 16 };
  aim(camera, vp.x, vp.z, { pitch: view.pitch, dist: view.dist });
  const focus = { x: vp.x, z: vp.z };
  world.snap(vp.x, vp.z);
  const tags = tagLayer();
  tags.title(`world: ${mapId} / ${viewName || 'first viewpoint'}`);
  const lint = () => visualLint(world, camera, { viewpoint: viewName || null });
  runLoop({
    composer, camera, W: w, H: h, tags,
    step(dt, t) { world.update(dt, t, focus, focus); },
    extra: { world, lint, views: Object.keys(views) },
  });
}

// ---------------------------------------------------------------- router

const [pageName, pageArg] = location.hash.slice(1).split(':');
if (pageName === 'props') pageProps(pageArg || 'switches');
else if (pageName === 'sky') pageSky(pageArg);
else if (pageName === 'cache') pageCache();
else if (pageName === 'world') pageWorld(pageArg);
else pageTextures();
