// visualLint (TECH_PLAN 10.1, 11.1): measures what the location checklist can measure for the
// current view of a World.
//
// export function visualLint(world, camera, { viewpoint } = {})
//   -> { ok, viewpoint, lights, emitters, textures, untextured, problems: [] }
//   lights      coloured virtual lights (map.lights, chroma > 0.12) whose position is in view; >= 3
//   emitters    ambient particle emitters in view; every area in view needs at least one
//   textures    distinct texture images on the map's meshes (sprites and particles excluded); 12-48
//   untextured  meshes in view without a texture whose surface exceeds 2 square units; must be 0
//               (invisible shadow casters, void hulls, additive glows and custom shaders are skipped)
// debug.visualLint(viewpoint?) moves the camera to the viewpoint, renders a frame, then calls this.

import * as THREE from 'three';

const _frustum = new THREE.Frustum();
const _pv = new THREE.Matrix4();
const _sphere = new THREE.Sphere();
const _v = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _col = new THREE.Color();

function inView(camera, x, y, z, margin = 0.05) {
  _v.set(x, y, z).project(camera);
  return _v.z < 1 && Math.abs(_v.x) <= 1 + margin && Math.abs(_v.y) <= 1 + margin;
}

/** Chroma (0-1) of a colour: how far from grey it is. */
function chroma(color) {
  _col.set(color);
  return Math.max(_col.r, _col.g, _col.b) - Math.min(_col.r, _col.g, _col.b);
}

/** World-space surface of a mesh (sum of its triangles). */
function surfaceArea(mesh) {
  const g = mesh.geometry;
  const pos = g.attributes.position;
  if (!pos) return 0;
  const idx = g.index;
  const n = idx ? idx.count : pos.count;
  let area = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
    _a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
    _b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
    _c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
    area += _b.sub(_a).cross(_c.sub(_a)).length() / 2;
  }
  return area;
}

/** Materials that are not surfaces a player reads as untextured. */
function skipMaterial(m) {
  if (!m || m.map || m.isShaderMaterial || m.isPointsMaterial || m.isSpriteMaterial) return true;
  if (m.colorWrite === false || m.visible === false) return true;
  if (m.blending === THREE.AdditiveBlending) return true;
  if (m.transparent && m.opacity < 0.2) return true;
  // void-coloured hulls and backings (dark and not glowing)
  const e = m.emissive;
  const glows = !!m.emissiveMap || (e && Math.max(e.r, e.g, e.b) * (m.emissiveIntensity ?? 1) > 0.05);
  if (m.color && Math.max(m.color.r, m.color.g, m.color.b) < 0.03 && !glows) return true;
  return false;
}

export function visualLint(world, camera, { viewpoint = null } = {}) {
  const problems = [];
  camera.updateMatrixWorld();
  _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_pv);
  world.scene.updateMatrixWorld();

  // coloured virtual lights in view
  const lights = (world.map.lights || []).filter((l) => (l.decorative !== true)
    && chroma(l.color || '#ffffff') > 0.12 && inView(camera, l.x, l.y ?? 2, l.z)).length;
  if (lights < 3) problems.push(`only ${lights} coloured virtual light(s) in view (want >= 3)`);

  // emitters in view, and every area in view has one
  const ems = (world.emitters || []).map((e) => (e.em ? { x: e.x, y: e.y, z: e.z } : e.position || e));
  const emitters = ems.filter((e) => inView(camera, e.x, e.y ?? 1, e.z, 0.2)).length;
  for (const a of world.map.areas || []) {
    const [x0, z0, x1, z1] = a.rect;
    const corners = [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]];
    if (!corners.some(([x, z]) => inView(camera, x, 0, z, 0))) continue;
    const n = ems.filter((e) => e.x >= x0 && e.x <= x1 && e.z >= z0 && e.z <= z1).length;
    if (!n) problems.push(`area "${a.id}" in view has no ambient particle emitter`);
  }

  // distinct texture images and untextured surfaces
  const images = new Set();
  let untextured = 0;
  world.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.visible) return;
    let shown = true;
    for (let p = o.parent; p; p = p.parent) if (!p.visible) { shown = false; break; }
    if (!shown) return;
    const mats = [].concat(o.material || []);
    const actor = !!(o.parent && o.parent.userData && o.parent.userData.actor);
    for (const m of mats) if (m && m.map && m.map.image && !actor) images.add(m.map.source ? m.map.source.uuid : m.map.image);
    if (!mats.some((m) => !skipMaterial(m))) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    _sphere.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
    if (!_frustum.intersectsSphere(_sphere)) return;
    const area = surfaceArea(o);
    if (area > 2) {
      untextured++;
      const m = mats.find((x) => !skipMaterial(x));
      problems.push(`untextured surface ${area.toFixed(1)} sq units (${o.name || o.type}, ${m.type} #${m.color ? m.color.getHexString() : '?'})`);
    }
  });
  const textures = images.size;
  if (textures < 12 || textures > 48) problems.push(`${textures} distinct textures on the map (want 12-48)`);

  return { ok: problems.length === 0, viewpoint, lights, emitters, textures, untextured, problems };
}
