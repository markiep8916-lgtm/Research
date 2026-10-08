// Preview for art/enemies.js + art/icons.js: a lit three.js strip (normal + emissive maps under
// coloured point lights with bloom), every animation frame of every enemy art at 2-4x (fitBox drawn as
// a dashed box), the derived maps, turn-order icons, and the full UI icon set at 1x / 2x / 4x.
//
// Query params:
//   ?anim=break               plays that animation in the 3D strip (default idle)
//   ?art=maw,void_eel         only these arts (any registered content art; registerAll() runs first)
//   &compare=drone            stands that art beside them in the strip at the same scale (32 px/unit)
//   &mobile=1                 phone-width layout (390 px), e.g. with tools/play.mjs --mobile
// Without ?art every registered art is shown. window.__PREVIEW = { ready, sheets, arts }.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { registerAll } from '../content/index.js';
import { enemyArtKinds, buildEnemySprite, buildEnemyIcon } from '../art/enemies.js';
import { ICON_NAMES, iconCanvas, iconURL } from '../art/icons.js';
import { frameUV, toTexture, makeCanvas } from '../art/painter.js';
import { injectCSS, el } from '../core/util.js';

registerAll();

const params = new URLSearchParams(location.search);
const stripAnim = params.get('anim') || 'idle';
const mobile = params.get('mobile') === '1';
const compare = params.get('compare');
const picked = (params.get('art') || '').split(',').map((s) => s.trim()).filter(Boolean);
const ARTS = picked.length ? picked : enemyArtKinds();
const STRIP = compare && !ARTS.includes(compare) ? [compare, ...ARTS] : ARTS;

injectCSS('preview-enemies', `
  html, body { height: auto; overflow: auto; touch-action: auto; user-select: text; }
  #app { position: relative; inset: auto; overflow: visible; min-height: 100vh; }
  #view { position: relative; height: 460px; }
  #ui-root { position: relative; inset: auto; padding: 8px 20px 48px; pointer-events: auto; }
  .pv h2 { font: 700 15px var(--vp-font-display); letter-spacing: .18em; text-transform: uppercase; color: var(--vp-amber); margin: 26px 0 10px; }
  .pv h3 { font: 600 13px var(--vp-font-ui); letter-spacing: .08em; color: var(--vp-cyan); margin: 14px 0 6px; }
  .pv .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
  .pv figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .pv figcaption { font: 11px var(--vp-font-pixel); color: var(--vp-ink-dim); letter-spacing: .04em; }
  .pv canvas, .pv img { image-rendering: pixelated; display: block; max-width: 100%; }
  .pv .chk { background-color: #111827; background-image: conic-gradient(#151d2e 25%, transparent 0 50%, #151d2e 0 75%, transparent 0); background-size: 16px 16px; border: 1px solid var(--vp-line-dim); }
  .pv .light { background: #8d97aa; }
  .pv .meta { font: 12px var(--vp-font-ui); color: var(--vp-ink-faint); }
  .pv .warn { font: 12px var(--vp-font-ui); color: var(--vp-danger); }
  .pv .icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr)); gap: 8px; }
  .pv .icon { display: flex; align-items: flex-end; gap: 8px; padding: 8px; background: var(--vp-panel); border: 1px solid var(--vp-line-dim); }
  .pv .icon span { font: 10px var(--vp-font-pixel); color: var(--vp-ink-dim); }
  .labels { position: absolute; left: 0; right: 0; top: 432px; height: 0; font: 11px var(--vp-font-pixel); color: var(--vp-ink-dim); pointer-events: none; }
  .labels span { position: absolute; transform: translateX(-50%); white-space: nowrap; text-align: center; }
  body.is-mobile .labels span { white-space: normal; max-width: 120px; }
  body.is-mobile #app { width: 390px; }
  body.is-mobile #ui-root { padding: 8px 10px 40px; }
  body.is-mobile .pv .icons { grid-template-columns: 1fr 1fr; }
`);
document.body.classList.toggle('is-mobile', mobile);

const root = document.getElementById('ui-root');
const page = el('div', { class: 'pv' });
root.appendChild(page);

// ---------------------------------------------------------------- 2D sheets

function frameCanvas(sheet, index, scale, src = sheet.canvas) {
  const c = makeCanvas(sheet.frameW * scale, sheet.frameH * scale);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const sx = (index % sheet.cols) * sheet.frameW, sy = Math.floor(index / sheet.cols) * sheet.frameH;
  g.drawImage(src, sx, sy, sheet.frameW, sheet.frameH, 0, 0, c.width, c.height);
  return c;
}

/** Dashed outline of the art's fitBox (the rect the battle camera keeps in frame). */
function drawFitBox(c, sheet, scale) {
  if (!sheet.fitBox) return;
  const [x, y, w, h] = sheet.fitBox;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffc560';
  g.setLineDash([4, 3]);
  g.lineWidth = 1;
  g.strokeRect(x * scale + 0.5, y * scale + 0.5, w * scale - 1, h * scale - 1);
}

