// Preview: party + NPC sprites from art/characters.js.
// URL params: ?show=three,field,battle,lineup,portraits,npc,sheets,bframes  &char=kade  &scale=4  &t=0.6 (freeze time)
//             bframes: &bscale=5 &frames=0,7   portraits: &pscale=6
import * as THREE from 'three';
import * as C from '../art/characters.js';
import { Painter, toTexture } from '../art/painter.js';
import { injectCSS, el } from '../core/util.js';

const params = new URLSearchParams(location.search);
const SCALE = Number(params.get('scale') || 4);
const SHOW = new Set((params.get('show') || 'three,field,battle,lineup,portraits,npc,sheets').split(','));
const ONLY = params.get('char');
const FREEZE = params.has('t') ? Number(params.get('t')) : null;
const IDS = ONLY ? [ONLY] : C.PARTY_IDS;

// Build every sheet up front (builders cache), so the timing covers the whole module's art generation.
const T0 = performance.now();
const TIMES = {};
const timed = (k, fn) => { const t = performance.now(); fn(); TIMES[k] = Math.round(performance.now() - t); };
for (const id of C.PARTY_IDS) {
  timed(`field:${id}`, () => C.buildFieldSprite(id));
  timed(`battle:${id}`, () => C.buildBattleSprite(id));
  timed(`portrait:${id}`, () => C.buildPortrait(id));
}
for (const k of ['bolt', 'holo']) timed(`npc:${k}`, () => C.buildNpcSprite(k));
const BUILD_MS = Math.round(performance.now() - T0);

injectCSS('preview-characters', `
  html, body { overflow: auto !important; height: auto !important; touch-action: auto; user-select: text; }
  #app { position: static !important; overflow: visible !important; background: #070a12; min-height: 100vh; }
  #view { display: none; }
  #ui-root { position: static !important; pointer-events: auto; padding: 16px 20px 40px; }
  .pc-h1 { font: 700 20px var(--vp-font-display); letter-spacing: .3em; color: var(--vp-amber); margin: 0 0 4px; }
  .pc-sub { font: 13px var(--vp-font-ui); color: var(--vp-ink-dim); margin: 0 0 14px; }
  .pc-sec { margin: 18px 0 8px; font: 600 13px var(--vp-font-display); letter-spacing: .25em; color: var(--vp-cyan); text-transform: uppercase; border-bottom: 1px solid var(--vp-line-dim); padding-bottom: 4px; }
  .pc-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin: 6px 0 10px; }
  .pc-cell { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .pc-cell canvas { image-rendering: pixelated; background: #0e1424; border: 1px solid #1b2440; display: block; }
  .pc-lab { font: 11px var(--vp-font-pixel); color: var(--vp-ink-dim); letter-spacing: .05em; }
  .pc-name { font: 700 16px var(--vp-font-display); letter-spacing: .25em; color: var(--vp-ink); margin: 14px 0 0; }
  .pc-three { width: 100%; height: 400px; display: block; border: 1px solid #1b2440; background: #05070d; }
`);
document.getElementById('vp-boot')?.remove();
const root = document.getElementById('ui-root');
root.append(el('h1', { class: 'pc-h1', text: 'VOIDPATH / CHARACTERS' }), el('p', { class: 'pc-sub', text: `Party and NPC pixel art: field 32x48, battle 64x64 (facing left), portraits 40x40, nearest-neighbour. All sheets generated in ${BUILD_MS} ms.` }));

// ---------------------------------------------------------------- animated DOM canvases

const animated = [];
let threeTick = null; // set by setupThree() when the 3D strip is shown

function frameCanvas(sheet, index, scale) {
  const c = document.createElement('canvas');
  c.width = sheet.frameW * scale;
  c.height = sheet.frameH * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  blitFrame(ctx, sheet, index, scale);
  return c;
}

function blitFrame(ctx, sheet, index, scale, src = sheet.canvas) {
  const fw = sheet.frameW, fh = sheet.frameH;
  ctx.clearRect(0, 0, fw * scale, fh * scale);
  ctx.drawImage(src, (index % sheet.cols) * fw, Math.floor(index / sheet.cols) * fh, fw, fh, 0, 0, fw * scale, fh * scale);
}

function animCell(sheet, name, scale, label = name) {
  const a = sheet.anims[name];
  const c = frameCanvas(sheet, a.frames[0], scale);
  animated.push({ sheet, a, ctx: c.getContext('2d'), scale, last: -1 });
  return el('div', { class: 'pc-cell' }, [c, el('span', { class: 'pc-lab', text: label })]);
}

function staticCell(canvas, scale, label) {
  const c = document.createElement('canvas');
  c.width = canvas.width * scale;
  c.height = canvas.height * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  return el('div', { class: 'pc-cell' }, [c, el('span', { class: 'pc-lab', text: label })]);
}

function animIndex(a, t) {
  const n = a.frames.length;
  let k = Math.floor(t * a.fps);
  if (a.loop) k %= n;
  else k = Math.min(n - 1, k % (n + Math.ceil(a.fps * 0.8))); // once: hold the last frame, then replay
  return a.frames[k];
}

