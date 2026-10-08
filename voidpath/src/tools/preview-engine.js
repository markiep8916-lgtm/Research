// Engine preview: a small plain-geometry diorama that exercises the whole post chain
// (bloom, tilt-shift, grade), the transitions and the instrumentation of TECH_PLAN 11.4-11.6.
// Keys:
//   T shatter (to the other scene)   Y fade   U iris   F flash   S shake   H hit-stop
//   G toggle tilt-shift   B toggle bloom   1/2/3 quality low/medium/high
//   R rebuild the arena (fresh materials, compileScene, old view released through programs.release)
//   P perf.simulate(45): one automatic quality drop with its toast
// URL: ?stats=1 shows the perf overlay; ?q=low|medium|high starts on that tier (and locks auto drops).
// window.__PREVIEW: shatter/fade/iris/hold/pin/release, renderInfo(), rebuild(), cycle(n) -> report,
// simulate(ms) -> perf result, perf, engine.
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { release } from '../core/programs.js';
import { perf } from '../core/perf.js';
import { Painter, makeNormalMap, toTexture } from '../art/painter.js';
import { RAMPS, OUTLINE, GLOW } from '../art/palette.js';
import { injectCSS, el, makeRng } from '../core/util.js';

const canvas = document.getElementById('view');
const startQ = new URLSearchParams(location.search).get('q');
const engine = new Engine(canvas, { quality: ['low', 'medium', 'high'].includes(startQ) ? startQ : 'high' });

// ---------------------------------------------------------------- pixel textures (stand-ins)

function floorPlate(base, accent) {
  const s = RAMPS[base];
  const p = new Painter(32, 32);
  const r = makeRng(7);
  p.fill((x, y) => (r() < 0.12 ? s[2] : s[3]));
  p.hline(0, 31, 0, s[4]); p.vline(0, 0, 31, s[4]);
  p.hline(0, 31, 31, s[1]); p.vline(31, 0, 31, s[1]);
  p.hline(2, 29, 15, s[2]); p.hline(2, 29, 16, s[4]);
  for (const [x, y] of [[3, 3], [27, 3], [3, 27], [27, 27]]) { p.px(x, y, s[5]); p.px(x + 1, y + 1, s[1]); }
  if (accent) { p.rect(6, 6, 20, 2, accent); p.rect(6, 24, 20, 2, accent); }
  return p;
}

function hazardPlate() {
  const p = floorPlate('gunmetal');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 8; x++) p.px(x, y, ((x + y) >> 2) & 1 ? RAMPS.gold[4] : RAMPS.gunmetal[0]);
  return p;
}

function wallPanel() {
  const g = RAMPS.gunmetal, s = RAMPS.steel;
  const p = new Painter(32, 96);
  const e = new Painter(32, 96);
  e.rect(0, 0, 32, 96, '#000000');
  p.rect(0, 0, 32, 96, g[3]);
  p.dither(0, 40, 32, 44, g[3], g[2], 0.25);
  p.rect(0, 84, 32, 12, g[1]); p.hline(0, 31, 84, g[4]);
  p.rect(0, 0, 32, 6, s[4]); p.hline(0, 31, 6, s[2]);
  p.vline(0, 6, 83, g[1]); p.vline(31, 6, 83, g[4]);
  p.hline(1, 30, 40, g[1]); p.hline(1, 30, 41, g[4]);
  p.rect(4, 22, 24, 6, g[0]);
  p.rect(5, 23, 22, 4, GLOW.cyan); e.rect(5, 23, 22, 4, GLOW.cyan);
  for (const [x, y] of [[3, 10], [28, 10], [3, 78], [28, 78]]) { p.px(x, y, s[6]); p.px(x + 1, y + 1, g[0]); }
  p.rect(8, 50, 16, 20, g[2]); p.rectOutline(8, 50, 16, 20, g[1]);
  for (let i = 0; i < 4; i++) p.hline(10, 21, 54 + i * 4, g[4]);
  p.px(20, 66, GLOW.amber); e.px(20, 66, GLOW.amber);
  return { p, e };
}

