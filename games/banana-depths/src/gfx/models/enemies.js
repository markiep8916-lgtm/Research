// Procedural enemy models. Each factory returns { root, update(state, dt, t), flash(sec) }.
// state: { face, vx, vy, hurt (0..1), dead (0..1 death progress), charge (0..1), ground }
// Local space: +z forward, y up, feet at y = 0. The yaw gives a 3/4 view toward the camera.
import * as THREE from 'three';
import { sphere, capsule, box, cone, cyl, torus, mat, emissiveMat, part, group, glowSprite } from './common.js';
import { getTexture } from '../textures.js';
import { damp, clamp } from '../../core/util.js';

const YAW = Math.PI / 2 - 0.4;

function flasher(mats) {
  let t = 0;
  return {
    flash(sec = 0.2) { t = sec; },
    apply(dt) {
      t = Math.max(0, t - dt);
      const f = t > 0 ? 1 : 0;
      for (const m of mats) if (m.emissive) { m.emissive.setRGB(f, f, f); m.emissiveIntensity = f * 0.9; }
    },
  };
}

function pose(root, tilt, s, dt) {
  const target = s.face > 0 ? YAW : -YAW;
  tilt.rotation.y = damp(tilt.rotation.y || target, target, 18, dt);
  if (s.dead > 0) { root.scale.set(1 + s.dead * 0.3, Math.max(0.02, 1 - s.dead), 1 + s.dead * 0.3); }
}

// ---------------------------------------------------------------------------------- Snapjaw
export function createSnapjaw() {
  const green = mat(0x4fae48, { roughness: 0.6 }), dark = mat(0x2d7a38, { roughness: 0.7 }), belly = mat(0xe8f0b0), tooth = mat(0xffffff, { roughness: 0.3 });
  const eyeM = mat(0xffe34a, { roughness: 0.3 }), pup = mat(0x111111);
  const fl = flasher([green, dark, belly]);
  const root = new THREE.Group(), tilt = group(root);
  const body = group(tilt, [0, 0.42, 0]);
  part(sphere(0.4, 18, 14), green, { s: [0.9, 0.82, 1.5], parent: body });
  part(sphere(0.34, 14, 10), belly, { p: [0, -0.12, 0.05], s: [0.9, 0.7, 1.4], parent: body });
  for (let i = 0; i < 5; i++) part(cone(0.1, 0.24, 6), dark, { p: [0, 0.32 - Math.abs(i - 2) * 0.03, -0.38 + i * 0.22], parent: body });
  const tail = group(body, [0, -0.02, -0.55]);
  part(sphere(0.26, 12, 10), green, { p: [0, 0, -0.15], s: [0.8, 0.8, 1.4], parent: tail });
  const tail2 = group(tail, [0, 0, -0.42]);
  part(cone(0.2, 0.6, 8), green, { p: [0, 0, -0.2], r: [-Math.PI / 2, 0, 0], parent: tail2 });
  const head = group(body, [0, 0.12, 0.62]);
  part(sphere(0.3, 16, 12), green, { s: [1, 0.85, 1.1], parent: head });
  part(sphere(0.2, 12, 10), green, { p: [0, 0, 0.24], s: [1, 0.7, 1.4], parent: head });
  const jaw = group(head, [0, -0.1, 0.1]);
  part(box(0.46, 0.1, 0.62), dark, { p: [0, -0.03, 0.3], parent: jaw });
  for (let i = 0; i < 5; i++) { part(cone(0.04, 0.1, 5), tooth, { p: [-0.18 + i * 0.09, 0.07, 0.5], parent: jaw, cast: false }); }
  for (let i = 0; i < 4; i++) part(cone(0.04, 0.1, 5), tooth, { p: [-0.14 + i * 0.09, -0.04, 0.56], r: [Math.PI, 0, 0], parent: head, cast: false });
  for (const sx of [-1, 1]) {
    const e = group(head, [sx * 0.17, 0.24, 0.1]);
    part(sphere(0.1, 10, 8), eyeM, { parent: e }); part(sphere(0.05, 8, 6), pup, { p: [0, 0, 0.07], parent: e, cast: false });
  }
  const legs = [];
  for (const [sx, z] of [[-1, 0.3], [1, 0.3], [-1, -0.3], [1, -0.3]]) {
    const l = group(body, [sx * 0.34, -0.2, z]);
    part(capsule(0.08, 0.14), green, { p: [0, -0.1, 0], parent: l });
    part(sphere(0.12, 8, 6), dark, { p: [0, -0.24, 0.05], s: [1, 0.6, 1.4], parent: l });
    legs.push(l);
  }
  let ph = Math.random() * 6, snap = 0;
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      pose(root, tilt, s, dt);
      ph += dt * Math.abs(s.vx) * 5;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.5 : 0)) * 0.7 * Math.min(1, Math.abs(s.vx)); });
      snap += dt;
      jaw.rotation.x = Math.max(0, Math.sin(snap * 3.2)) ** 3 * 0.45 + (s.charge || 0) * 0.5;
      tail.rotation.y = Math.sin(t * 4) * 0.35;
      body.position.y = 0.42 + Math.abs(Math.sin(ph)) * 0.03;
      fl.apply(dt);
    },
  };
}