const sheets = {};
const pageScale = (sheet) => (mobile ? (sheet.frameW >= 120 ? 1 : 2) : sheet.frameW >= 200 ? 2 : sheet.frameW >= 120 ? 3 : 4);
page.appendChild(el('h2', { text: `Enemy sprites (${ARTS.length} arts, every frame)` }));
for (const art of new Set([...STRIP, ...ARTS])) {
  const t0 = performance.now();
  let sheet;
  try {
    sheet = buildEnemySprite(art);
  } catch (err) {
    console.error(err);
    continue;
  }
  const ms = performance.now() - t0;
  sheets[art] = sheet;
  if (!ARTS.includes(art)) continue;
  const scale = pageScale(sheet);
  page.appendChild(el('h3', { text: `${art}  ${sheet.frameW}x${sheet.frameH}  @${scale}x${sheet.fitBox ? `  fitBox [${sheet.fitBox.join(', ')}]` : ''}` }));
  if (sheet.placeholder) page.appendChild(el('div', { class: 'warn', text: 'Not registered: placeholder art.' }));
  page.appendChild(el('div', { class: 'meta', text: `${sheet.count} frames, sheet ${sheet.canvas.width}x${sheet.canvas.height}, built in ${ms.toFixed(0)} ms. anims: ${Object.entries(sheet.anims).map(([n, a]) => `${n}[${a.frames.join(',')}]@${a.fps}${a.loop ? ' loop' : ''}`).join('  ')}` }));
  const row = el('div', { class: 'row' });
  for (const [name, a] of Object.entries(sheet.anims)) {
    const seen = new Set();
    a.frames.forEach((fi, k) => {
      if (seen.has(fi)) return;
      seen.add(fi);
      const cv = frameCanvas(sheet, fi, scale);
      cv.className = 'chk';
      if (name === 'idle' && k === 0) drawFitBox(cv, sheet, scale);
      row.appendChild(el('figure', {}, [cv, el('figcaption', { text: `${name} ${k + 1}/${a.frames.length}  #${fi}` })]));
    });
  }
  page.appendChild(row);
  const maps = el('div', { class: 'row' });
  const mapScale = Math.max(1, Math.floor(scale / 2));
  for (const [label, src] of [['albedo', sheet.canvas], ['normal', sheet.normal], ['emissive', sheet.emissive]]) {
    const cv = frameCanvas(sheet, sheet.anims.idle.frames[0], mapScale, src);
    cv.className = 'chk';
    maps.appendChild(el('figure', {}, [cv, el('figcaption', { text: `${label} @${mapScale}x` })]));
  }
  const bcv = frameCanvas(sheet, sheet.anims.idle.frames[0], mapScale);
  bcv.className = 'light';
  maps.appendChild(el('figure', {}, [bcv, el('figcaption', { text: 'on light bg' })]));
  page.appendChild(maps);
}

page.appendChild(el('h2', { text: 'Turn-order icons (24x24)' }));
const eiRow = el('div', { class: 'row' });
for (const art of ARTS) {
  if (!sheets[art]) continue;
  const ic = buildEnemyIcon(art);
  for (const s of [1, 2, 4]) {
    const c = makeCanvas(24 * s, 24 * s);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(ic, 0, 0, c.width, c.height);
    c.className = 'chk';
    eiRow.appendChild(el('figure', {}, [c, el('figcaption', { text: `${art} ${s}x` })]));
  }
}
page.appendChild(eiRow);

// ---------------------------------------------------------------- UI icons (full catalogue only)

function copyCanvas(src) {
  const c = makeCanvas(src.width, src.height);
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

if (!picked.length) {
  page.appendChild(el('h2', { text: 'UI icons (16x16 at 1x / 2x / 4x)' }));
  const grid = el('div', { class: 'icons' });
  for (const name of ICON_NAMES) {
    const box = el('div', { class: 'icon' });
    box.appendChild(copyCanvas(iconCanvas(name, 1)));
    box.appendChild(el('img', { src: iconURL(name, 2), width: 32, height: 32, alt: name }));
    box.appendChild(copyCanvas(iconCanvas(name, 4)));
    box.appendChild(el('span', { text: name }));
    grid.appendChild(box);
  }
  page.appendChild(grid);
  const lightRow = el('div', { class: 'row', style: { marginTop: '10px', padding: '8px', background: '#8d97aa' } });
  for (const name of ICON_NAMES) lightRow.appendChild(el('img', { src: iconURL(name, 2), width: 32, height: 32, alt: name }));
  page.appendChild(lightRow);
}

// ---------------------------------------------------------------- three.js strip (same scale for every art)

const canvas = document.getElementById('view');
const W = mobile ? 390 : Math.max(640, canvas.clientWidth), H = 460;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
canvas.style.width = `${W}px`;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#070b16');
scene.fog = new THREE.FogExp2('#070b16', 0.02);

const stripArts = STRIP.filter((a) => sheets[a]);
const widths = stripArts.map((a) => sheets[a].frameW / 32);
const gap = 0.6;
const total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, widths.length - 1);
const tallest = Math.max(2, ...stripArts.map((a) => sheets[a].frameH / 32));
const xs = [];
let cursor = -total / 2;
for (const w of widths) { xs.push(cursor + w / 2); cursor += w + gap; }