function character(body, hair, visor) {
  const p = new Painter(32, 48);
  p.ellipse(16, 14, 7, 8, RAMPS.skinLight[3]);
  p.rect(9, 6, 14, 5, hair);
  p.rect(10, 22, 12, 16, body);
  p.rect(7, 23, 3, 12, body); p.rect(22, 23, 3, 12, body);
  p.rect(11, 38, 4, 8, RAMPS.steel[3]);
  p.rect(17, 38, 4, 8, RAMPS.steel[3]);
  p.rect(11, 12, 10, 2, visor);
  p.rimShade();
  p.outline(OUTLINE);
  const e = new Painter(32, 48);
  e.rect(0, 0, 32, 48, '#000000');
  e.rect(11, 12, 10, 2, visor);
  return { p, e };
}

const TEX = {};
function tex(name, painter, opts) {
  if (!TEX[name]) TEX[name] = toTexture(painter, opts);
  return TEX[name];
}

function spritePlane(spr, key) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex(key, spr.p),
    normalMap: tex(key + ':n', makeNormalMap(spr.p), { color: false }),
    emissiveMap: tex(key + ':e', spr.e),
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 3,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.75,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5).translate(0, 0.75, 0), mat);
  mesh.rotation.x = -0.32;
  mesh.castShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.01;
  blob.scale.y = 0.55;
  g.add(blob);
  return g;
}

const glowMat = (color, intensity) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 1 });

function addFloor(scene, cols, rows, plates) {
  const geo = new THREE.BoxGeometry(0.98, 0.3, 0.98);
  const groups = plates.map((pl) => ({ ...pl, cells: [] }));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c - cols / 2 + 0.5, z = r - rows / 2 + 0.5;
    groups[plates.findIndex((pl) => pl.test(c, r, x, z))].cells.push([x, z]);
  }
  const m = new THREE.Matrix4();
  for (const g of groups) {
    if (!g.cells.length) continue;
    const inst = new THREE.InstancedMesh(geo, g.material, g.cells.length);
    g.cells.forEach(([x, z], i) => inst.setMatrixAt(i, m.makeTranslation(x, -0.15, z)));
    inst.receiveShadow = true;
    scene.add(inst);
  }
}

function makeCamera(target) {
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const pitch = THREE.MathUtils.degToRad(35), dist = 17;
  cam.position.set(target.x, target.y + Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist);
  cam.lookAt(target);
  return cam;
}

