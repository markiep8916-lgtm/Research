// Themed background / decoration builders. Everything here is purely visual.
import * as THREE from 'three';
import { T, FLAGS, F_SOLID } from '../sim/tiles.js';
import { getTexture } from './textures.js';
import { Instancer, hsl } from './instancer.js';
import { glowSprite } from './models/common.js';
import { rng } from '../core/util.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const CONE = new THREE.ConeGeometry(1, 1, 7);
const ICO1 = new THREE.IcosahedronGeometry(1, 1);
const OCT = new THREE.OctahedronGeometry(1, 0);

function ridge(view, { z, top, depth = 140, color, amp, seed, width, step = 9, mix = 0.0 }) {
  const r = rng(seed);
  const shape = new THREE.Shape();
  const x0 = -width / 2, x1 = view.def.w + width / 2;
  shape.moveTo(x0, top - depth);
  let y = top;
  for (let x = x0; x <= x1; x += step) {
    y = top + (Math.sin(x * 0.011 + seed) * 0.5 + Math.sin(x * 0.027 + seed * 2) * 0.3 + (r() - 0.5) * 0.35) * amp;
    shape.lineTo(x, y);
  }
  shape.lineTo(x1, top - depth);
  shape.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), view.m(new THREE.MeshBasicMaterial({ color, fog: false })));
  m.position.z = z;
  view.group.add(m);
  return m;
}

function floorsAndCeilings(def) {
  const floors = [], ceils = [];
  const { w, h, tiles } = def;
  const solid = (x, y) => x < 0 || x >= w || y < 0 || y >= h || (FLAGS[tiles[y * w + x]] & F_SOLID) !== 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (solid(x, y)) continue;
    if (tiles[y * w + x] !== T.EMPTY) continue;
    if (solid(x, y - 1) && tiles[(y - 1) * w + x] === T.SOLID) floors.push([x, y]);
    if (solid(x, y + 1) && tiles[(y + 1) * w + x] === T.SOLID) ceils.push([x, y + 1]);
  }
  return { floors, ceils };
}

function cloudLayer(view, def, { count, color = 0xffffff, opacity = 0.55, zMin = -180, zMax = -120, yMin, yMax, size = 90 }) {
  const r = view.rand, tex = getTexture('cloud');
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: opacity * (0.6 + r() * 0.5), depthWrite: false, fog: false });
    view.m(m);
    const s = new THREE.Sprite(m);
    const sz = size * (0.7 + r() * 0.9);
    s.scale.set(sz * 2, sz, 1);
    s.position.set(-120 + r() * (def.w + 240), yMin + r() * (yMax - yMin), zMin + r() * (zMax - zMin));
    s.userData.v = 0.4 + r() * 0.9;
    view.group.add(s);
    clouds.push(s);
  }
  view.anims.push((t, dt) => {
    for (const c of clouds) { c.position.x += c.userData.v * dt; if (c.position.x > def.w + 140) c.position.x = -140; }
  });
}

function torchAt(view, x, y) {
  const g = new THREE.Group();
  g.position.set(x, y, -1.1);
  const wood = view.m(new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.9 }));
  const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 8), wood); bracket.castShadow = true;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.1, 0.22, 10), view.m(new THREE.MeshStandardMaterial({ color: 0x2c2c30, metalness: 0.6, roughness: 0.4 }))); cup.position.y = 0.5;
  g.add(bracket, cup);
  const flame = glowSprite(0xff8a2a, 1.7, 0.95, getTexture('glow')); flame.position.y = 0.95; flame.material.fog = false;
  const core = glowSprite(0xffe08a, 0.8, 1, getTexture('glow')); core.position.y = 0.9;
  const halo = glowSprite(0xff6a1a, 4.2, 0.22, getTexture('glow')); halo.position.y = 1.0;
  view.mats.push(flame.material, core.material, halo.material);
  g.add(halo, flame, core);
  view.group.add(g);
  const ph = Math.random() * 10;
  view.anims.push((t) => {
    const f = 0.85 + Math.sin(t * 13 + ph) * 0.1 + Math.sin(t * 23 + ph * 2) * 0.08;
    flame.scale.set(1.5 * f, 1.9 * f, 1); core.scale.set(0.8 * f, 0.9 * f, 1); halo.material.opacity = 0.2 + (f - 0.85) * 0.5;
  });
  view.pointLights.push({ x, y: y + 1, z: 2.2, color: 0xff8a3a, intensity: 46, distance: 17, flicker: ph });
}