// ---------------------------------------------------------------- sections

const FIELD_ANIMS = ['idle_down', 'walk_down', 'idle_up', 'walk_up', 'idle_side', 'walk_side'];
const BATTLE_ANIMS = ['idle', 'ready', 'attack', 'shoot', 'cast', 'item', 'hurt', 'defend', 'ko', 'victory'];

if (SHOW.has('three')) {
  root.append(el('div', { class: 'pc-sec', text: 'Lit in three.js (MeshStandardMaterial + normal + emissive maps, amber + cyan point lights)' }));
  const cv = el('canvas', { class: 'pc-three' });
  root.append(cv);
  setupThree(cv);
}

const section = (text) => root.append(el('div', { class: 'pc-sec', text }));
const framesRow = (sheet, scale) => {
  const row = el('div', { class: 'pc-row' });
  for (let k = 0; k < sheet.count; k++) row.append(el('div', { class: 'pc-cell' }, [frameCanvas(sheet, k, scale), el('span', { class: 'pc-lab', text: String(k) })]));
  return row;
};

if (SHOW.has('field')) {
  section(`Field sprites, animated (${SCALE}x): idle / walk in each direction, portrait`);
  for (const id of IDS) {
    root.append(el('div', { class: 'pc-name', text: id.toUpperCase() }));
    const field = C.buildFieldSprite(id);
    const row = el('div', { class: 'pc-row' });
    for (const n of FIELD_ANIMS) row.append(animCell(field, n, SCALE));
    row.append(staticCell(C.buildPortrait(id), SCALE, 'portrait'));
    root.append(row);
  }
}

if (SHOW.has('battle')) {
  section('Battle sprites, animated (3x), facing left');
  for (const id of IDS) {
    root.append(el('div', { class: 'pc-name', text: id.toUpperCase() }));
    const battle = C.buildBattleSprite(id);
    const row = el('div', { class: 'pc-row' });
    for (const n of BATTLE_ANIMS) row.append(animCell(battle, n, 3));
    root.append(row);
  }
}

if (SHOW.has('lineup')) {
  section('Battle line-up: every pose, facing left (2x)');
  for (const n of BATTLE_ANIMS) {
    const row = el('div', { class: 'pc-row' });
    for (const id of IDS) {
      const s = C.buildBattleSprite(id);
      for (const k of [...new Set(s.anims[n].frames)]) row.append(el('div', { class: 'pc-cell' }, [frameCanvas(s, k, 2), el('span', { class: 'pc-lab', text: `${id} ${n}` })]));
    }
    root.append(row);
  }
}

if (SHOW.has('portraits')) {
  const ps = Number(params.get('pscale') || 6);
  section(`Portraits (${ps}x)`);
  const row = el('div', { class: 'pc-row' });
  for (const id of [...IDS, 'bolt', 'holo']) row.append(staticCell(C.buildPortrait(id), ps, id));
  const img = el('img', { src: C.portraitURL(IDS[0], 3), alt: 'portraitURL', style: { imageRendering: 'pixelated', alignSelf: 'flex-end' } });
  row.append(el('div', { class: 'pc-cell' }, [img, el('span', { class: 'pc-lab', text: 'portraitURL 3x' })]));
  root.append(row);
}

if (SHOW.has('npc')) {
  section(`NPCs: BOLT and the HALCYON hologram (${SCALE}x)`);
  for (const kind of ['bolt', 'holo']) {
    const s = C.buildNpcSprite(kind);
    const row = el('div', { class: 'pc-row' });
    for (const n of FIELD_ANIMS) row.append(animCell(s, n, SCALE, `${kind} ${n}`));
    root.append(row);
  }
}

if (SHOW.has('bframes')) {
  const bs = Number(params.get('bscale') || 5);
  const pick = params.get('frames') ? params.get('frames').split(',').map(Number) : null;
  const row = el('div', { class: 'pc-row' });
  for (const id of IDS) {
    const s = C.buildBattleSprite(id);
    if (pick) for (const k of pick) row.append(el('div', { class: 'pc-cell' }, [frameCanvas(s, k, bs), el('span', { class: 'pc-lab', text: `${id} ${k}` })]));
    else { section(`${id} / every battle frame (${bs}x)`); root.append(framesRow(s, bs)); }
  }
  if (pick) root.append(row);
}

if (SHOW.has('sheets')) {
  for (const id of IDS) {
    const field = C.buildFieldSprite(id), battle = C.buildBattleSprite(id);
    section(`${id} / every field frame (${SCALE}x), every battle frame (2x), normal + emissive maps`);
    root.append(framesRow(field, SCALE), framesRow(battle, 2));
    const maps = el('div', { class: 'pc-row' });
    maps.append(staticCell(field.normal, 2, 'field normal'), staticCell(field.emissive, 2, 'field emissive'));
    maps.append(staticCell(battle.normal, 1, 'battle normal'), staticCell(battle.emissive, 1, 'battle emissive'));
    root.append(maps);
  }
}