function keyLight(scene, color, intensity, pos) {
  const d = new THREE.DirectionalLight(color, intensity);
  d.position.copy(pos);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  Object.assign(d.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  d.shadow.bias = -0.0004;
  d.shadow.normalBias = 0.03;
  d.shadow.radius = 3;
  scene.add(d, d.target);
  return d;
}

// ---------------------------------------------------------------- scene A: hull corridor

function buildCorridor() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060a14');
  scene.fog = new THREE.FogExp2('#0a1222', 0.035);
  const anim = [];

  const plate = new THREE.MeshStandardMaterial({ map: tex('floor', floorPlate('steel')), roughness: 0.55, metalness: 0.35 });
  const plateDark = new THREE.MeshStandardMaterial({ map: tex('floorDark', floorPlate('gunmetal', RAMPS.gunmetal[2])), roughness: 0.6, metalness: 0.3 });
  const hazard = new THREE.MeshStandardMaterial({ map: tex('hazard', hazardPlate()), roughness: 0.7, metalness: 0.2 });
  addFloor(scene, 18, 14, [
    { material: hazard, test: (c) => c === 4 || c === 13 },
    { material: plateDark, test: (c, r) => (c + r) % 2 === 0 },
    { material: plate, test: () => true },
  ]);

  // back wall with pixel panels and glowing strips
  const wall = wallPanel();
  const wallMat = new THREE.MeshStandardMaterial({
    map: tex('wall', wall.p, { repeat: [18, 1] }), emissiveMap: tex('wallE', wall.e, { repeat: [18, 1] }),
    emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 2.6, roughness: 0.7, metalness: 0.3,
  });
  const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 0.4), wallMat);
  wallMesh.position.set(0, 1.5, -7.2);
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  // amber floor guide strips (emissive > 1 => bloom)
  for (const x of [-4.5, 4.5]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 13.6), glowMat(GLOW.amber, 2.4));
    s.position.set(x, 0.02, 0);
    scene.add(s);
  }

  // pillars at several depths (tilt-shift reads best on vertical things)
  const pillarMat = new THREE.MeshStandardMaterial({ color: RAMPS.steel[3], roughness: 0.5, metalness: 0.5 });
  for (const [x, z] of [[-7, -5], [7, -5], [-7, 0], [7, 0], [-7, 5], [7, 5]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), pillarMat);
    p.position.set(x, 1.6, z);
    p.castShadow = p.receiveShadow = true;
    scene.add(p);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), glowMat(z === 0 ? GLOW.magenta : GLOW.cyan, 3));
    strip.position.set(x, 2.6, z);
    scene.add(strip);
  }

  // floating emissive cubes
  [[GLOW.cyan, -2.6, -3.5], [GLOW.magenta, 0, -5.4], [GLOW.amber, 2.8, -2.4]].forEach(([c, x, z], i) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), glowMat(c, 3.2));
    cube.position.set(x, 1.4, z);
    cube.castShadow = true;
    scene.add(cube);
    anim.push((t) => { cube.rotation.set(t * 0.7 + i, t * 1.1 + i, 0); cube.position.y = 1.4 + Math.sin(t * 1.6 + i * 2) * 0.15; });
  });

  // pixel-art "travelers" at different depths: sharp in the focus band, blurred above/below
  const party = [
    [character(RAMPS.navy[3], RAMPS.hairWhite[2], GLOW.amber), 'kade', -1.2, 0],
    [character(RAMPS.teal[2], RAMPS.hairTeal[3], GLOW.cyan), 'nyx', 0.4, 0.4],
    [character(RAMPS.purple[3], RAMPS.hairCopper[3], GLOW.violet), 'orion', -3.0, -4.6],
    [character(RAMPS.white[3], RAMPS.hairPink[3], GLOW.cyan), 'sera', 2.4, 4.6],
    [character(RAMPS.crimson[2], RAMPS.hairBlack[2], GLOW.red), 'guard', -2.2, 5.2],
  ];
  for (const [spr, key, x, z] of party) {
    const s = spritePlane(spr, key);
    s.position.set(x, 0, z);
    scene.add(s);
  }

  // lights: dim blue fill, amber/cyan/magenta practicals, one shadow-casting key
  scene.add(new THREE.HemisphereLight('#5a78b8', '#141018', 0.55));
  keyLight(scene, '#bcd4ff', 1.6, new THREE.Vector3(-6, 12, 6));
  const pl = [
    ['#ffb054', -3.5, 1.6, 1.5, 14],
    ['#45d8ff', 3.8, 1.8, -1.5, 14],
    ['#ff4fc0', 0.5, 2.2, -5.6, 16],
  ].map(([c, x, y, z, i]) => {
    const l = new THREE.PointLight(c, i, 9, 1.6);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  });
  anim.push((t) => { pl[0].intensity = 14 * (0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.1)); });

  return { scene, camera: makeCamera(new THREE.Vector3(0, 0.6, 0)), update: (t) => anim.forEach((f) => f(t)) };
}

// ---------------------------------------------------------------- scene B: reactor arena

