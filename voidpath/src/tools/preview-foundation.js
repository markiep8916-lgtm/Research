// Foundation preview: the painter -> normal map -> lit sprite smoke test, plus the content pipeline
// in the browser (TECH_PLAN 2.6, 11.5): registerAll() twice (the second call must change nothing),
// collectArt() for every location, and prewarmLocation() of one location with thumbnails of what
// it painted and the art cache's size.
// URL: ?loc=<location> (default prologue) &chapter=<chapter> (preload/extends gate, default its own)
// window.__PREVIEW = { ready, registry: { first, second, unchanged }, collect: { loc: { tex, npc, enemy,
//   portrait } }, prewarm: { loc, jobs, painted, ms, cacheMB }, jobs, REG }
import * as THREE from 'three';
import { Painter, makeNormalMap, toTexture } from '../art/painter.js';
import { RAMPS, OUTLINE } from '../art/palette.js';
import { artCache } from '../art/cache.js';
import { registerAll, REG } from '../content/index.js';
import { collectArt, prewarmLocation, paintJob } from '../content/prewarm.js';
import { injectCSS, el } from '../core/util.js';

const params = new URLSearchParams(location.search);
const api = { ready: false, REG };
window.__PREVIEW = api;

// ---------------------------------------------------------------- painter smoke sprite

const p = new Painter(32, 48);
p.ellipse(16, 14, 7, 8, RAMPS.skinLight[3]);
p.rect(10, 22, 12, 16, RAMPS.navy[3]);
p.rect(11, 38, 4, 8, RAMPS.steel[3]);
p.rect(17, 38, 4, 8, RAMPS.steel[3]);
p.rect(11, 12, 10, 2, '#ffbf4d');
p.rimShade();
p.outline(OUTLINE);
const normal = makeNormalMap(p);

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(innerWidth, innerHeight, false);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0f1c');
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
cam.position.set(2.4, 3.75, 14);
cam.lookAt(2.4, 3.75, 0);
const mat = new THREE.MeshStandardMaterial({ map: toTexture(p), normalMap: toTexture(normal, { color: false }), alphaTest: 0.5, side: THREE.DoubleSide });
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), mat);
mesh.position.y = 0.75;
scene.add(mesh);
const l1 = new THREE.PointLight('#ff8a3a', 6, 6);
l1.position.set(-1.2, 1.2, 0.6);
const l2 = new THREE.PointLight('#3ad8ff', 6, 6);
l2.position.set(1.2, 1.0, 0.6);
scene.add(l1, l2, new THREE.AmbientLight('#334', 1));
renderer.render(scene, cam);

// ---------------------------------------------------------------- panel

injectCSS('preview-foundation', `
.pf { position: absolute; left: 16px; top: 16px; right: 16px; bottom: 16px; display: flex; gap: 18px; align-items: flex-start; pointer-events: none; }
.pf-col { background: var(--vp-panel); border: 1px solid var(--vp-line-dim); padding: 12px 14px; overflow: hidden; pointer-events: auto; }
.pf-col.info { width: 380px; flex: none; }
.pf-col.thumbs { flex: 1; overflow: auto; max-height: 100%; }
.pf b { display: block; color: var(--vp-amber); font: 11px var(--vp-font-display); letter-spacing: .18em; margin: 0 0 8px; }
.pf pre { margin: 0 0 12px; font: 11px/1.5 ui-monospace, 'Courier New', monospace; color: var(--vp-ink); white-space: pre-wrap; }
.pf .ok { color: #7fe3a0; } .pf .bad { color: #ff8f8f; }
.pf-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.pf-t { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 72px; }
.pf-t canvas { width: 64px; height: 64px; image-rendering: pixelated; background: #05080d; border: 1px solid var(--vp-line-dim); object-fit: contain; }
.pf-t span { font: 9px/1.2 ui-monospace, monospace; color: var(--vp-ink-dim); text-align: center; word-break: break-all; }
@media (max-width: 700px) { .pf { flex-direction: column; } .pf-col.info { width: auto; } }
`);
const info = el('pre');
const prewarmInfo = el('pre');
const grid = el('div', { class: 'pf-grid' });
const thumbTitle = el('b', { text: 'PREWARMED ART' });
document.getElementById('ui-root').appendChild(el('div', { class: 'pf' }, [
  el('div', { class: 'pf-col info' }, [el('b', { text: 'CONTENT PIPELINE' }), info, el('b', { text: 'PREWARM' }), prewarmInfo]),
  el('div', { class: 'pf-col thumbs' }, [thumbTitle, grid]),
]));