// ---------------------------------------------------------------------------------- Thornbug
export function createThornbug() {
  const shell = mat(0x8a2a52, { roughness: 0.4 }), dark = mat(0x4a1230), spike = mat(0xf4e6c8, { roughness: 0.4 }), eyeM = emissiveMat(0xffd23a, 1.4);
  const fl = flasher([shell, dark]);
  const root = new THREE.Group(), tilt = group(root);
  const body = group(tilt, [0, 0.38, 0]);
  part(sphere(0.42, 18, 14), shell, { s: [0.9, 0.8, 1.2], parent: body });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, rr = i < 8 ? 0.28 : 0;
    part(cone(0.1, 0.42, 6), spike, { p: [Math.cos(a) * rr * 1.1, 0.26 + (i === 8 ? 0.1 : 0.02), Math.sin(a) * rr * 1.5 - 0.05], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.5], parent: body });
  }
  const head = group(body, [0, -0.02, 0.5]);
  part(sphere(0.24, 12, 10), dark, { parent: head });
  for (const sx of [-1, 1]) {
    part(sphere(0.08, 8, 6), eyeM, { p: [sx * 0.12, 0.08, 0.17], parent: head, cast: false });
    part(cone(0.05, 0.28, 5), spike, { p: [sx * 0.12, -0.12, 0.25], r: [Math.PI / 2 + 0.2, 0, sx * 0.4], parent: head });
  }
  const legs = [];
  for (const [sx, z] of [[-1, 0.3], [1, 0.3], [-1, 0], [1, 0], [-1, -0.3], [1, -0.3]]) {
    const l = group(body, [sx * 0.34, -0.12, z]);
    part(cyl(0.035, 0.035, 0.36, 6), dark, { p: [sx * 0.15, -0.1, 0], r: [0, 0, sx * 0.9], parent: l });
    part(cyl(0.03, 0.03, 0.3, 6), dark, { p: [sx * 0.3, -0.26, 0], r: [0, 0, -sx * 0.3], parent: l });
    legs.push(l);
  }
  let ph = Math.random() * 6;
  return {
    root, flash: fl.flash,
    update(s, dt) {
      pose(root, tilt, s, dt);
      ph += dt * Math.max(2, Math.abs(s.vx) * 6);
      legs.forEach((l, i) => { l.rotation.y = Math.sin(ph + i * 1.1) * 0.35; l.rotation.z = Math.cos(ph + i * 1.1) * 0.12; });
      body.position.y = 0.38 + Math.abs(Math.sin(ph * 1.3)) * 0.02;
      fl.apply(dt);
    },
  };
}