function buildArena() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#12040e');
  scene.fog = new THREE.FogExp2('#1c0614', 0.04);
  const anim = [];

  const plate = new THREE.MeshStandardMaterial({ map: tex('floorArena', floorPlate('purple', RAMPS.magenta[2])), roughness: 0.5, metalness: 0.4 });
  const plateB = new THREE.MeshStandardMaterial({ map: tex('floorArenaB', floorPlate('gunmetal')), roughness: 0.6, metalness: 0.3 });
  addFloor(scene, 18, 14, [{ material: plate, test: (c, r) => (c + r) % 3 === 0 }, { material: plateB, test: () => true }]);

  // reactor core column
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 4, 24, 1, true), glowMat('#ff6a2a', 3.5));
  core.position.set(0, 2, -4);
  scene.add(core);
  const ringMat = new THREE.MeshStandardMaterial({ color: RAMPS.gunmetal[3], metalness: 0.6, roughness: 0.4 });
  for (const y of [0.3, 1.6, 2.9]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 8, 28), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, -4);
    ring.castShadow = true;
    scene.add(ring);
  }
  anim.push((t) => { core.material.emissiveIntensity = 3 + Math.sin(t * 3) * 0.8; });

  // ring of emissive pylons
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 0.4), new THREE.MeshStandardMaterial({ color: RAMPS.gunmetal[2], roughness: 0.6 }));
    p.position.set(Math.cos(a) * 6.5, 0.9, Math.sin(a) * 4.8);
    p.castShadow = true;
    scene.add(p);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.42), glowMat(i % 2 ? GLOW.magenta : GLOW.red, 3.5));
    cap.position.set(p.position.x, 1.9, p.position.z);
    scene.add(cap);
  }

  const enemy = spritePlane(character(RAMPS.crimson[3], RAMPS.hairBlack[1], GLOW.red), 'enemy');
  enemy.position.set(-2, 0, 0);
  enemy.scale.setScalar(1.3);
  scene.add(enemy);
  const hero = spritePlane(character(RAMPS.navy[3], RAMPS.hairWhite[2], GLOW.amber), 'kade');
  hero.position.set(2.2, 0, 0.6);
  scene.add(hero);

  scene.add(new THREE.HemisphereLight('#7a4a8a', '#140810', 0.5));
  keyLight(scene, '#ffc2a8', 1.4, new THREE.Vector3(6, 12, 5));
  const red = new THREE.PointLight('#ff3b4e', 16, 10, 1.6);
  red.position.set(-3, 2.5, 1);
  const orange = new THREE.PointLight('#ff8a3a', 20, 10, 1.6);
  orange.position.set(0, 2, -2.6);
  scene.add(red, orange);
  anim.push((t) => { red.position.x = Math.cos(t * 1.4) * 4; red.position.z = Math.sin(t * 1.4) * 3; });

  return { scene, camera: makeCamera(new THREE.Vector3(0, 0.8, 0)), update: (t) => anim.forEach((f) => f(t)) };
}

// ---------------------------------------------------------------- run

const views = [buildCorridor(), buildArena()];
let current = 0;
const show = (i) => { current = i; engine.setView(views[i].scene, views[i].camera); };
show(0);

// Free a view the way World.dispose / BattleStage.dispose do: geometries disposed, materials
// released through the program anchor (never material.dispose()).
function disposeView(v) {
  v.scene.traverse((o) => {
    o.geometry?.dispose();
    if (o.isInstancedMesh) o.dispose();
    if (o.material) release(o.material);
    if (o.isLight) o.dispose();
  });
}

const nextFrames = (n) => new Promise((resolve) => {
  let k = 0;
  const off = engine.onUpdate(() => { if (++k >= n) { off(); resolve(); } });
});

