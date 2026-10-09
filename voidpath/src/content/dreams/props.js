// dreams: prop builders (browser, TECH_PLAN 3.3). The dream sets borrow most of their furniture from
// the places they copy (spire, arboretum, driftmarket and built-in types); these are the pieces only
// a dream has. Everything static merges into the World's batches.
//
//   dr.house      { x, z }                  Sera's dream house: plaster walls, a terracotta gable roof,
//                                           a green door, two lit windows (`screen` props of the map
//                                           carry WARDEN's sigil), a chimney with a curl of smoke
//   dr.fence      { x0, x1, z, gap }        a white picket fence along z, a gate gap [x0, x1]
//   dr.footbridge { x, z }                  white plank bridge over the river (x - 1.2 .. x + 1.2)
//   dr.field      { x0, x1, z0, z1, seed, avoid: [[x0, z0, x1, z1], ...] }   wheat, grass and
//                                           wildflowers scattered as crossed alpha cards that sway
//   dr.urn        { x, z }                  a gold urn of wheat (the hall's corners)
//   dr.halo       { x, z, r = 1.3 }         a slow ring of light around the perfect HALCYON's dais
//   dr.sun        { x, y, z, size }         the dream's sun: layered soft glows over the backdrop

import * as THREE from 'three';
import { makeGlow } from '../../core/vfx.js';
import { FLORA } from './tex.js';

const _m = new THREE.Matrix4();