function jungle(view, def) {
  const { w, h } = def, r = view.rand, g = view.group;
  const sunS = glowSprite(0xfff1b8, 190, 0.95, getTexture('glow')); sunS.position.set(w * 0.72, h * 0.5 + 40, -330); g.add(sunS);
  const halo = glowSprite(0xffd890, 520, 0.28, getTexture('glow')); halo.position.copy(sunS.position); g.add(halo);
  view.mats.push(sunS.material, halo.material);
  const base = Math.max(8, h * 0.35);
  ridge(view, { z: -230, top: base + 28, color: 0x86c8c0, amp: 40, seed: 3, width: 700, depth: 220 });
  ridge(view, { z: -170, top: base + 8, color: 0x5fae98, amp: 30, seed: 7, width: 560, depth: 200 });
  ridge(view, { z: -115, top: base - 8, color: 0x3a9170, amp: 22, seed: 11, width: 420, depth: 200 });
  cloudLayer(view, def, { count: 7, yMin: base + 30, yMax: base + 110, size: 70 });

  // mid-ground giant trees
  const bark = view.m(new THREE.MeshStandardMaterial({ map: getTexture('bark').clone(), color: 0x8a6a4a, roughness: 1 }));
  const leaf = view.m(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }));
  const trunks = new Instancer(CYL, bark, { cast: false });
  const canopy = new Instancer(ICO1, leaf, { cast: false });
  const n = Math.ceil((w + 60) / 15);
  for (let i = 0; i < n; i++) {
    const x = -30 + (i + r() * 0.8) * ((w + 60) / n), z = -(16 + r() * 50), rad = 1.1 + r() * 2.0;
    const hh = h + 40 + r() * 20;
    trunks.add(x, hh / 2 - 8, z, { sx: rad, sy: hh, sz: rad, color: [0.75 + r() * 0.25, 0.62 + r() * 0.2, 0.5] });
    const cy = h + 4 + r() * 10;
    for (let k = 0; k < 5; k++) canopy.add(x + (r() - 0.5) * 13, cy + (r() - 0.3) * 5, z + (r() - 0.5) * 8, { sx: 4 + r() * 5, sy: 2.6 + r() * 2.4, sz: 4 + r() * 5, color: [0.12 + r() * 0.12, 0.38 + r() * 0.3, 0.12 + r() * 0.1] });
    for (let k = 0; k < 2; k++) canopy.add(x + (r() - 0.5) * 8, h * 0.45 + r() * h * 0.5, z + 1 + r() * 3, { sx: 3 + r() * 3, sy: 2 + r() * 1.5, sz: 3 + r() * 3, color: [0.14 + r() * 0.1, 0.45 + r() * 0.25, 0.14] });
  }
  // leafy bushes in the near background for depth
  for (let i = 0; i < Math.ceil(w / 5); i++) {
    const x = -4 + r() * (w + 8), z = -(4 + r() * 8), y = r() * h * 0.8 + 1;
    canopy.add(x, y, z, { sx: 1.6 + r() * 2.2, sy: 1.0 + r() * 1.2, sz: 1.5 + r() * 1.5, color: hsl(0.28 + r() * 0.08, 0.55, 0.2 + r() * 0.12) });
  }
  trunks.build(g); canopy.build(g);
  view.insts.push(trunks, canopy);

  // hanging vines + foreground canopy cards along the top edge
  const foliageTex = getTexture('foliage');
  const cardMat = view.m(new THREE.MeshStandardMaterial({ map: foliageTex, alphaTest: 0.45, side: THREE.DoubleSide, color: 0x3c7d2c, roughness: 1 }));
  const cards = new Instancer(new THREE.PlaneGeometry(1, 1), cardMat, { cast: false });
  for (let i = 0; i < Math.ceil(w / 5); i++) cards.add(i * 5 + r() * 4 - 2, h + 1.2 + r() * 2, 3.5 + r() * 4, { sx: 7 + r() * 4, sy: 5 + r() * 3, rz: (r() - 0.5) * 0.5, color: [0.7 + r() * 0.5, 0.8 + r() * 0.4, 0.6] });
  for (let i = 0; i < Math.ceil(h / 12); i++) {
    cards.add(-1.5 + r() * 2, 3 + i * 12 + r() * 5, 4 + r() * 3, { sx: 6, sy: 6, rz: (r() - 0.5) * 1.2, color: [0.6, 0.8, 0.5] });
    cards.add(w + 1.5 - r() * 2, 3 + i * 12 + r() * 5, 4 + r() * 3, { sx: 6, sy: 6, rz: (r() - 0.5) * 1.2, color: [0.6, 0.8, 0.5] });
  }
  cards.build(g); view.insts.push(cards);

  // grass tufts and flowers on every walkable top
  const { floors } = floorsAndCeilings(def);
  const tuftMat = view.m(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
  const tufts = new Instancer(CONE, tuftMat, { cast: false });
  const flowerMat = view.m(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x331100, emissiveIntensity: 0.3 }));
  const flowers = new Instancer(new THREE.SphereGeometry(1, 8, 6), flowerMat, { cast: false });
  const blades = [];
  for (const [x, y] of floors) {
    if (FLAGS[def.tiles[(y - 1) * w + x]] === 0) continue;
    for (let k = 0; k < 3; k++) {
      const bx = x + 0.1 + r() * 0.8, hgt = 0.25 + r() * 0.4;
      blades.push(tufts.add(bx, y + hgt * 0.5 - 0.02, 0.55 + r() * 0.35, { sx: 0.05 + r() * 0.04, sy: hgt, sz: 0.05, rz: (r() - 0.5) * 0.4, color: hsl(0.25 + r() * 0.1, 0.65, 0.28 + r() * 0.14) }));
    }
    if (r() < 0.12) flowers.add(x + r(), y + 0.3 + r() * 0.15, 0.8, { s: 0.09, color: r() < 0.5 ? 0xff6a8a : 0xffe05a });
  }
  tufts.build(g); flowers.build(g); view.insts.push(tufts, flowers);

  // waterfall
  const wf = def.props.waterfall;
  if (wf) {
    const tex = getTexture('water').clone(); tex.needsUpdate = true; tex.repeat.set(1, wf.h / 3);
    const m = view.m(new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.85, emissive: 0x3a7fa0, emissiveIntensity: 0.4, roughness: 0.2 }));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(wf.w, wf.h), m);
    plane.position.set(wf.x, wf.y + wf.h / 2, -3.6);
    g.add(plane);
    const mist = glowSprite(0xe8fbff, wf.w * 3, 0.45, getTexture('glow')); mist.position.set(wf.x, wf.y + 0.5, -2.8); g.add(mist); view.mats.push(mist.material);
    view.anims.push((t) => { tex.offset.y = -t * 0.9; mist.material.opacity = 0.38 + Math.sin(t * 2) * 0.06; });
    view.emitters.push({ x: wf.x, y: wf.y + 0.6, w: wf.w, kind: 'mist' });
  }
  view.ambient = { kind: 'pollen', rate: 7 };
}