// fit the camera to the whole line-up (same scale for every art: the comparison is honest)
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
const tanV = Math.tan(THREE.MathUtils.degToRad(15));
const dist = Math.max((tallest * 0.62) / tanV, (total * 0.56) / (tanV * (W / H))) + 2;
camera.position.set(0, tallest * 0.45 + dist * 0.12, dist);
camera.lookAt(0, tallest * 0.42, 0);

const floorW = Math.max(40, total + 10);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 16), new THREE.MeshStandardMaterial({ color: '#1a2132', roughness: 0.55, metalness: 0.4 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid3 = new THREE.GridHelper(floorW, Math.round(floorW), '#24314d', '#18213a');
grid3.position.y = 0.002;
scene.add(grid3);

scene.add(new THREE.HemisphereLight('#4a5a8a', '#0a0c14', 0.9));
const key = new THREE.DirectionalLight('#cfe0ff', 0.9);
key.position.set(-6, 9 + tallest, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -floorW / 2, right: floorW / 2, top: tallest + 4, bottom: -4 });
scene.add(key);
const span = total / 2 + 2;
const lights = [
  ['#ff9a3c', 18, 9 + tallest, [-span, 2.2, 3]],
  ['#38d6ff', 22, 10 + tallest, [span * 0.3, 2.5, 3.5]],
  ['#ff3fb4', 20, 9 + tallest, [span, 3.5, 1.5]],
  ['#6f7dff', 10, 9 + tallest, [0, 4 + tallest * 0.5, -3]],
];
for (const [c, i, d, p] of lights) {
  const l = new THREE.PointLight(c, i, d, 1.4);
  l.position.set(...p);
  scene.add(l);
}

function shadowTexture() {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.6)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const blobTex = shadowTexture();

const actors = [];
stripArts.forEach((art, k) => {
  const sheet = sheets[art];
  const anim = sheet.anims[stripAnim] || sheet.anims.idle;
  const map = toTexture(sheet.canvas);
  const normalMap = toTexture(sheet.normal, { color: false });
  const emissiveMap = toTexture(sheet.emissive);
  const mat = new THREE.MeshStandardMaterial({
    map, normalMap, emissiveMap, emissive: '#ffffff', emissiveIntensity: 2.2,
    alphaTest: 0.5, roughness: 0.62, metalness: 0.2, side: THREE.DoubleSide,
  });
  const w = sheet.frameW / sheet.pxPerUnit, h = sheet.frameH / sheet.pxPerUnit;
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
  const group = new THREE.Group();
  group.position.set(xs[k], 0, 0);
  mesh.rotation.x = -0.32;
  group.add(mesh);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, w * 0.32), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(xs[k], 0.01, 0.1);
  scene.add(group, blob);
  actors.push({ sheet, anim, textures: [map, normalMap, emissiveMap], t: 0, frame: -1 });
});

// each label sits under its own sprite (projected foot point)
const labels = el('div', { class: 'labels' }, stripArts.map((a, k) => {
  const x = (new THREE.Vector3(xs[k], 0, 0).project(camera).x + 1) / 2 * W;
  return el('span', { text: `${a}${a === compare ? ' (compare)' : ''} (${stripAnim})`, style: `left:${x.toFixed(0)}px` });
}));
document.getElementById('app').appendChild(labels);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.85, 0.5, 0.78));
composer.addPass(new OutputPass());

function setFrame(a, i) {
  if (a.frame === i) return;
  a.frame = i;
  const uv = frameUV(a.sheet, i);
  for (const t of a.textures) {
    t.repeat.set(uv.w, uv.h);
    t.offset.set(uv.u, uv.v);
  }
}

let last = performance.now();
let frames = 0;
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const a of actors) {
    a.t += dt;
    const k = Math.floor(a.t * a.anim.fps);
    const n = a.anim.frames.length;
    setFrame(a, a.anim.frames[a.anim.loop ? k % n : Math.min(n - 1, k % (n + 4))]);
  }
  composer.render();
  frames++;
  if (frames === 2) {
    document.getElementById('vp-boot').classList.add('vp-hide');
    window.__PREVIEW = { ready: true, sheets, arts: ARTS };
  }
  requestAnimationFrame(tick);
}
for (const a of actors) setFrame(a, a.anim.frames[0]);
requestAnimationFrame(tick);