/** Rebuild the arena from scratch (like a map revisit) and report how many programs it linked. */
async function rebuild() {
  const before = engine.renderInfo();
  engine.markCompiles();
  const fresh = buildArena();
  await engine.compileScene(fresh.scene, fresh.camera);
  const compiled = engine.renderInfo().compilesSince;
  const old = views[1];
  views[1] = fresh;
  show(1);
  disposeView(old);
  await nextFrames(3);
  const after = engine.renderInfo();
  return {
    compileScene: compiled, total: after.compilesSince, programs: after.programs, anchors: after.anchors,
    textures: [before.textures, after.textures], geometries: [before.geometries, after.geometries],
  };
}

engine.onUpdate((dt, t) => views[current].update(t));

const swap = () => show(1 - current);
// Fire-and-forget so a test step like {"eval": "window.__PREVIEW.shatter()"} does not wait for the end.
const run = (type, opts = {}) => {
  api.last = engine.transition(type, { onMidpoint: swap, ...opts });
  api.last.catch((e) => console.warn('transition failed', e));
  return true;
};
const api = {
  ready: false,
  engine,
  last: null,
  shatter: (opts) => run('shatter', opts),
  fade: (opts) => run('fade', opts),
  iris: (opts) => run('iris', opts),
  /** Start a transition held at progress p (0..1 of its cover phase) for screenshots; release() resumes. */
  hold(type, p) {
    engine.transitionTimeScale = 0;
    run(type);
    api.pin(p);
    return true;
  },
  shatterAt: (p) => api.hold('shatter', p),
  /** Move a held transition to progress p. */
  pin(p) {
    const pin = () => {
      const tr = engine._tr;
      if (!tr || tr.phase === 'capture') { requestAnimationFrame(pin); return; }
      tr.t = p * tr.outDur;
    };
    requestAnimationFrame(pin);
    return true;
  },
  release() { engine.transitionTimeScale = 1; },
  renderInfo: () => engine.renderInfo(),
  rebuild,
  /** n rebuilds in a row; every one after the first should link nothing (compiles === 0). */
  async cycle(n = 3) {
    const runs = [];
    for (let i = 0; i < n; i++) runs.push(await rebuild());
    api.cycleReport = runs;
    paintCycle();
    return runs;
  },
  cycleReport: null,
  simulate: (ms = 45) => perf.simulate(ms).then((r) => { api.perfResult = r; paintCycle(); return r; }),
  perfResult: null,
  perf,
  setTiltShift: (on) => engine.setFx({ tiltShift: { enabled: on } }),
  setBloom: (on) => engine.setFx({ bloom: { enabled: on } }),
  show,
};
window.__PREVIEW = api;

// ---------------------------------------------------------------- HUD + keys

injectCSS('preview-engine', `
.pe-hud { position: absolute; left: 14px; top: 14px; padding: 10px 14px; background: var(--vp-panel);
  border: 1px solid var(--vp-line-dim); font: 12px/1.55 var(--vp-font-ui); color: var(--vp-ink-dim); letter-spacing: .02em; }
.pe-hud b { color: var(--vp-amber); font-family: var(--vp-font-display); letter-spacing: .18em; font-size: 11px; }
.pe-hud kbd { display: inline-block; min-width: 14px; padding: 0 4px; margin-right: 4px; border: 1px solid var(--vp-line-dim);
  color: var(--vp-ink); font: 11px var(--vp-font-pixel); text-align: center; }
.pe-hud .pe-stat { color: var(--vp-cyan); }
.pe-hud .pe-info, .pe-hud .pe-cycle { font: 11px/1.5 ui-monospace, 'Courier New', monospace; color: var(--vp-ink); white-space: pre; }
.pe-hud .pe-cycle { color: var(--vp-amber); }
body.has-stats .pe-hud { top: auto; bottom: 14px; }
@media (max-width: 600px) { .pe-hud { font-size: 11px; padding: 8px 10px; } .pe-hud .pe-keys { display: none; } }
`);
const stat = el('div', { class: 'pe-stat' });
const info = el('div', { class: 'pe-info' });
const cyc = el('div', { class: 'pe-cycle' });
const hud = el('div', { class: 'pe-hud vp-passthrough' }, [
  el('b', { text: 'ENGINE PREVIEW' }),
  stat,
  info,
  cyc,
  el('div', { class: 'pe-keys', html: [
    '<kbd>T</kbd>shatter <kbd>Y</kbd>fade <kbd>U</kbd>iris',
    '<kbd>F</kbd>flash <kbd>S</kbd>shake <kbd>H</kbd>hit-stop',
    '<kbd>G</kbd>tilt-shift <kbd>B</kbd>bloom <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>quality',
    '<kbd>R</kbd>rebuild arena <kbd>P</kbd>simulate 45 ms frames',
  ].join('<br>') }),
]);
document.getElementById('ui-root').appendChild(hud);