// ---------------------------------------------------------------------------------- Bat
export function createBat() {
  const fur = mat(0x4a3070, { roughness: 0.8 }), wingM = mat(0x2a1c46, { roughness: 0.9, side: THREE.DoubleSide }), eyeM = emissiveMat(0xff4a5a, 1.6), tan = mat(0xd9a0c0);
  const fl = flasher([fur, wingM]);
  const root = new THREE.Group(), flip = group(root, [0, 0.5, 0]), tilt = group(flip, [0, -0.5, 0]);
  const body = group(tilt, [0, 0.5, 0]);
  part(sphere(0.3, 14, 12), fur, { s: [0.9, 1.05, 0.85], parent: body });
  part(sphere(0.2, 12, 10), tan, { p: [0, -0.06, 0.18], s: [0.9, 1, 0.5], parent: body, cast: false });
  const head = group(body, [0, 0.34, 0.06]);
  part(sphere(0.2, 12, 10), fur, { parent: head });
  for (const sx of [-1, 1]) {
    part(cone(0.09, 0.3, 5), fur, { p: [sx * 0.12, 0.2, 0], r: [0, 0, -sx * 0.25], parent: head });
    part(sphere(0.055, 8, 6), eyeM, { p: [sx * 0.08, 0.02, 0.17], parent: head, cast: false });
  }
  part(cone(0.025, 0.07, 4), mat(0xffffff), { p: [-0.04, -0.12, 0.17], r: [Math.PI, 0, 0], parent: head, cast: false });
  part(cone(0.025, 0.07, 4), mat(0xffffff), { p: [0.04, -0.12, 0.17], r: [Math.PI, 0, 0], parent: head, cast: false });
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.6, 0.55, 1.35, 0.25); wingShape.lineTo(1.1, -0.1); wingShape.lineTo(0.85, 0.05); wingShape.lineTo(0.62, -0.28); wingShape.lineTo(0.3, -0.12); wingShape.closePath();
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = group(body, [sx * 0.2, 0.1, 0]);
    const m = part(wingGeo, wingM, { s: [sx, 1, 1], parent: w });
    wings.push(w);
  }
  let ph = Math.random() * 6;
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      pose(root, tilt, s, dt);
      const hang = s.hang ? 1 : 0;
      ph += dt * (hang ? 0 : 16);
      wings.forEach((w, i) => { const sx = i ? 1 : -1; w.rotation.z = hang ? sx * -1.3 : sx * (-0.2 + Math.sin(ph) * 0.9); w.rotation.y = 0; });
      flip.rotation.x = damp(flip.rotation.x, hang ? Math.PI : 0, 14, dt);
      body.position.y = 0.5 + (hang ? 0 : Math.sin(ph * 0.5) * 0.05);
      fl.apply(dt);
      void t;
    },
  };
}

// ---------------------------------------------------------------------------------- Tiki turret
export function createTiki() {
  const wood = mat(0x7a4a26, { roughness: 0.9, map: getTexture('bark') }), dark = mat(0x3b2412), red = mat(0xb02a2a), gold = mat(0xe8b23a, { metalness: 0.3, roughness: 0.5 });
  const eyeM = emissiveMat(0xff8a2a, 0.8), mouthM = emissiveMat(0xff4a1a, 0.2);
  const fl = flasher([wood]);
  const root = new THREE.Group(), tilt = group(root);
  part(box(0.95, 0.35, 0.95), dark, { p: [0, 0.18, 0], parent: tilt });
  const mid = part(box(0.85, 0.95, 0.85), wood, { p: [0, 0.82, 0], parent: tilt });
  part(box(0.95, 0.4, 0.95), red, { p: [0, 1.5, 0], parent: tilt });
  part(box(0.8, 0.12, 0.8), gold, { p: [0, 1.76, 0], parent: tilt });
  for (let i = 0; i < 5; i++) part(cone(0.1, 0.55, 5), i % 2 ? red : gold, { p: [(i - 2) * 0.17, 2.0, 0], r: [0, 0, (i - 2) * 0.22], parent: tilt });
  const face = group(tilt, [0, 0.95, 0.44]);
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = part(box(0.2, 0.12, 0.08), eyeM, { p: [sx * 0.2, 0.22, 0], parent: face, cast: false });
    part(box(0.26, 0.06, 0.08), dark, { p: [sx * 0.2, 0.34, 0.01], r: [0, 0, sx * -0.3], parent: face, cast: false });
    eyes.push(e);
  }
  part(box(0.12, 0.16, 0.08), dark, { p: [0, 0.02, 0.02], parent: face, cast: false });
  const mouth = part(box(0.36, 0.2, 0.08), mouthM, { p: [0, -0.24, 0], parent: face, cast: false });
  const glow = glowSprite(0xff7a2a, 1.4, 0, getTexture('glow')); glow.position.set(0, 0.7, 0.8); tilt.add(glow);
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      // faces the camera, mouth points in `face` direction by turning the whole totem a little
      tilt.rotation.y = damp(tilt.rotation.y, s.face * 0.55, 10, dt);
      const c = s.charge || 0;
      for (const e of eyes) e.material.emissiveIntensity = 0.8 + c * 3;
      mouth.material.emissiveIntensity = 0.2 + c * 3;
      glow.material.opacity = c * 0.9;
      mid.scale.y = 1 + (s.fire ? 0.06 : 0);
      if (s.dead > 0) root.scale.set(1, Math.max(0.02, 1 - s.dead), 1);
      fl.apply(dt);
      void t;
    },
  };
}