// A 64x64 thumbnail of the first frame of whatever a builder returned.
function thumb(job, value) {
  const src = value?.map || value?.canvas || value;
  if (!src || !src.width) return;
  const fw = value?.frameW || (value?.frames > 1 ? value.w : src.width);
  const fh = value?.frameH || src.height;
  const c = el('canvas');
  const k = Math.min(64 / fw, 64 / fh);
  c.width = Math.max(1, Math.round(fw * k));
  c.height = Math.max(1, Math.round(fh * k));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, fw, fh, 0, 0, c.width, c.height);
  grid.appendChild(el('div', { class: 'pf-t' }, [c, el('span', { text: `${job.kind}:${job.key}` })]));
}

const count = () => ({
  locations: Object.keys(REG.locations).length, maps: Object.keys(REG.maps).length, scripts: Object.keys(REG.scripts).length,
  scenes: REG.scenes.length, objectives: Object.keys(REG.objectives).length, destinations: REG.destinations.length,
  arenas: Object.keys(REG.arenas).length, props: Object.keys(REG.props).length, actionFx: Object.keys(REG.actionFx).length,
});

async function run() {
  const first = count();
  registerAll();
  const afterFirst = count();
  registerAll();
  const second = count();
  const unchanged = JSON.stringify(afterFirst) === JSON.stringify(second);
  api.registry = { before: first, first: afterFirst, second, unchanged };

  const loc = params.get('loc') || 'prologue';
  const chapter = params.get('chapter') || REG.locations[loc]?.chapter || 'prologue';
  api.collect = {};
  for (const id of Object.keys(REG.locations)) {
    const jobs = collectArt(id, { chapter: REG.locations[id].chapter });
    api.collect[id] = jobs.reduce((o, j) => ({ ...o, [j.kind]: (o[j.kind] || 0) + 1 }), {});
  }
  info.innerHTML = [
    `registerAll() x2: <span class="${unchanged ? 'ok' : 'bad'}">${unchanged ? 'second call changed nothing' : 'CHANGED'}</span>`,
    ...Object.entries(second).map(([k, v]) => `  ${k.padEnd(12)} ${v}`),
    '',
    'collectArt per location (tex / npc / enemy / portrait):',
    ...Object.entries(api.collect).map(([id, c]) => `  ${id.padEnd(12)} ${['tex', 'npc', 'enemy', 'portrait'].map((k) => c[k] || 0).join(' / ')}`),
  ].join('\n');

  const before = artCache.bytes;
  const res = await prewarmLocation(loc, { chapter });
  api.jobs = collectArt(loc, { chapter });
  for (const j of api.jobs) thumb(j, paintJob(j));
  api.prewarm = { loc, chapter, ...res, cacheMB: Math.round((artCache.bytes / 1048576) * 10) / 10, addedMB: Math.round(((artCache.bytes - before) / 1048576) * 10) / 10 };
  thumbTitle.textContent = `PREWARMED ART: ${loc.toUpperCase()} (${api.jobs.length})`;
  prewarmInfo.textContent = [
    `prewarmLocation('${loc}', { chapter: '${chapter}' })`,
    `  jobs ${res.jobs}  painted ${res.painted}  ${res.ms} ms`,
    `  art cache ${api.prewarm.cacheMB} MB (+${api.prewarm.addedMB} MB)`,
    `  by location ${Object.entries(artCache.stats?.().byLoc || {}).map(([k, v]) => `${k} ${(v / 1048576).toFixed(1)} MB`).join(', ')}`,
  ].join('\n');
  document.getElementById('vp-boot').classList.add('vp-hide');
  api.ready = true;
}

run().catch((e) => setTimeout(() => { throw e; }));
