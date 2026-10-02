// Boss models. Each returns { root, update(s, dt, t), flash(sec) }.
// s: { face, vulnerable (0..1), charge (0..1), rage (0..1), attack (string), dead (0..1), roar (0..1), jump, thread }
import * as THREE from 'three';
import { sphere, capsule, box, cone, cyl, torus, octa, mat, emissiveMat, part, group, glowSprite } from './common.js';
import { getTexture } from '../textures.js';
import { damp, clamp, lerp } from '../../core/util.js';

function flasher(mats) {
  let t = 0;
  return {
    flash(sec = 0.2) { t = sec; },
    apply(dt) { t = Math.max(0, t - dt); const f = t > 0 ? 1 : 0; for (const m of mats) if (m.emissive) { if (f) { m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = 0.9; } else if (!m.userData.glow) { m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = 0; } } },
  };
}
function stars(parent, y) {
  const g = group(parent, [0, y, 0]);
  const items = [];
  for (let i = 0; i < 3; i++) { const s = glowSprite(0xffe27a, 0.9, 0.95, getTexture('glow')); g.add(s); items.push(s); }
  g.visible = false;
  return { g, items, update(t, on) { g.visible = on; if (!on) return; items.forEach((s, i) => { const a = t * 4 + (i * Math.PI * 2) / 3; s.position.set(Math.cos(a) * 1.2, Math.sin(a * 2) * 0.1, Math.sin(a) * 1.2); }); } };
}