// ---------------------------------------------------------------------------------- Magma blob
export function createMagma() {
  const lavaTex = getTexture('lava').clone(); lavaTex.needsUpdate = true;
  const body = new THREE.MeshStandardMaterial({ map: lavaTex, emissive: 0xff5a10, emissiveMap: lavaTex, emissiveIntensity: 1.3, roughness: 0.5, transparent: false });
  const crust = mat(0x2a1410, { roughness: 1 });
  const eyeM = mat(0xfff2c0), pup = mat(0x220808);
  const root = new THREE.Group(), tilt = group(root);
  const blob = group(tilt, [0, 0.45, 0]);
  part(sphere(0.5, 18, 14), body, { s: [1, 0.9, 1], parent: blob });
  for (let i = 0; i < 6; i++) { const a = i * 1.05; part(sphere(0.16, 8, 6), crust, { p: [Math.cos(a) * 0.36, 0.2 + (i % 3) * 0.1, Math.sin(a) * 0.36 - 0.1], s: [1, 0.45, 1], parent: blob }); }
  for (const sx of [-1, 1]) {
    const e = group(blob, [sx * 0.18, 0.12, 0.42]);
    part(sphere(0.12, 10, 8), eyeM, { parent: e, cast: false }); part(sphere(0.06, 8, 6), pup, { p: [0, 0, 0.08], parent: e, cast: false });
  }
  const light = glowSprite(0xff7a2a, 2.2, 0.55, getTexture('glow')); light.position.set(0, 0.5, 0.3); tilt.add(light);
  const lm = emissiveMat(0xff4a10, 1, {}); void lm;
  const fl = flasher([body]);
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      lavaTex.offset.x = (t * 0.1) % 1;
      const air = !s.ground;
      const sy = air ? 1 + clamp(Math.abs(s.vy) / 30, 0, 0.35) : 1 - (s.charge || 0) * 0.3 + Math.sin(t * 5) * 0.03;
      blob.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
      tilt.rotation.y = damp(tilt.rotation.y, s.face * 0.5, 10, dt);
      light.material.opacity = 0.45 + Math.sin(t * 6) * 0.1;
      if (s.dead > 0) root.scale.set(1 + s.dead * 0.6, Math.max(0.02, 1 - s.dead), 1 + s.dead * 0.6);
      fl.apply(dt);
    },
  };
}

// ---------------------------------------------------------------------------------- Spider (hangs on a thread)
export function createSpider() {
  const skin = mat(0x2a2450, { roughness: 0.5 }), mark = mat(0xe03a6a, { roughness: 0.5 }), eyeM = emissiveMat(0xff3a5a, 1.5), thread = mat(0xe8e8f0, { roughness: 0.6 });
  const fl = flasher([skin]);
  const root = new THREE.Group();
  const bodyG = group(root, [0, -3, 0]);
  const body = group(bodyG, [0, -0.4, 0]);
  part(sphere(0.3, 14, 12), skin, { parent: body });
  part(sphere(0.4, 14, 12), skin, { p: [0, 0.02, -0.4], s: [0.9, 0.9, 1.1], parent: body });
  part(sphere(0.12, 8, 6), mark, { p: [0, 0.26, -0.5], s: [1, 0.4, 1.3], parent: body });
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) part(sphere(0.06, 8, 6), eyeM, { p: [sx * (0.08 + i * 0.08), 0.1 + i * 0.05, 0.28], parent: body, cast: false });
  const legs = [];
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
    const l = group(body, [sx * 0.2, 0, 0.18 - i * 0.18]);
    part(cyl(0.035, 0.03, 0.55, 5), skin, { p: [sx * 0.25, 0.1, 0], r: [0, 0, sx * -1.1], parent: l });
    const knee = group(l, [sx * 0.5, 0.3, 0]);
    part(cyl(0.03, 0.02, 0.6, 5), skin, { p: [sx * 0.2, -0.28, 0], r: [0, 0, sx * 0.55], parent: knee });
    legs.push({ l, sx, i });
  }
  const line = part(cyl(0.012, 0.012, 1, 4), thread, { p: [0, 0, 0], parent: root, cast: false });
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      legs.forEach(({ l, sx, i }) => { l.rotation.z = Math.sin(t * 8 + i * 0.9 + (sx > 0 ? 0 : 1.5)) * 0.18; });
      // thread length from anchor (above) down to the body
      const len = s.thread || 3;
      bodyG.position.y = -len;
      line.scale.set(1, len, 1); line.position.y = -len / 2;
      bodyG.rotation.z = Math.sin(t * 2.3) * 0.08;
      bodyG.scale.setScalar(s.dead > 0 ? Math.max(0.02, 1 - s.dead) : 1);
      fl.apply(dt);
    },
  };
}