function temple(view, def) {
  const { w, h } = def, r = view.rand, g = view.group;
  // pillars in front of the back wall
  const stoneMat = view.m(new THREE.MeshStandardMaterial({ map: getTexture('stone'), color: 0x7e9a94, roughness: 0.95 }));
  const pil = new Instancer(BOX, stoneMat, { cast: false, receive: true });
  const cap = new Instancer(BOX, stoneMat, { cast: false, receive: true });
  const step = 11;
  const xs = [];
  for (let x = 5 + (def.id.length % 4); x < w; x += step + Math.floor(r() * 3)) {
    xs.push(x);
    pil.add(x, h / 2, -1.2, { sx: 1.5, sy: h + 6, sz: 1.5 });
    cap.add(x, h - 1.2, -1.2, { sx: 2.3, sy: 0.7, sz: 2.3 }); cap.add(x, 1.2, -1.2, { sx: 2.2, sy: 0.7, sz: 2.2 });
  }
  pil.build(g); cap.build(g); view.insts.push(pil, cap);
  // carved tiki faces with glowing eyes on the back wall
  const eyeMat = view.m(new THREE.MeshBasicMaterial({ color: 0x66ffe0 }));
  const eyes = new Instancer(new THREE.SphereGeometry(1, 8, 6), eyeMat);
  for (let i = 0; i < Math.max(2, Math.floor(w / 18)); i++) {
    const x = 8 + r() * (w - 16), y = 5 + r() * (h - 10);
    eyes.add(x - 0.45, y, -1.65, { sx: 0.2, sy: 0.12, sz: 0.1 }); eyes.add(x + 0.45, y, -1.65, { sx: 0.2, sy: 0.12, sz: 0.1 });
  }
  eyes.build(g); view.insts.push(eyes);
  // torches where there is a floor within reach
  const { floors } = floorsAndCeilings(def);
  let placed = 0;
  for (const px of xs) {
    const col = floors.filter(([x]) => Math.abs(x - px) <= 1);
    if (!col.length || placed >= 5) continue;
    const [fx, fy] = col[Math.floor(r() * col.length)];
    if (def.tiles[Math.min(h - 1, fy + 3) * w + fx] === T.EMPTY) { torchAt(view, px + 0.9, fy + 3.2); placed++; }
  }
  // light shafts
  const rayMat = view.m(new THREE.MeshBasicMaterial({ map: getTexture('ray'), color: 0x9ffff0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const rays = new Instancer(new THREE.PlaneGeometry(1, 1), rayMat);
  for (let i = 0; i < Math.max(2, Math.floor(w / 22)); i++) rays.add(6 + r() * (w - 12), h - 5, -1.4, { sx: 3 + r() * 3, sy: h * 0.8, rz: 0.2 + r() * 0.2 });
  rays.build(g); view.insts.push(rays);
  view.ambient = { kind: 'dust', rate: 5 };
  // moss ceiling drapes
  const { ceils } = floorsAndCeilings(def);
  const vineMat = view.m(new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.95 }));
  const drapes = new Instancer(CYL, vineMat, { cast: false });
  for (const [x, y] of ceils) if (r() < 0.22) { const len = 0.8 + r() * 2.4; drapes.add(x + r(), y - len / 2, -0.9 - r() * 0.4, { sx: 0.03, sy: len, sz: 0.03 }); }
  drapes.build(g); view.insts.push(drapes);
}

function cavern(view, def) {
  const { w, h } = def, r = view.rand, g = view.group;
  const { floors, ceils } = floorsAndCeilings(def);
  const palette = [0x4fe8ff, 0xff5ad8, 0x7a8bff, 0x6affb0, 0xc77bff];
  const crystalMat = view.m(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const crystals = new Instancer(OCT, crystalMat, { cast: false });
  const glowMat = view.m(new THREE.SpriteMaterial({ map: getTexture('glow'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
  const glows = [];
  const cluster = (x, y, dir) => {
    const col = palette[Math.floor(r() * palette.length)];
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const hgt = 0.5 + r() * 1.1;
      crystals.add(x + (i - n / 2) * 0.22 + r() * 0.1, y + dir * hgt * 0.5, -0.9 - r() * 0.6, { sx: 0.15 + r() * 0.08, sy: hgt, sz: 0.15, rz: (r() - 0.5) * 0.5, color: new THREE.Color(col).multiplyScalar(0.8 + r() * 0.4) });
    }
    const s = new THREE.Sprite(glowMat.clone()); s.material.color.set(col); view.m(s.material);
    s.scale.set(3.2, 3.2, 1); s.position.set(x, y + dir * 0.7, -0.7); g.add(s); glows.push(s);
    return col;
  };
  let cc = 0;
  for (const [x, y] of floors) if (r() < 0.07) { const col = cluster(x + 0.5, y, 1); if (cc++ < 6) view.pointLights.push({ x: x + 0.5, y: y + 1.2, z: 2.0, color: col, intensity: 26, distance: 15 }); }
  for (const [x, y] of ceils) if (r() < 0.05) cluster(x + 0.5, y, -1);
  crystals.build(g); view.insts.push(crystals);
  // stalactites / stalagmites in several depths
  const rockMat = view.m(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }));
  const spikes = new Instancer(CONE, rockMat, { cast: false });
  for (const [x, y] of ceils) if (r() < 0.2) { const len = 0.7 + r() * 1.7; spikes.add(x + r(), y - len / 2, -0.6 - r() * 0.8, { sx: 0.22 + r() * 0.15, sy: len, sz: 0.22, rx: Math.PI, color: [0.45, 0.4, 0.62] }); }
  for (const [x, y] of floors) if (r() < 0.12) { const len = 0.5 + r() * 1.2; spikes.add(x + r(), y + len / 2, -0.7 - r() * 0.8, { sx: 0.2 + r() * 0.15, sy: len, sz: 0.2, color: [0.4, 0.36, 0.58] }); }
  for (let i = 0; i < Math.ceil(w / 4); i++) { const z = -(4 + r() * 24), len = 5 + r() * 14; spikes.add(-10 + r() * (w + 20), h + 4 - len / 2 + r() * 3, z, { sx: 1 + r() * 1.8, sy: len, sz: 1 + r() * 1.5, rx: Math.PI, color: [0.2 + r() * 0.1, 0.17 + r() * 0.1, 0.38 + r() * 0.12] }); }
  spikes.build(g); view.insts.push(spikes);
  // glow mushrooms
  const capMat = view.m(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x39d9b0, emissiveIntensity: 0.9, roughness: 0.5 }));
  const caps = new Instancer(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat, { cast: false });
  const stemMat = view.m(new THREE.MeshStandardMaterial({ color: 0xcfe8e0, roughness: 0.8 }));
  const stems = new Instancer(CYL, stemMat, { cast: false });
  for (const [x, y] of floors) if (r() < 0.05) { const s = 0.15 + r() * 0.2; stems.add(x + r(), y + s * 1.4, -0.7, { sx: s * 0.28, sy: s * 2.8, sz: s * 0.28 }); caps.add(x + r(), y + s * 2.8, -0.7, { sx: s * 1.3, sy: s * 0.9, sz: s * 1.3, color: new THREE.Color(r() < 0.5 ? 0x7fffe0 : 0xff9aea) }); }
  caps.build(g); stems.build(g); view.insts.push(caps, stems);
  view.anims.push((t) => { glows.forEach((s, i) => { s.material.opacity = 0.5 + Math.sin(t * 1.6 + i) * 0.14; }); });
  view.ambient = { kind: 'glowworm', rate: 6 };
}

function quarry(view, def) {
  const { w, h } = def, r = view.rand, g = view.group;
  const base = Math.max(6, h * 0.3);
  ridge(view, { z: -200, top: base + 30, color: 0x6a2a1c, amp: 36, seed: 21, width: 700, depth: 220 });
  ridge(view, { z: -140, top: base + 10, color: 0x4d1c12, amp: 28, seed: 23, width: 560, depth: 200 });
  ridge(view, { z: -95, top: base - 6, color: 0x35130c, amp: 22, seed: 29, width: 420, depth: 200 });
  const haze = glowSprite(0xff5a1a, w + 160, 0.35, getTexture('glow')); haze.scale.set(w + 260, 70, 1); haze.position.set(w / 2, -6, -60); g.add(haze); view.mats.push(haze.material);
  // pipes, struts and chains along the back wall
  const pipeMat = view.m(new THREE.MeshStandardMaterial({ color: 0x6b5448, roughness: 0.55, metalness: 0.6 }));
  const pipes = new Instancer(CYL, pipeMat, { cast: false });
  for (const fy of [0.28, 0.66]) pipes.add(w / 2, h * fy, -1.45, { sx: 0.26, sy: w + 30, sz: 0.26, rz: Math.PI / 2 });
  for (let x = 6; x < w; x += 12 + Math.floor(r() * 4)) pipes.add(x, h / 2, -1.5, { sx: 0.2, sy: h + 10, sz: 0.2 });
  pipes.build(g); view.insts.push(pipes);
  const chainMat = view.m(new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.4, metalness: 0.8 }));
  const chains = new Instancer(CYL, chainMat, { cast: false });
  for (let i = 0; i < Math.ceil(w / 8); i++) { const len = 3 + r() * 7; chains.add(3 + r() * (w - 6), h - len / 2 + 1, -1.2 - r() * 0.5, { sx: 0.05, sy: len, sz: 0.05 }); }
  chains.build(g); view.insts.push(chains);
  view.ambient = { kind: 'ember', rate: 12 };
  // smoke stacks in the distance
  const stackMat = view.m(new THREE.MeshBasicMaterial({ color: 0x2a0e09 }));
  const stacks = new Instancer(CYL, stackMat);
  for (let i = 0; i < 6; i++) stacks.add(-40 + r() * (w + 80), base + 18, -(60 + r() * 50), { sx: 2.5 + r() * 2, sy: 50 + r() * 30, sz: 2.5 });
  stacks.build(g); view.insts.push(stacks);
  cloudLayer(view, def, { count: 5, color: 0x5a2a20, opacity: 0.5, yMin: base + 20, yMax: base + 70, size: 70, zMin: -150, zMax: -90 });
}