// ---------------------------------------------------------------------------------------- Stone Golem
export function createGolem() {
  const stone = mat(0x7d8a8c, { roughness: 0.95, map: getTexture('stone') });
  const dark = mat(0x4f5c60, { roughness: 1, map: getTexture('stone') });
  const moss = mat(0x3f8a4a, { roughness: 1 });
  const glowM = new THREE.MeshStandardMaterial({ color: 0xff9a2a, emissive: 0xff7a1a, emissiveIntensity: 1.6, roughness: 0.4 });
  glowM.userData.glow = true;
  const coreM = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffa010, emissiveIntensity: 1.8, roughness: 0.3 });
  coreM.userData.glow = true;
  const fl = flasher([stone, dark]);
  const root = new THREE.Group(), tilt = group(root);
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = group(tilt, [sx * 0.95, 1.7, 0]);
    part(box(1.3, 1.8, 1.4), stone, { p: [0, -0.8, 0], parent: l });
    part(box(1.5, 0.5, 1.9), dark, { p: [0, -1.55, 0.25], parent: l });
    legs.push(l);
  }
  const torso = group(tilt, [0, 3.7, 0]);
  part(box(3.2, 2.7, 2.2), stone, { parent: torso });
  part(box(2.6, 0.6, 1.8), dark, { p: [0, -1.5, 0], parent: torso });
  part(box(1.2, 0.5, 0.8), moss, { p: [-0.8, 1.35, -0.2], parent: torso, cast: false });
  part(box(0.9, 0.4, 0.7), moss, { p: [1.0, 1.35, 0.3], parent: torso, cast: false });
  const core = part(sphere(0.62, 14, 12), coreM, { p: [0, 0.15, 1.1], parent: torso, cast: false });
  part(torus(0.85, 0.12, 6, 16), dark, { p: [0, 0.15, 1.08], parent: torso });
  for (const [x, y] of [[-1.1, 0.9], [1.1, 0.9], [-1.1, -0.5], [1.1, -0.5]]) part(box(0.3, 0.12, 0.1), glowM, { p: [x, y, 1.12], parent: torso, cast: false });
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = group(torso, [sx * 2.1, 1.0, 0]);
    part(box(1.4, 1.4, 1.4), dark, { p: [0, 0.1, 0], parent: a });
    part(box(1.0, 1.7, 1.0), stone, { p: [0, -1.1, 0], parent: a });
    const fist = group(a, [0, -2.2, 0]);
    part(box(1.5, 1.4, 1.5), stone, { parent: fist });
    part(box(1.1, 0.25, 0.1), glowM, { p: [0, 0.2, 0.78], parent: fist, cast: false });
    arms.push({ a, fist });
  }
  const head = group(torso, [0, 2.2, 0.15]);
  part(box(1.7, 1.5, 1.6), stone, { parent: head });
  part(box(1.9, 0.35, 1.7), dark, { p: [0, 0.8, 0], parent: head });
  const eyes = [];
  for (const sx of [-1, 1]) { const e = part(box(0.42, 0.22, 0.12), glowM, { p: [sx * 0.42, 0.12, 0.82], parent: head, cast: false }); eyes.push(e); part(box(0.55, 0.14, 0.14), dark, { p: [sx * 0.42, 0.35, 0.84], r: [0, 0, sx * 0.25], parent: head, cast: false }); }
  part(box(0.8, 0.14, 0.1), dark, { p: [0, -0.35, 0.82], parent: head, cast: false });
  const st = stars(head, 1.3);
  const halo = glowSprite(0xff8a2a, 5.5, 0, getTexture('glow')); halo.position.set(0, 3.9, 1.4); tilt.add(halo);
  let squat = 0;
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      tilt.rotation.y = damp(tilt.rotation.y, s.face * 0.42, 10, dt);
      const breathe = Math.sin(t * 1.8) * 0.03;
      squat = damp(squat, s.attack === 'jumpWind' ? 1 : 0, 14, dt);
      const raise = s.attack === 'slamWind' ? 1 : 0, slam = s.attack === 'slam' ? 1 : 0, roar = s.roar || 0;
      const vul = s.vulnerable ? 1 : 0;
      torso.position.y = 3.7 - squat * 0.7 + breathe - vul * 0.35;
      legs.forEach((l, i) => { l.scale.y = 1 - squat * 0.2; l.rotation.x = s.jump ? (i ? 0.3 : -0.3) : 0; });
      arms.forEach(({ a }, i) => {
        const side = i; // 0 = left (-x), 1 = right
        let rx = Math.sin(t * 1.5 + i) * 0.05 + (vul ? 0.3 : 0), rz = (side ? -1 : 1) * 0.1;
        if (raise && side === 1) rx = -2.7;
        if (slam && side === 1) rx = 0.3;
        if (roar) { rx = -1.2 * roar; rz = (side ? -1 : 1) * 0.9 * roar; }
        if (s.attack === 'jump' || s.attack === 'jumpWind') rx = -1.4;
        a.rotation.x = damp(a.rotation.x, rx, 16, dt); a.rotation.z = damp(a.rotation.z, rz, 16, dt);
      });
      head.rotation.x = damp(head.rotation.x, vul ? 0.55 : -roar * 0.4, 10, dt);
      const e = (s.charge || 0) * 2.5 + (s.rage || 0) * 1.2 + 1.2 + (vul ? -0.7 : 0) + (roar * 2);
      glowM.emissiveIntensity = e; coreM.emissiveIntensity = 1.5 + (s.rage || 0) * 1.5 + (s.charge || 0) * 2 - vul * 0.8;
      for (const eye of eyes) eye.scale.y = vul ? 0.2 : 1;
      halo.material.opacity = 0.12 + (s.rage || 0) * 0.28 + (s.charge || 0) * 0.3;
      st.update(t, vul > 0);
      if (s.dead > 0) { root.scale.set(1, Math.max(0.03, 1 - s.dead * 0.97), 1); root.rotation.z = s.dead * 0.12 * Math.sin(t * 60); }
      fl.apply(dt);
    },
  };
}