let frames = 0, since = performance.now();
engine.onUpdate(() => {
  frames++;
  const now = performance.now();
  if (now - since < 500) return;
  const fps = (frames * 1000) / (now - since);
  frames = 0;
  since = now;
  const fx = engine.getFx();
  const r = engine.renderSize;
  stat.textContent = `${engine.quality} | ${r.width}x${r.height} | ${fps.toFixed(0)} fps | tilt ${fx.tiltShift.enabled ? 'on' : 'off'} | bloom ${fx.bloom.enabled ? 'on' : 'off'}`;
  const ri = engine.renderInfo();
  info.textContent = [
    `scene  ${ri.scene.calls} calls  ${(ri.scene.triangles / 1000).toFixed(1)}k tris`,
    `shadow ${ri.shadow.calls} calls  ${(ri.shadow.triangles / 1000).toFixed(1)}k tris`,
    `post   ${ri.post.calls} calls`,
    `programs ${ri.programs}  compiles ${ri.compiles}  anchors ${ri.anchors}`,
    `lights ${ri.lights.point}p ${ri.lights.spot}s ${ri.lights.dir}d  textures ${ri.textures}`,
  ].join('\n');
});

function paintCycle() {
  const lines = [];
  if (api.cycleReport) lines.push(`rebuilds: compiles ${api.cycleReport.map((c) => c.total).join(' / ')}`);
  const pr = api.perfResult;
  if (pr) lines.push(pr.dropped ? `auto drop ${pr.from} -> ${pr.to} (avg ${pr.avg} ms)` : `no drop (${pr.blocked || 'fast'}, avg ${pr.avg} ms)`);
  cyc.textContent = lines.join('\n');
}

const actions = {
  KeyT: () => api.shatter(),
  KeyY: () => api.fade(),
  KeyU: () => api.iris(),
  KeyF: () => engine.flash('#ffffff', 0.3, 0.8),
  KeyS: () => engine.shake(0.18, 0.4),
  KeyH: () => { engine.hitStop(250); engine.flash('#ff4fa3', 0.2, 0.5); engine.shake(0.12, 0.25); },
  KeyG: () => api.setTiltShift(!engine.getFx().tiltShift.enabled),
  KeyB: () => api.setBloom(!engine.getFx().bloom.enabled),
  Digit1: () => engine.setQuality('low'),
  Digit2: () => engine.setQuality('medium'),
  Digit3: () => engine.setQuality('high'),
  KeyR: () => { rebuild().then((r) => { api.cycleReport = [...(api.cycleReport || []), r]; paintCycle(); }); },
  KeyP: () => { api.simulate(45); },
};
if (new URLSearchParams(location.search).get('stats') === '1') document.body.classList.add('has-stats');
window.addEventListener('keydown', (e) => {
  const fn = actions[e.code];
  if (!fn || e.repeat) return;
  e.preventDefault();
  fn();
});

engine.start();
let warm = 0;
const off = engine.onUpdate(() => {
  if (++warm < 3) return;
  off();
  document.getElementById('vp-boot').classList.add('vp-hide');
  api.ready = true;
});