// ---------------------------------------------------------------------------------- Wisp
export function createWisp() {
  const core = emissiveMat(0xfff0c0, 2.2), dark = mat(0x331100);
  const root = new THREE.Group();
  const c = group(root, [0, 0.6, 0]);
  c.scale.setScalar(1.3);
  part(sphere(0.26, 12, 10), core, { parent: c, cast: false });
  part(cone(0.22, 0.7, 8), emissiveMat(0xff7a1a, 1.4, { transparent: true, opacity: 0.85 }), { p: [0, 0.38, 0], parent: c, cast: false });
  part(cone(0.12, 0.45, 8), emissiveMat(0xffd04a, 1.8, { transparent: true, opacity: 0.9 }), { p: [0, 0.3, 0], parent: c, cast: false });
  for (const sx of [-1, 1]) part(sphere(0.045, 6, 6), dark, { p: [sx * 0.1, 0.03, 0.22], parent: c, cast: false });
  const halo = glowSprite(0xff7a1a, 2.6, 0.55, getTexture('glow')); c.add(halo);
  return {
    root, flash() {},
    update(s, dt, t) {
      c.position.y = 0.6 + Math.sin(t * 3) * 0.08;
      c.children[1].scale.set(1, 1 + Math.sin(t * 14) * 0.15, 1);
      halo.material.opacity = 0.45 + Math.sin(t * 9) * 0.1;
      root.scale.setScalar(s.dead > 0 ? Math.max(0.02, 1 - s.dead) : 1);
    },
  };
}

// ---------------------------------------------------------------------------------- Barrel (rolling hazard)
export function barrelGeometry() {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector2(0.38 + Math.sin(u * Math.PI) * 0.1, (u - 0.5) * 0.75)); }
  const g = new THREE.LatheGeometry(pts, 16);
  g.rotateZ(Math.PI / 2); // axis along x ... rolled around z by the game
  g.rotateY(Math.PI / 2); // axis along z (towards the camera) so it rolls in the x/y plane
  return g;
}
export function createBarrel() {
  const wood = mat(0x9a6230, { roughness: 0.85, map: getTexture('bark') }), iron = mat(0x4a4e56, { metalness: 0.7, roughness: 0.4 }), red = mat(0xc42a2a, { roughness: 0.6 });
  const fl = flasher([wood]);
  const root = new THREE.Group();
  const spin = group(root, [0, 0.42, 0]);
  part(barrelGeometry(), wood, { parent: spin });
  for (const z of [-0.26, 0.26]) part(torus(0.46, 0.04, 6, 20), iron, { p: [0, 0, z], parent: spin });
  part(torus(0.34, 0.05, 6, 18), red, { p: [0, 0, 0.375], parent: spin, cast: false });
  part(cyl(0.2, 0.2, 0.02, 12), red, { p: [0, 0, 0.385], r: [Math.PI / 2, 0, 0], parent: spin, cast: false });
  let ang = 0;
  return {
    root, flash: fl.flash,
    update(s, dt) { ang -= (s.vx || 0) * dt / 0.45; spin.rotation.z = ang; if (s.dead > 0) root.scale.setScalar(Math.max(0.02, 1 - s.dead)); fl.apply(dt); },
  };
}

export function createCannon(facing = 1) {
  const wood = mat(0x7a4a26, { roughness: 0.9, map: getTexture('bark') }), iron = mat(0x3a3e46, { metalness: 0.7, roughness: 0.4 }), red = mat(0xc42a2a);
  const root = new THREE.Group();
  const tilt = group(root);
  part(box(1.1, 0.35, 1.1), iron, { p: [0, 0.18, 0], parent: tilt });
  const tube = group(tilt, [0, 0.82, 0]);
  const barrel = part(cyl(0.5, 0.5, 1.1, 16), wood, { r: [0, 0, Math.PI / 2], parent: tube });
  part(torus(0.5, 0.06, 6, 18), iron, { p: [0.4, 0, 0], r: [0, Math.PI / 2, 0], parent: tube });
  part(torus(0.5, 0.06, 6, 18), iron, { p: [-0.4, 0, 0], r: [0, Math.PI / 2, 0], parent: tube });
  part(cyl(0.34, 0.34, 0.1, 14), mat(0x120a08), { p: [0.56, 0, 0], r: [0, 0, Math.PI / 2], parent: tube, cast: false });
  part(torus(0.5, 0.08, 6, 18), red, { p: [0.57, 0, 0], r: [0, Math.PI / 2, 0], parent: tube, cast: false });
  root.scale.x = facing;
  let recoil = 0;
  return {
    root, flash() {},
    update(s, dt) { recoil = Math.max(0, recoil - dt * 4); if (s.fire) recoil = 1; tube.position.x = -recoil * 0.25; tube.rotation.z = s.charge ? Math.sin(performance.now() * 0.05) * 0.04 : 0; },
  };
}