// ---------------------------------------------------------------------------------------- Crystal Spider Queen
export function createQueen() {
  const skin = mat(0x5a46a8, { roughness: 0.4, metalness: 0.15, emissive: 0x1a1040, emissiveIntensity: 0.6 });
  const skin2 = mat(0x7a62cc, { roughness: 0.4, emissive: 0x241450, emissiveIntensity: 0.6 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0xff5a9a, emissive: 0xff2a7a, emissiveIntensity: 2, roughness: 0.2 });
  eyeM.userData.glow = true;
  const crystals = [0x4fe8ff, 0xff5ad8, 0x7a8bff].map((c) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.3, roughness: 0.15 }); m.userData.glow = true; return m; });
  const fang = mat(0xf0f0ff, { roughness: 0.3 });
  const thread = mat(0xe8e8f4, { roughness: 0.6 });
  const fl = flasher([skin, skin2]);
  const root = new THREE.Group();
  const body = group(root, [0, 1.7, 0]);
  const tilt = group(body);
  const abd = group(tilt, [0, 0.1, -1.6]);
  part(sphere(1.7, 18, 14), skin, { s: [1, 0.95, 1.35], parent: abd });
  part(sphere(1.0, 12, 10), skin2, { p: [0, 0.6, 0.6], s: [1.4, 0.4, 1.4], parent: abd, cast: false });
  for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.32; part(octa(0.42, 0), crystals[i % 3], { p: [Math.sin(a) * 1.3, 1.55 - Math.abs(i - 3) * 0.18, -0.4 + (i - 3) * 0.2], s: [0.7, 1.9, 0.7], r: [0, 0, -a * 0.8], parent: abd, cast: false }); }
  part(sphere(1.15, 16, 12), skin, { p: [0, 0, 0.1], parent: tilt });
  const head = group(tilt, [0, 0.1, 1.35]);
  part(sphere(0.85, 16, 12), skin, { parent: head });
  for (let i = 0; i < 6; i++) { const sx = i < 3 ? -1 : 1, k = i % 3; part(sphere(0.13 - k * 0.02, 8, 6), eyeM, { p: [sx * (0.25 + k * 0.17), 0.3 - k * 0.1, 0.72 - k * 0.12], parent: head, cast: false }); }
  const fangs = [];
  for (const sx of [-1, 1]) { const f = group(head, [sx * 0.3, -0.45, 0.65]); part(cone(0.14, 0.75, 6), fang, { p: [0, -0.3, 0], r: [Math.PI, 0, sx * 0.15], parent: f }); fangs.push(f); }
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.35; part(octa(0.25, 0), crystals[(i + 1) % 3], { p: [Math.sin(a) * 0.55, 0.85 + (2 - Math.abs(i - 2)) * 0.15, 0.1], s: [0.6, 1.8, 0.6], r: [0, 0, -a], parent: head, cast: false }); }
  const legs = [];
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
    const l = group(tilt, [sx * 0.9, 0, 0.7 - i * 0.65]);
    part(cyl(0.2, 0.15, 2.0, 6), skin, { p: [sx * 0.9, 0.45, 0], r: [0, 0, sx * -1.05], parent: l });
    const knee = group(l, [sx * 1.8, 0.95, 0]);
    part(sphere(0.25, 8, 6), skin2, { parent: knee });
    part(cyl(0.15, 0.08, 2.6, 6), skin, { p: [sx * 0.55, -1.2, 0], r: [0, 0, sx * 0.4], parent: knee });
    legs.push({ l, knee, sx, i });
  }
  const line = part(cyl(0.05, 0.05, 1, 5), thread, { p: [0, 3, 0], parent: body, cast: false });
  const st = stars(head, 1.8);
  const halo = glowSprite(0xff5ad8, 7, 0.18, getTexture('glow')); halo.position.set(0, 0.2, 0.2); body.add(halo);
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      const vul = s.vulnerable ? 1 : 0, wind = s.attack === 'diveWind' ? 1 : 0;
      body.rotation.z = Math.sin(t * 1.7) * 0.05 * (1 - vul);
      tilt.rotation.x = damp(tilt.rotation.x, s.attack === 'dive' ? 0.5 : vul ? -0.1 : 0, 10, dt);
      legs.forEach(({ l, knee, sx, i }) => {
        const sway = Math.sin(t * (vul ? 6 : 2.2) + i * 1.2 + (sx > 0 ? 1 : 0)) * (vul ? 0.35 : 0.14) + (wind ? Math.sin(t * 40 + i) * 0.1 : 0);
        l.rotation.z = sx * (-0.15 + sway) + (s.attack === 'dive' ? sx * -0.5 : 0);
        knee.rotation.z = sx * (0.1 - sway * 0.7);
        l.rotation.y = sx * (i - 1.5) * 0.18;
      });
      fangs.forEach((f, i) => { f.rotation.x = Math.sin(t * 5 + i) * 0.1 + (s.charge || 0) * 0.5 - vul * 0.2; });
      eyeM.emissiveIntensity = 1.6 + (s.charge || 0) * 2 + (s.rage || 0) - vul * 1.2;
      crystals.forEach((m, i) => { m.emissiveIntensity = 1.2 + Math.sin(t * 3 + i * 2) * 0.35 + (s.rage || 0) * 0.8; });
      halo.material.opacity = 0.14 + (s.charge || 0) * 0.3 + (s.rage || 0) * 0.15;
      const len = Math.max(0.5, s.thread || 6);
      line.scale.set(1, len, 1); line.position.y = 1.0 + len / 2 + 1.0;
      st.update(t, vul > 0);
      if (s.dead > 0) { root.scale.setScalar(Math.max(0.03, 1 - s.dead * 0.95)); root.rotation.z = Math.sin(t * 50) * 0.1 * s.dead; }
      fl.apply(dt);
    },
  };
}