function tower(view, def) {
  const { w, h } = def, r = view.rand, g = view.group;
  // skyline
  const bld = view.m(new THREE.MeshBasicMaterial({ color: 0x151a3a }));
  const win = view.m(new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  const bI = new Instancer(BOX, bld), wI = new Instancer(BOX, win);
  const base = Math.max(4, h * 0.25);
  for (let i = 0; i < 26; i++) {
    const z = -(90 + r() * 80), bw = 6 + r() * 12, bh = 22 + r() * 60, x = -90 + r() * (w + 180);
    bI.add(x, base - 20 + bh / 2, z, { sx: bw, sy: bh, sz: 8 });
    for (let k = 0; k < 7; k++) if (r() < 0.6) wI.add(x + (r() - 0.5) * bw * 0.8, base - 20 + r() * bh, z + 4.2, { sx: 0.8, sy: 1.1, sz: 0.1 });
  }
  bI.build(g); wI.build(g); view.insts.push(bI, wI);
  const moon = glowSprite(0xffe9c8, 120, 0.9, getTexture('glow')); moon.position.set(w * 0.3, h * 0.6 + 45, -320); g.add(moon); view.mats.push(moon.material);
  cloudLayer(view, def, { count: 6, color: 0xc7b8ff, opacity: 0.35, yMin: base + 25, yMax: base + 90, size: 75 });
  // cross-braced scaffolding behind the action
  const steelMat = view.m(new THREE.MeshStandardMaterial({ map: getTexture('steel'), color: 0x8794b2, roughness: 0.55, metalness: 0.35 }));
  const orange = view.m(new THREE.MeshStandardMaterial({ color: 0xd9741f, roughness: 0.6, metalness: 0.3 }));
  const beams = new Instancer(BOX, steelMat, { cast: false }), paint = new Instancer(BOX, orange, { cast: false });
  for (let x = 4; x < w; x += 14) { beams.add(x, h / 2, -2.4, { sx: 0.8, sy: h + 10, sz: 0.8 }); paint.add(x, h / 2, -2.2, { sx: 0.9, sy: 0.5, sz: 0.9 }); }
  for (let y = 5; y < h; y += 11) for (let x = 4; x < w - 7; x += 14) {
    const ang = Math.atan2(11, 14);
    beams.add(x + 7, y + 5.5, -2.8, { sx: Math.hypot(14, 11), sy: 0.35, sz: 0.4, rz: ang * (((x / 14 + y / 11) | 0) % 2 ? 1 : -1) });
  }
  for (let y = 4; y < h + 8; y += 11) { beams.add(w / 2, y, -3.1, { sx: w + 20, sy: 0.6, sz: 0.6 }); }
  beams.build(g); paint.build(g); view.insts.push(beams, paint);
  // beacons + searchlights
  const beacons = [];
  for (let x = 4; x < w; x += 14) { const b = glowSprite(0xff2a2a, 2.2, 0.9, getTexture('glow')); b.position.set(x, h + 3.5, -2); g.add(b); view.mats.push(b.material); beacons.push(b); }
  const beamMat = view.m(new THREE.MeshBasicMaterial({ map: getTexture('ray'), color: 0xfff0c8, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const lightBeams = [];
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, h * 1.4), beamMat); m.position.set(w * (0.3 + i * 0.4), h * 0.5, -12); g.add(m); lightBeams.push(m); }
  view.anims.push((t) => {
    beacons.forEach((b, i) => { b.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + i * 1.3)); });
    lightBeams.forEach((m, i) => { m.rotation.z = Math.sin(t * 0.35 + i * 2) * 0.35; });
  });
  view.ambient = { kind: 'spark', rate: 5 };
  // steam hint lamps (warm point lights near the floor of the room)
  const { floors } = floorsAndCeilings(def);
  let n = 0;
  for (const [x, y] of floors) if (r() < 0.012 && n++ < 3) view.pointLights.push({ x: x + 0.5, y: y + 3.5, z: 2, color: 0xffb25a, intensity: 30, distance: 16 });
}

const DECOR = { jungle, temple, cavern, quarry, tower };

export function buildDecor(view, theme, def) {
  view.emitters = view.emitters || [];
  view.ambient = null;
  (DECOR[view.areaKey] || jungle)(view, def);
}
