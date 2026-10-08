// Water cells (TECH_PLAN 3.2): a channel with banks, a bed, an animated surface and, once it
// drains, a walkway at floor level. The World builds one body per legend character and decides
// collision (undrained water blocks); this module only draws and animates it.
//
// export function buildWater(W, cells, spec) -> WaterBody
//   cells: [[c, r], ...] grid cells of one body; spec: { tex = 'water', bank = 'water_bank',
//   bed = 'water_bed', depth = 0.35, drain?: cond, path = 'water_path' } (the legend's CellSpec)
// WaterBody = { kind: 'water', drained, group, setDrained(on, instant), update(dt, t) }
//   setDrained(true): the surface sinks to the bed with a mist, then the walkway rises to y = 0.
//   Everything hangs under W.root, so World.dispose frees it with the scene (programs.release).
// export function waterTextures(spec) -> texture names the body paints (prewarm)

import * as THREE from 'three';
import { textureSet, setTextureFrame, textureFps } from '../art/tiles.js';
import { Batch } from './geometry.js';

const SURFACE_Y = -0.12;      // the water line sits under the floor, so the far bank shows
const BANK_H = 0.75;          // world height of the 32x24 bank texture

export function waterTextures(spec = {}) {
  return [spec.tex || 'water', spec.bank || 'water_bank', spec.bed || 'water_bed', spec.path || 'water_path'];
}

/** One merged quad per cell at height 0 (the mesh is moved up and down). */
function cellsGeometry(cells) {
  const pos = [], nrm = [], uv = [], idx = [];
  let n = 0;
  for (const [c, r] of cells) {
    pos.push(c, 0, r + 1, c + 1, 0, r + 1, c + 1, 0, r, c, 0, r);
    nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    n += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function buildWater(W, cells, spec = {}) {
  const depth = spec.depth ?? 0.35;
  const set = new Set(cells.map(([c, r]) => `${c},${r}`));
  const has = (c, r) => set.has(`${c},${r}`);
  const group = new THREE.Group();
  W.root.add(group);

  // banks: every edge toward a non-water cell drops from the floor to the bed, facing the water
  const bankMat = W.mats.tile(spec.bank || 'water_bank', { roughness: 0.7, emissive: 1.6, cast: false });
  const B = new Batch();
  const v0 = 1 - depth / BANK_H;
  for (const [c, r] of cells) {
    if (!has(c, r - 1)) B.faceZ(bankMat, c, c + 1, -depth, 0, r, 1, [0, v0, 1, 1]);
    if (!has(c, r + 1)) B.faceZ(bankMat, c, c + 1, -depth, 0, r + 1, -1, [0, v0, 1, 1]);
    if (!has(c - 1, r)) B.faceX(bankMat, r, r + 1, -depth, 0, c, 1, [0, v0, 1, 1]);
    if (!has(c + 1, r)) B.faceX(bankMat, r, r + 1, -depth, 0, c + 1, -1, [0, v0, 1, 1]);
  }
  B.build(group);

  // the bed: dark silt and pebbles, seen while the channel drains
  const bedSet = textureSet(spec.bed || 'water_bed', { layers: ['map', 'normal'] });
  const bed = new THREE.Mesh(cellsGeometry(cells), new THREE.MeshStandardMaterial({
    map: bedSet.map, normalMap: bedSet.normalMap, roughness: 0.95, metalness: 0,
  }));
  bed.position.y = -depth;
  bed.receiveShadow = true;
  group.add(bed);

  // the surface: animated ripples with emissive caustics, glossy enough to catch the point lights
  const surf = textureSet(spec.tex || 'water');
  const fps = textureFps(spec.tex || 'water');
  const surfMat = new THREE.MeshStandardMaterial({
    map: surf.map, normalMap: surf.normalMap, emissiveMap: surf.emissiveMap,
    emissive: surf.emissiveMap ? 0xffffff : 0x000000, emissiveIntensity: surf.emissiveMap ? 1.6 : 0,
    roughness: 0.18, metalness: 0.25,
  });
  const surface = new THREE.Mesh(cellsGeometry(cells), surfMat);
  surface.position.y = SURFACE_Y;
  surface.receiveShadow = true;
  group.add(surface);

  // the walkway the drained channel reveals
  const path = textureSet(spec.path || 'water_path', { repeat: [1, 1] });
  const pathMat = new THREE.MeshStandardMaterial({
    map: path.map, normalMap: path.normalMap, emissiveMap: path.emissiveMap,
    emissive: path.emissiveMap ? 0xffffff : 0x000000, emissiveIntensity: path.emissiveMap ? 1.4 : 0,
    roughness: 0.55, metalness: 0.35,
  });
  const walk = new THREE.Mesh(cellsGeometry(cells), pathMat);
  walk.receiveShadow = true;
  walk.visible = false;
  group.add(walk);

  // drain progress: 0 full, 1 surface on the bed, 2 walkway up
  let k = 0, target = 0, mist = 0;
  const apply = () => {
    const sink = Math.min(1, k);
    surface.position.y = SURFACE_Y + (-depth + 0.03 - SURFACE_Y) * (sink * sink * (3 - 2 * sink));
    surface.visible = sink < 0.999;
    const rise = Math.max(0, k - 1);
    walk.visible = rise > 0.001;
    walk.position.y = -depth + depth * (1 - (1 - rise) * (1 - rise));
  };
  const body = {
    kind: 'water',
    drained: false,
    group,
    setDrained(on, instant = false) {
      const was = body.drained;
      body.drained = !!on;
      target = on ? 2 : 0;
      if (instant) { k = target; apply(); return; }
      if (on && !was && W.onSound) W.onSound('splash', { volume: 0.8 });
      if (on && !was) mist = 1.2;
    },
    update(dt, t) {
      if (surface.visible && fps) setTextureFrame(surf, t * fps);
      if (k !== target) {
        // the water takes 1.4 s to drain, the walkway 0.5 s to rise
        const rate = k < 1 || target < 1 ? 1 / 1.4 : 1 / 0.5;
        k = target > k ? Math.min(target, k + dt * rate) : Math.max(target, k - dt * rate);
        apply();
      }
      if (mist > 0 && W.particles) {
        mist -= dt;
        if (Math.random() < dt * 14) {
          const [c, r] = cells[(Math.random() * cells.length) | 0];
          W.particles.emit('steam', [c + Math.random(), surface.position.y + 0.05, r + Math.random()], { count: 3, size: 1.4 });
        }
      }
    },
  };
  apply();
  return body;
}