// ---------------------------------------------------------------------------------------- Tiki Overlord
export function createOverlord() {
  const wood = mat(0x5a2f1a, { roughness: 0.85, map: getTexture('bark') });
  const wood2 = mat(0x7a4426, { roughness: 0.85, map: getTexture('bark') });
  const gold = mat(0xe8b23a, { metalness: 0.7, roughness: 0.3, emissive: 0x442a00, emissiveIntensity: 0.4 });
  const maskM = mat(0x8a3a24, { roughness: 0.6 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x66ffe0, emissive: 0x22ffcc, emissiveIntensity: 2, roughness: 0.2 });
  eyeM.userData.glow = true;
  const mouthM = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff4a10, emissiveIntensity: 0.4, roughness: 0.4 });
  mouthM.userData.glow = true;
  const feather = [0xd8281e, 0xffc12a, 0x2a9ad8, 0x3ab04a].map((c) => mat(c, { roughness: 0.8 }));
  const iron = mat(0x40444c, { metalness: 0.7, roughness: 0.4 });
  const red = mat(0xc42a2a, { roughness: 0.6 });
  const fl = flasher([wood, wood2, maskM]);
  const root = new THREE.Group(), tilt = group(root);
  const legs = [];
  for (const sx of [-1, 1]) { const l = group(tilt, [sx * 1.0, 1.6, 0]); part(box(1.4, 1.8, 1.5), wood, { p: [0, -0.7, 0], parent: l }); part(box(1.7, 0.55, 2.0), wood2, { p: [0, -1.55, 0.25], parent: l }); legs.push(l); }
  const torso = group(tilt, [0, 3.5, 0]);
  part(sphere(1.9, 18, 14), wood, { s: [1.15, 1.0, 0.95], parent: torso });
  part(sphere(1.3, 14, 10), wood2, { p: [0, -0.4, 0.7], s: [1.2, 0.9, 0.6], parent: torso });
  for (let i = 0; i < 3; i++) part(box(2.6 - i * 0.4, 0.14, 0.12), gold, { p: [0, 0.8 - i * 0.55, 1.5], parent: torso, cast: false });
  part(torus(1.2, 0.14, 8, 22), gold, { p: [0, 1.3, 0.5], r: [Math.PI / 2.4, 0, 0], parent: torso });
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = group(torso, [sx * 2.4, 1.0, 0.2]);
    part(sphere(0.85, 12, 10), wood2, { parent: a });
    part(capsule(0.7, 1.4), wood, { p: [0, -1.3, 0], parent: a });
    const hand = group(a, [0, -2.6, 0]);
    part(sphere(0.95, 12, 10), wood2, { parent: hand });
    part(torus(0.8, 0.12, 6, 14), gold, { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0], parent: hand });
    arms.push({ a, hand });
  }
  const head = group(torso, [0, 2.7, 0.3]);
  part(sphere(1.0, 14, 10), wood2, { parent: head });
  const mask = group(head, [0, 0.1, 0.8]);
  part(box(2.5, 3.0, 0.5), maskM, { parent: mask });
  part(box(2.9, 0.4, 0.6), gold, { p: [0, 1.5, 0.05], parent: mask });
  const eyes = [];
  for (const sx of [-1, 1]) { const e = part(box(0.6, 0.4, 0.2), eyeM, { p: [sx * 0.65, 0.45, 0.3], parent: mask, cast: false }); eyes.push(e); part(box(0.85, 0.2, 0.25), mat(0x2a1208), { p: [sx * 0.65, 0.85, 0.3], r: [0, 0, sx * 0.35], parent: mask, cast: false }); }
  part(box(0.55, 0.9, 0.5), maskM, { p: [0, -0.2, 0.4], parent: mask });
  const mouth = part(box(1.6, 0.6, 0.2), mouthM, { p: [0, -0.95, 0.28], parent: mask, cast: false });
  for (let i = 0; i < 4; i++) part(cone(0.12, 0.45, 5), mat(0xffffff), { p: [-0.55 + i * 0.37, -0.75, 0.42], r: [Math.PI, 0, 0], parent: mask, cast: false });
  for (let i = 0; i < 9; i++) { const a = (i - 4) * 0.28; part(cone(0.22, 2.0 + (4 - Math.abs(i - 4)) * 0.3, 6), feather[i % 4], { p: [Math.sin(a) * 1.7, 1.9 + Math.cos(a) * 0.5, -0.2], r: [0, 0, -a * 0.9], parent: head }); }
  const heldBarrel = group(torso, [0, 4.2, 0.9]);
  part(cyl(0.6, 0.6, 1.1, 14), wood2, { r: [Math.PI / 2, 0, 0], parent: heldBarrel });
  part(torus(0.6, 0.06, 6, 16), iron, { p: [0, 0, 0.3], parent: heldBarrel }); part(torus(0.6, 0.06, 6, 16), iron, { p: [0, 0, -0.3], parent: heldBarrel });
  part(torus(0.4, 0.06, 6, 16), red, { p: [0, 0, 0.56], parent: heldBarrel, cast: false });
  heldBarrel.visible = false;
  const st = stars(head, 3.6);
  const halo = glowSprite(0x66ffe0, 6, 0.1, getTexture('glow')); halo.position.set(0, 0.2, 1.6); head.add(halo);
  let squat = 0;
  return {
    root, flash: fl.flash,
    update(s, dt, t) {
      tilt.rotation.y = damp(tilt.rotation.y, s.face * 0.4, 10, dt);
      const vul = s.vulnerable ? 1 : 0, lift = s.attack === 'lift' ? 1 : 0, roar = s.roar || 0;
      squat = damp(squat, s.attack === 'jumpWind' ? 1 : 0, 14, dt);
      torso.position.y = 3.5 - squat * 0.8 + Math.sin(t * 1.6) * 0.05 - vul * 0.4;
      legs.forEach((l) => { l.scale.y = 1 - squat * 0.22; });
      heldBarrel.visible = lift > 0;
      arms.forEach(({ a }, i) => {
        let rx = Math.sin(t * 1.4 + i) * 0.05, rz = (i ? -1 : 1) * 0.12;
        if (lift) { rx = -2.9; rz = (i ? -1 : 1) * 0.25; }
        if (roar) { rx = -0.5; rz = (i ? -1 : 1) * 1.25 * roar; }
        if (s.attack === 'jump') { rx = -1.8; }
        if (s.attack === 'summon') { rx = -2.2; rz = (i ? -1 : 1) * 0.7; }
        a.rotation.x = damp(a.rotation.x, rx, 16, dt); a.rotation.z = damp(a.rotation.z, rz, 16, dt);
      });
      head.rotation.x = damp(head.rotation.x, vul ? 0.5 : -roar * 0.45, 10, dt);
      eyeM.emissiveIntensity = 1.6 + (s.charge || 0) * 2.5 + (s.rage || 0) * 1.5 - vul * 1.2;
      mouthM.emissiveIntensity = 0.4 + (s.charge || 0) * 2 + roar * 2;
      halo.material.opacity = 0.1 + (s.rage || 0) * 0.3 + (s.charge || 0) * 0.3;
      mouth.scale.y = 1 + roar * 1.2 + (s.charge || 0) * 0.5;
      st.update(t, vul > 0);
      if (s.dead > 0) { root.scale.set(1, Math.max(0.03, 1 - s.dead * 0.97), 1); root.rotation.z = s.dead * 0.2 * Math.sin(t * 50); }
      fl.apply(dt);
    },
  };
}