// ---------------------------------------------------------------- three.js strip

function floorTexture() {
  const p = new Painter(32, 32);
  p.rect(0, 0, 32, 32, '#1a2131');
  p.dither(0, 0, 32, 32, '#1a2131', '#1d2537', 0.3);
  p.hline(0, 31, 0, '#0d121d');
  p.vline(0, 0, 31, '#0d121d');
  p.hline(1, 31, 1, '#252e43');
  p.vline(1, 1, 31, '#232c40');
  p.px(4, 4, '#3a4660'); p.px(27, 4, '#3a4660'); p.px(4, 27, '#3a4660'); p.px(27, 27, '#3a4660');
  return toTexture(p, { repeat: [16, 6] });
}

function setupThree(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  const w = canvas.clientWidth || 1200, h = canvas.clientHeight || 400;
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05070d');
  scene.fog = new THREE.FogExp2('#05070d', 0.06);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
  cam.position.set(0, 2.5, 5.6);
  cam.lookAt(0, 0.72, 0);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.85, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(new THREE.AmbientLight('#3a4a6a', 0.7));
  const fill = new THREE.DirectionalLight('#c9d8ff', 0.9);
  fill.position.set(-0.5, 2, 4);
  scene.add(fill);
  const amber = new THREE.PointLight('#ffa24a', 7, 6, 1.4);
  amber.position.set(-3.4, 1.5, 1.2);
  scene.add(amber);
  const cyan = new THREE.PointLight('#3fd8ff', 6, 6, 1.4);
  cyan.position.set(3.4, 1.3, 1.0);
  scene.add(cyan);
  for (const [l, c] of [[amber, '#ffb366'], [cyan, '#7fe9ff']]) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: c }));
    bulb.position.copy(l.position);
    scene.add(bulb);
  }

  const actors = [];
  const add = (sheet, anim, x, z, flip = false) => {
    const mk = (src, color) => {
      const t = toTexture(src, { color });
      t.repeat.set(1 / sheet.cols, 1 / sheet.rows);
      return t;
    };
    const mat = new THREE.MeshStandardMaterial({
      map: mk(sheet.canvas, true),
      normalMap: mk(sheet.normal, false),
      emissiveMap: sheet.emissive ? mk(sheet.emissive, true) : null,
      emissive: sheet.emissive ? new THREE.Color('#ffffff') : new THREE.Color('#000000'),
      emissiveIntensity: 1.8,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.05,
    });
    const gw = sheet.frameW / 32, gh = sheet.frameH / 32;
    const geo = new THREE.PlaneGeometry(gw, gh);
    geo.translate(0, gh / 2, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    mesh.rotation.x = -0.32;
    if (flip) mesh.scale.x = -1;
    scene.add(mesh);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.45, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.01, z + 0.02);
    shadow.scale.set(1, 0.6, 1);
    scene.add(shadow);
    actors.push({ sheet, a: sheet.anims[anim], mat, last: -1 });
  };
  const npcs = C.buildNpcSprite ? [C.buildNpcSprite('bolt'), C.buildNpcSprite('holo')] : [];
  const list = IDS.map((id) => C.buildFieldSprite(id));
  const all = [...list, ...npcs];
  const n = all.length;
  all.forEach((s, k) => add(s, 'walk_down', -((n - 1) * 0.95) / 2 + k * 0.95, 0.7));
  list.forEach((s, k) => add(s, k % 2 ? 'walk_side' : 'idle_side', -2.4 + k * 1.6, -0.6, k % 2 === 1));
  list.forEach((s, k) => add(s, 'idle_up', -3.9 + k * 0.6, -1.5));

  const setFrame = (act, idx) => {
    const s = act.sheet, col = idx % s.cols, row = Math.floor(idx / s.cols);
    for (const t of [act.mat.map, act.mat.normalMap, act.mat.emissiveMap]) {
      if (!t) continue;
      t.offset.set(col / s.cols, 1 - (row + 1) / s.rows);
    }
  };
  threeTick = (t) => {
    amber.intensity = 7 + Math.sin(t * 3.1) * 0.8;
    for (const act of actors) {
      const idx = animIndex(act.a, t);
      if (idx !== act.last) { setFrame(act, idx); act.last = idx; }
    }
    renderer.render(scene, cam);
  };
}
// ---------------------------------------------------------------- loop

const t0 = performance.now();
function tick(now) {
  const t = FREEZE ?? (now - t0) / 1000;
  for (const it of animated) {
    const idx = animIndex(it.a, t);
    if (idx !== it.last) { blitFrame(it.ctx, it.sheet, idx, it.scale); it.last = idx; }
  }
  threeTick?.(t);
  if (FREEZE == null) requestAnimationFrame(tick);
}
requestAnimationFrame((now) => {
  tick(now);
  window.__PREVIEW = { ready: true, buildMs: BUILD_MS, times: TIMES, api: C };
});
