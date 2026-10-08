// Open-map sky vista and pit underlay (TECH_PLAN 3.9).
//
// export function buildSky(W, def) -> { mesh, update(dt, t, camera) }
//   def: { texture, stars?, horizonV = 0.6, edge = 'north', parallax = 0.12, tint }
//   A camera-anchored vista like the arena space() backdrop: a plane placed in front of whatever
//   camera renders it (onBeforeRender), at depth 120 (camera far is 140), sized to the frustum,
//   fog off, no depth writes, drawn first, so map geometry covers it wherever there is map. Each
//   frame its texture is offset so row `horizonV` (0 = top) sits on the screen line where the map's
//   far `edge` (y = 0) projects, and shifted by `parallax` with the camera's x. It reads at the default
//   pitch (the band beyond the far edge) and in low shots, where more of it shows. Square texels.
// export function buildUnderlay(W, def) -> { mesh, update(dt, t) }
//   def: { texture, y = -5, repeat = [8, 8], scroll = [0.002, 0], color }: a world-fixed plane under
//   the map (you look down into pits), covering the map plus a margin, scrolling slowly. Past the
//   sky's edge it stops where the floor no longer hides it and fades out, so the vista shows there.
// Both hang in W.scene, so World.dispose frees them with the scene.

import * as THREE from 'three';
import { textureSet, buildTexture } from '../art/tiles.js';

const DEPTH = 120;
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _s = new THREE.Matrix4();

function tintOf(tint) {
  if (tint == null) return new THREE.Color(1, 1, 1);
  if (Array.isArray(tint)) return new THREE.Color(tint[0], tint[1], tint[2]);
  return new THREE.Color(tint);
}

/** Screen NDC y where the map's far edge (y = 0) projects, seen from `camera`. */
function horizonNdc(camera, map, edge) {
  const p = camera.position;
  if (edge === 'south') _v.set(p.x, 0, map.h);
  else if (edge === 'west') _v.set(0, 0, p.z - 16);
  else if (edge === 'east') _v.set(map.w, 0, p.z - 16);
  else _v.set(p.x, 0, 0);
  _v.project(camera);
  return _v.z > 1 ? 1 : _v.y;
}

export function buildSky(W, def) {
  const name = def.texture || 'space_backdrop';
  const set = textureSet(name, { layers: ['map'] });
  const tex = set.map;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: tintOf(def.tint), fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.matrixAutoUpdate = false;
  W.scene.add(mesh);
  let stars = null, starSet = null;
  if (def.stars) {
    starSet = textureSet(def.stars, { repeat: [4, 2], layers: ['map'] });
    stars = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: starSet.map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      color: new THREE.Color(1.2, 1.2, 1.3),
    }));
    stars.frustumCulled = false;
    stars.renderOrder = -999;
    stars.matrixAutoUpdate = false;
    W.scene.add(stars);
  }
  const t0 = buildTexture(name);
  const texAspect = t0.w / t0.h;
  const map = W.map;
  const horizonV = def.horizonV ?? 0.6, parallax = def.parallax ?? 0.12;

  // place the plane(s) in front of the rendering camera and map the texture for this view
  const place = (camera) => {
    const h = 2 * DEPTH * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const w = h * camera.aspect;
    _m.copy(camera.matrixWorld).multiply(_s.makeTranslation(0, 0, -DEPTH)).multiply(_s.makeScale(w, h, 1));
    mesh.matrixWorld.copy(_m);
    // texture window: square texels, at most 120% of the texture height on screen
    let rx = 0.78;
    const ratio = (h / w) * texAspect;
    if (rx * ratio > 1.2) rx = 1.2 / ratio;
    const ry = rx * ratio;
    const vScreen = (horizonNdc(camera, map, def.edge || 'north') + 1) / 2;
    const camX = camera.position.x - map.w / 2;
    const u = 0.5 + parallax * (camX / Math.max(8, map.w)) - rx / 2;
    tex.repeat.set(rx, ry);
    tex.offset.set(Math.min(1 - rx, Math.max(0, u)), (1 - horizonV) - vScreen * ry);
    if (stars) {
      stars.matrixWorld.copy(camera.matrixWorld).multiply(_s.makeTranslation(0, 0, -DEPTH + 1)).multiply(_s.makeScale(w, h, 1));
    }
  };
  mesh.onBeforeRender = (renderer, scene, camera) => place(camera);
  return {
    mesh,
    update(dt) {
      if (starSet) {
        starSet.map.offset.x += dt * 0.004;
        starSet.map.offset.y += dt * 0.001;
      }
    },
  };
}

/** A flat grid in world XZ at height y over xs x zs, with per-vertex alpha (RGBA vertex colours). */
function fadeGrid(xs, zs, y, alphaAt) {
  const pos = [], uv = [], col = [], idx = [];
  const [xa, xb] = [xs[0], xs[xs.length - 1]], [za, zb] = [zs[0], zs[zs.length - 1]];
  for (const z of zs) for (const x of xs) {
    pos.push(x, y, z);
    uv.push((x - xa) / (xb - xa), 1 - (z - za) / (zb - za));
    col.push(1, 1, 1, alphaAt(x, z));
  }
  const n = xs.length;
  for (let j = 0; j + 1 < zs.length; j++) for (let i = 0; i + 1 < n; i++) {
    const a = j * n + i, b = a + 1, c = a + n + 1, d = a + n;
    idx.push(d, c, b, d, b, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
}

export function buildUnderlay(W, def) {
  const name = def.texture || 'stars_layer';
  const y = def.y ?? -5;
  const { w, h } = W.map;
  // a 24-unit margin all round, except past the sky's edge: there it reaches only as far as the
  // floor hides it (down to 60-degree pitches) and fades out, so the vista shows above the edge and a
  // pit near the edge blends from the underlay into the sky instead of cutting to it
  const edge = W.map.sky ? W.map.sky.edge || 'north' : null;
  const fade = Math.abs(y) * 0.55;
  const m = (side) => (side === edge ? fade : 24);
  const xs = [-m('west'), w + m('east')], zs = [-m('north'), h + m('south')];
  if (edge === 'west') xs.splice(1, 0, 0);
  if (edge === 'east') xs.splice(1, 0, w);
  if (edge === 'north') zs.splice(1, 0, 0);
  if (edge === 'south') zs.splice(1, 0, h);
  const outer = { west: [0, xs[0]], east: [0, xs[xs.length - 1]], north: [1, zs[0]], south: [1, zs[zs.length - 1]] }[edge];
  const geo = fadeGrid(xs, zs, y, (x, z) => (outer && (outer[0] ? z : x) === outer[1] ? 0 : 1));
  const rep = def.repeat || [8, 8];
  const set = textureSet(name, { repeat: rep, layers: ['map'] });
  const mat = new THREE.MeshBasicMaterial({
    map: set.map, color: tintOf(def.color), fog: true, vertexColors: true, transparent: !!edge, depthWrite: !edge,
  });
  const mesh = new THREE.Mesh(geo, mat);
  W.scene.add(mesh);
  const scroll = def.scroll || [0.002, 0];
  return {
    mesh,
    update(dt) {
      set.map.offset.x += scroll[0] * dt;
      set.map.offset.y += scroll[1] * dt;
    },
  };
}