/** Seeded random in [0, 1). */
function rnd(seed) {
  let s = (Math.floor(Math.abs(seed) * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const floraUV = (k) => {
  const [x, y, w, h] = FLORA[k];
  return [x / 128, 1 - (y + h) / 64, (x + w) / 128, 1 - y / 64];
};

function floraMat(W) {
  if (W.drFlora) return W.drFlora;
  const m = W.mats.tile('dr_flora', { alphaTest: 0.5, side: THREE.DoubleSide, emissive: 1.6, roughness: 0.85, metalness: 0, cast: true });
  if (!m.userData.depthMat) m.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaTest: 0.5 });
  W.drFlora = m;
  return m;
}

const all = (m) => ({ front: m, back: m, left: m, right: m, top: m });

// ---------------------------------------------------------------- Sera's house

const house = {
  textures: ['dr_house', 'dr_roof', 'dr_wood', 'dr_house_win'],
  build(W, p) {
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const wallM = W.mats.tile('dr_house', { emissive: 1.4, roughness: 0.9, metalness: 0 });
    const roofM = W.mats.tile('dr_roof', { emissive: 1.4, roughness: 0.8, metalness: 0 });
    const woodM = W.mats.tile('dr_wood', { emissive: 1.4, roughness: 0.8, metalness: 0 });
    const doorM = W.mats.plain('#3c7a4c', { roughness: 0.7, metalness: 0 });
    const w = 4.6, d = 2.8, h = 2.0, rise = 1.5;
    const x0 = p.x - w / 2, x1 = p.x + w / 2, z0 = p.z - d / 2, z1 = p.z + d / 2;
    // walls (uv in world units / 2: the 64-px plaster spans 2 units)
    B.box({ front: wallM, back: wallM, left: wallM, right: wallM }, p.x, p.z, w, d, 0, h, 0,
      { front: [0, 0, w / 2, h / 2], back: [0, 0, w / 2, h / 2], left: [0, 0, d / 2, h / 2], right: [0, 0, d / 2, h / 2] });
    // gable ends
    for (const [x, dir] of [[x0, -1], [x1, 1]]) {
      B.quad(wallM, dir > 0 ? [x, h, z1] : [x, h, z0], dir > 0 ? [x, h, z0] : [x, h, z1], [x, h + rise, p.z], [x, h + rise, p.z], [0, 0, d / 2, rise / 2]);
    }
    // the roof: two slopes, overhanging, with a ridge cap of wood
    const oh = 0.35;
    const slope = (za, zb) => B.quad(roofM, [x0 - oh, h - 0.2, za], [x1 + oh, h - 0.2, za], [x1 + oh, h + rise + 0.05, zb], [x0 - oh, h + rise + 0.05, zb], [0, 0, (w + oh * 2), Math.hypot(d / 2 + oh, rise)]);
    slope(z1 + oh, p.z);
    B.quad(roofM, [x1 + oh, h - 0.2, z0 - oh], [x0 - oh, h - 0.2, z0 - oh], [x0 - oh, h + rise + 0.05, p.z], [x1 + oh, h + rise + 0.05, p.z], [0, 0, (w + oh * 2), Math.hypot(d / 2 + oh, rise)]);
    B.box(all(woodM), p.x, p.z, w + oh * 2 + 0.1, 0.14, h + rise, h + rise + 0.14, 0);
    // chimney
    B.box({ front: wallM, back: wallM, left: wallM, right: wallM, top: woodM }, x1 - 0.9, p.z - 0.3, 0.45, 0.45, h + 0.6, h + rise + 0.7, 0);
    W.addEmitter('steam', { position: [x1 - 0.9, h + rise + 0.8, p.z - 0.3], area: [0.2, 0.1, 0.2], rate: 1.2, color: '#ffffff', speed: 0.25, size: 1.4 }, p.on);
    // the door (south face), a step, a lamp beside it
    B.faceZ(doorM, p.x - 0.4, p.x + 0.4, 0, 1.45, z1 + 0.01, 1);
    B.faceZ(woodM, p.x - 0.5, p.x + 0.5, 1.45, 1.55, z1 + 0.02, 1);
    B.box(all(woodM), p.x, z1 + 0.25, 1.2, 0.5, 0, 0.12, 0);
    const lamp = makeGlow('#ffd890', 0.9, 1.0);
    lamp.position.set(p.x + 0.65, 1.55, z1 + 0.18);
    G.add(lamp);
    W.addGlow(lamp, p.x + 0.65, z1 + 0.2);
    // flower boxes under the windows
    const r = rnd(p.x * 3 + p.z), fm = floraMat(W);
    for (const wx of [p.x - 1.45, p.x + 1.45]) {
      B.box(all(woodM), wx, z1 + 0.12, 0.9, 0.22, 0.75, 0.92, 0);
      for (let k = 0; k < 3; k++) {
        const fx = wx - 0.3 + k * 0.3;
        B.quad(fm, [fx - 0.18, 0.88, z1 + 0.14], [fx + 0.18, 0.88, z1 + 0.14], [fx + 0.18, 1.3, z1 + 0.14], [fx - 0.18, 1.3, z1 + 0.14], floraUV(r() < 0.5 ? 'poppy' : 'daisy'));
      }
    }
    W.addBox(p.x, p.z, w, d);
  },
};

// ---------------------------------------------------------------- fence and footbridge

const fence = {
  textures: ['dr_wood'],
  build(W, p) {
    const B = W.batchFor(p.on);
    const woodM = W.mats.tile('dr_wood', { emissive: 1.5, roughness: 0.8, metalness: 0 });
    const [g0, g1] = p.gap || [Infinity, -Infinity];
    for (let x = p.x0; x <= p.x1 + 1e-6; x += 0.32) {
      if (x > g0 && x < g1) continue;
      B.box(all(woodM), x, p.z, 0.12, 0.06, 0, 0.78, 0);
      B.box(all(woodM), x, p.z, 0.08, 0.05, 0.78, 0.86, Math.PI / 4);
    }
    for (const y of [0.32, 0.62]) {
      if (p.x0 < g0) B.box(all(woodM), (p.x0 + Math.min(g0, p.x1)) / 2, p.z - 0.05, Math.min(g0, p.x1) - p.x0, 0.04, y, y + 0.07, 0);
      if (g1 < p.x1) B.box(all(woodM), (g1 + p.x1) / 2, p.z - 0.05, p.x1 - g1, 0.04, y, y + 0.07, 0);
    }
  },
};

const footbridge = {
  textures: ['dr_wood'],
  build(W, p) {
    const B = W.batchFor(p.on);
    const woodM = W.mats.tile('dr_wood', { emissive: 1.5, roughness: 0.8, metalness: 0 });
    // a low arch of planks over the river, rails on both sides
    const n = 9;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), x = p.x - 1.2 + u * 2.4, y = 0.04 + Math.sin(u * Math.PI) * 0.28;
      B.box(all(woodM), x, p.z, 0.26, 1.0, y, y + 0.06, 0);
    }
    for (const dz of [-0.48, 0.48]) {
      for (let i = 0; i < 5; i++) {
        const u = i / 4, x = p.x - 1.1 + u * 2.2, y = Math.sin(u * Math.PI) * 0.28;
        B.box(all(woodM), x, p.z + dz, 0.07, 0.07, y, y + 0.62, 0);
      }
      B.box(all(woodM), p.x, p.z + dz, 2.3, 0.06, 0.66, 0.72, 0);
    }
  },
};

// ---------------------------------------------------------------- the field

const field = {
  textures: ['dr_flora'],
  build(W, p) {
    const fm = floraMat(W), G = W.groupFor(p.on);
    const r = rnd(p.seed || 1);
    const avoid = p.avoid || [];
    const blocked = (x, z) => avoid.some(([a, b, c, d]) => x > a && x < c && z > b && z < d);
    // the cards sway: one geometry per field, its vertices bent in the vertex shader by height
    const B = { pos: [], uv: [], sway: [], idx: [], n: 0 };
    const card = (x, z, w, h, rot, uv, lean) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      const ax = x - (w / 2) * c, az = z + (w / 2) * s, bx = x + (w / 2) * c, bz = z - (w / 2) * s;
      const pts = [[ax, 0, az, 0], [bx, 0, bz, 0], [bx + lean, h, bz - 0.1, 1], [ax + lean, h, az - 0.1, 1]];
      const uvs = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
      for (let i = 0; i < 4; i++) {
        B.pos.push(pts[i][0], pts[i][1], pts[i][2]);
        B.uv.push(uvs[i][0], uvs[i][1]);
        B.sway.push(pts[i][3] * (0.6 + r() * 0.4));
      }
      B.idx.push(B.n, B.n + 1, B.n + 2, B.n, B.n + 2, B.n + 3);
      B.n += 4;
    };
    for (let z = p.z0; z < p.z1; z += 0.42) {
      for (let x = p.x0; x < p.x1; x += 0.42) {
        const jx = x + (r() - 0.5) * 0.4, jz = z + (r() - 0.5) * 0.4;
        if (blocked(jx, jz)) continue;
        const k = r();
        const kind = k < 0.62 ? 'wheat' : k < 0.86 ? 'grass' : k < 0.94 ? 'daisy' : 'poppy';
        const s = 0.75 + r() * 0.35;
        const h = (kind === 'wheat' ? 1.0 : kind === 'grass' ? 0.8 : 0.55) * s;
        const rot = (r() - 0.5) * 0.5;
        card(jx, jz, 0.62 * s, h, rot, floraUV(kind), (r() - 0.5) * 0.12);
        if (r() < 0.35) card(jx + 0.05, jz + 0.04, 0.5 * s, h * 0.9, rot + Math.PI / 2.2, floraUV(kind), 0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    geo.setAttribute('sway', new THREE.Float32BufferAttribute(B.sway, 1));
    geo.setIndex(B.idx);
    geo.computeVertexNormals();
    // normals straight up so the cards light like the ground under them
    const nrm = geo.getAttribute('normal');
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
    geo.computeBoundingSphere();
    const mat = fm.clone();
    const time = { value: 0 };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float sway;\nuniform float uTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sway * sin(uTime * 1.3 + position.x * 0.7 + position.z * 0.4) * 0.09;\ntransformed.z += sway * cos(uTime * 1.1 + position.x * 0.5) * 0.03;');
    };
    mat.customProgramCacheKey = () => 'dr.field';
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = fm.userData.depthMat;
    G.add(mesh);
    W.addUpdater((dt, t) => { time.value = t; });
  },
};

// ---------------------------------------------------------------- small pieces

const urn = {
  textures: ['dr_gold', 'dr_flora'],
  build(W, p) {
    const B = W.batchFor(p.on);
    const goldM = W.mats.tile('dr_gold', { emissive: 1.6, roughness: 0.35, metalness: 0.7 });
    const pts = [[0.0, 0], [0.18, 0.02], [0.14, 0.12], [0.26, 0.38], [0.3, 0.62], [0.22, 0.82], [0.26, 0.9], [0.0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 14);
    B.geometry(goldM, g, _m.makeTranslation(p.x, 0, p.z));
    g.dispose();
    const fm = floraMat(W), r = rnd(p.x + p.z * 7);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI, x = p.x + Math.cos(a) * 0.08, z = p.z + Math.sin(a) * 0.05;
      const c = Math.cos(a), s = Math.sin(a), w = 0.5;
      B.quad(fm, [x - w / 2 * c, 0.75, z + w / 2 * s], [x + w / 2 * c, 0.75, z - w / 2 * s], [x + w / 2 * c + (r() - 0.5) * 0.2, 1.75, z - w / 2 * s], [x - w / 2 * c + (r() - 0.5) * 0.2, 1.75, z + w / 2 * s], floraUV('wheat'));
    }
    W.addCircle(p.x, p.z, 0.32);
  },
};

const halo = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const r = p.r || 1.3;
    const mat = new THREE.MeshBasicMaterial({ color: '#e8fff4', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 48), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.2, p.z);
    G.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.02, 6, 40), mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.set(p.x, 0.22, p.z);
    G.add(ring2);
    const glow = makeGlow('#f0fff8', 2.6, 0.45, { pull: 0.2 });
    glow.position.set(p.x, 0.6, p.z);
    G.add(glow);
    W.addUpdater((dt, t) => {
      ring.rotation.z = t * 0.15;
      ring2.rotation.z = -t * 0.22;
      mat.opacity = 0.45 + Math.sin(t * 0.8) * 0.08;
    });
  },
};

const sun = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const size = p.size || 3;
    for (const [s, c, k] of [[size * 2.6, '#ffd890', 0.35], [size * 1.4, '#fff0c8', 0.7], [size * 0.7, '#fffcf0', 1.2]]) {
      const g = makeGlow(c, s, k, { pull: 0 });
      g.position.set(p.x, p.y, p.z);
      G.add(g);
    }
  },
};

export default {
  'dr.house': house,
  'dr.fence': fence,
  'dr.footbridge': footbridge,
  'dr.field': field,
  'dr.urn': urn,
  'dr.halo': halo,
  'dr.sun': sun,
};
