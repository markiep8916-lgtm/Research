// Prop builders: static furniture merges into the world's batches (one draw per material), while
// living pieces (crates that open, Med-Stations, the reactor, the holo table, NPCs, the boss) get
// their own objects and register colliders, glows, emitters and interactables on the world.

import * as THREE from 'three';
import { SpriteActor } from '../core/spriteActor.js';
import { makeGlow, makeBlobShadow, makeHologramMaterial } from '../core/vfx.js';
import { textureSet } from '../art/tiles.js';
import { buildNpcSprite } from '../art/characters.js';
import { buildEnemySprite } from '../art/enemies.js';
import { Batch, wrappedCylinder, pipeGeometry } from './geometry.js';
import { worldMaterial, worldTexture } from './paint.js';
import { PROPS, CRATES, NPCS, BOSS } from './maps.js';

const _m = new THREE.Matrix4();

/** Build every prop of the map into world `W`. */
export function buildProps(W) {
  const M = W.mats;
  const side = worldMaterial('metal_side', { roughness: 0.66, metalness: 0.3 });
  const cap = M.tile('wall_cap', { roughness: 0.85, cast: false });
  const mat = {
    side,
    cap,
    pod: M.tile('cryo_pod', { emissive: 0.7, roughness: 0.5, metalness: 0.25 }),
    low: M.tile('wall_low', { roughness: 0.7 }),
    crateSide: M.tile('crate_side', { emissive: 2.2 }),
    crateTop: M.tile('crate_top', { roughness: 0.8 }),
    locker: M.tile('locker', { roughness: 0.6, metalness: 0.3 }),
    consoleFront: [M.tile('console_front', { emissive: 2.4 }), M.tile('console_front', { variant: 1, emissive: 2.4 })],
    consoleTop: M.tile('console_top', { emissive: 2.2 }),
    seat: worldMaterial('seat', { roughness: 0.85, metalness: 0.05 }),
    trim: M.plain('#0b1a22', { emissive: '#3fd6ff', emissiveIntensity: 2.2 }),
    lamp: M.tile('ceiling_lamp', { emissive: 3.2, cast: false }),
    alarm: M.tile('alarm_light', { emissive: 3.0, cast: false }),
    pipe: M.tile('pipe', { roughness: 0.5, metalness: 0.45 }),
    holo: M.tile('holo_table', { emissive: 2.4 }),
    med: worldMaterial('med_front', { emissive: 2.4, roughness: 0.45 }),
    chair: worldMaterial('chair', { alphaTest: 0.5, emissive: 2.6, side: THREE.DoubleSide }),
  };
  W.propMats = mat;
  let consoleIndex = 0;

  for (const p of PROPS) {
    const B = W.batchFor(p.on);
    switch (p.t) {
      case 'pod':
        B.box({ front: mat.pod, left: side, right: side, top: cap }, p.x, p.z, 0.92, 0.7, 0, 2.0, 0,
          { left: [0, 0, 0.7, 2], right: [0, 0, 0.7, 2], top: [0, 0, 0.92, 0.7] });
        B.box({ front: mat.low, left: side, right: side, top: cap }, p.x, p.z + 0.38, 1.0, 0.08, 0, 0.18, 0,
          { front: [0, 0, 1, 0.24] });
        W.addBox(p.x, p.z, 0.96, 0.78);
        break;
      case 'bed':
        B.box({ front: mat.low, left: side, right: side, top: mat.pod }, p.x, p.z, 1.0, 2.0, 0, 0.62, 0,
          { front: [0, 0, 1, 0.83], left: [0, 0, 2, 0.62], right: [0, 0, 2, 0.62] });
        W.addBox(p.x, p.z, 1.0, 2.0);
        break;
      case 'crate':
        crateBox(B, mat, p.x, p.z, p.s || 1, p.y || 0, p.rot || 0);
        if (!p.y) W.addBox(p.x, p.z, (p.s || 1) * 1.05, (p.s || 1) * 1.05);
        break;
      case 'locker':
        B.box({ front: mat.locker, left: side, right: side, top: cap }, p.x, p.z, 0.96, 0.6, 0, 2.0, 0,
          { left: [0, 0, 0.6, 2], right: [0, 0, 0.6, 2], top: [0, 0, 0.96, 0.6] });
        W.addBox(p.x, p.z, 1.0, 0.64);
        break;
      case 'console': {
        const front = mat.consoleFront[consoleIndex++ % 2];
        B.box({ front, left: side, right: side, top: mat.consoleTop }, p.x, p.z, 0.96, 0.62, 0, 0.95, 0,
          { left: [0, 0, 0.62, 0.95], right: [0, 0, 0.62, 0.95] });
        W.addBox(p.x, p.z, 1.0, 0.66);
        if (p.id) W.addInteractable({ kind: 'terminal', id: p.id, x: p.x, z: p.z + 0.31, box: [p.x - 0.5, p.z - 0.33, p.x + 0.5, p.z + 0.33], label: 'Access', icon: 'inspect' });
        break;
      }
      case 'bench':
        bench(B, mat, p);
        W.addBox(p.x, p.z, p.w || 2, 0.7);
        break;
      case 'lamp': {
        B.faceZ(mat.lamp, p.x - 0.25, p.x + 0.25, p.y - 0.25, p.y + 0.25, p.z + 0.012, 1);
        const glow = makeGlow(p.cool ? '#cdeeff' : '#ffb85a', 1.25, 1.1);
        glow.position.set(p.x, p.y - 0.05, p.z + 0.18);
        W.groupFor(p.on).add(glow);
        W.glows.push({ x: p.x, z: p.z + 0.7, sprite: glow });
        break;
      }
      case 'sign':
        B.faceZ(M.tile(p.name, { emissive: 2.6, cast: false }), p.x - 1, p.x + 1, 3.02, 3.52, p.z + 0.03, 1);
        B.box({ back: side, top: cap }, p.x, p.z + 0.05, 2.0, 0.06, 3.0, 3.52, 0);
        break;
      case 'guide': {
        // floor guide LEDs (aisle lights) along a wall
        const led = W.mats.plain('#0b0e17', { emissive: p.color, emissiveIntensity: 2.4, roughness: 0.4 });
        for (let x = p.x0; x <= p.x1 + 1e-6; x += p.step) B.faceY(led, x - 0.06, x + 0.06, p.z - 0.025, p.z + 0.025, 0.008);
        break;
      }
      case 'decal':
        B.faceY(M.decal(p.name), p.x - 0.5, p.x + 0.5, p.z - 0.5, p.z + 0.5, 0.006, null, p.rot || 0);
        break;
      case 'pipe':
        pipe(B, mat.pipe, p);
        break;
      case 'vent':
        W.addEmitter('steam', { position: [p.x, 0.05, p.z], area: [0.3, 0.05, 0.3], rate: 9 });
        break;
      case 'alarm': {
        B.faceZ(mat.alarm, p.x - 0.25, p.x + 0.25, p.y - 0.25, p.y + 0.25, p.z + 0.012, 1);
        const glow = makeGlow('#ff3344', 1.6, 1.4);
        glow.position.set(p.x, p.y, p.z + 0.2);
        W.groupFor(p.on).add(glow);
        W.alarm = { x: p.x, y: p.y, z: p.z, on: p.on, glow };
        break;
      }
      case 'conduit':
        conduit(W, B, mat, p);
        break;
      case 'med':
        medStation(W, B, mat, p);
        break;
      case 'reactor':
        reactor(W, p);
        break;
      case 'holoTable':
        holoTable(W, B, mat, p);
        break;
      case 'chair': {
        B.faceZ(mat.chair, p.x - 0.5, p.x + 0.5, 0, 1.375, p.z, 1);
        const blob = makeBlobShadow(0.55, 0.5);
        blob.position.set(p.x, 0.012, p.z);
        blob.scale.z = 0.7;
        W.root.add(blob);
        W.addBox(p.x, p.z - 0.1, 0.9, 0.7);
        break;
      }
      default:
        throw new Error(`world: unknown prop type "${p.t}"`);
    }
  }

  for (const c of CRATES) supplyCrate(W, mat, c);
  for (const n of NPCS) npc(W, n);
  boss(W);
}

// ---------------------------------------------------------------- static pieces

function crateBox(B, mat, x, z, s, y, rot) {
  B.box({ front: mat.crateSide, back: mat.crateSide, left: mat.crateSide, right: mat.crateSide, top: mat.crateTop },
    x, z, s, s, y, y + s, rot);
}

/** Lounge bench facing the windows: cushioned seat and backrest on two pedestals. */
function bench(B, mat, p) {
  const w = p.w || 2;
  B.box({ front: mat.side, left: mat.side, right: mat.side, top: mat.seat }, p.x, p.z, w, 0.62, 0.36, 0.5, 0,
    { front: [0, 0, w, 0.14], left: [0, 0, 0.62, 0.14], right: [0, 0, 0.62, 0.14], top: [0, 0, w, 1] });
  B.box({ front: mat.seat, left: mat.side, right: mat.side, top: mat.side, back: mat.seat }, p.x, p.z + 0.27, w, 0.1, 0.5, 1.05, 0,
    { front: [0, 0, w, 1], back: [0, 0, w, 1], top: [0, 0, w, 0.1] });
  // glowing piping along the backrest
  B.faceZ(mat.trim, p.x - w / 2 + 0.06, p.x + w / 2 - 0.06, 0.98, 1.02, p.z + 0.325, 1);
  for (const dx of [-w / 2 + 0.3, w / 2 - 0.3]) {
    B.box({ front: mat.side, left: mat.side, right: mat.side }, p.x + dx, p.z, 0.16, 0.46, 0, 0.36, 0,
      { front: [0, 0, 0.16, 0.36], left: [0, 0, 0.46, 0.36], right: [0, 0, 0.46, 0.36] });
  }
}

function pipe(B, material, p) {
  if (p.axis === 'y') {
    const len = p.y1 - p.y0;
    B.geometry(material, pipeGeometry(p.r, len, 'y'), _m.makeTranslation(p.x, (p.y0 + p.y1) / 2, p.z));
  } else {
    const len = p.z1 - p.z0;
    B.geometry(material, pipeGeometry(p.r, len, 'z'), _m.makeTranslation(p.x, p.y, (p.z0 + p.z1) / 2));
    // clamps every 2 units
    for (let z = p.z0 + 1; z < p.z1; z += 2) {
      B.geometry(material, pipeGeometry(p.r * 1.35, 0.12, 'z'), _m.makeTranslation(p.x, p.y, z));
    }
  }
}

function conduit(W, B, mat, p) {
  const z = p.z + 0.12;
  B.box({ front: mat.side, left: mat.side, right: mat.side, top: mat.cap }, p.x, z, 0.56, 0.24, p.y - 0.25, p.y + 0.25, 0,
    { front: [0, 0, 0.56, 0.5] });
  // torn cable hanging out of the junction box
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6), W.mats.plain('#1b1f2a', { roughness: 0.8 }));
  cable.position.set(p.x + 0.12, p.y - 0.5, z + 0.12);
  cable.rotation.z = 0.35;
  cable.castShadow = true;
  W.groupFor(p.on).add(cable);
  const led = makeGlow('#ff8a2a', 0.45, 1.6);
  led.position.set(p.x - 0.16, p.y + 0.08, z + 0.16);
  W.groupFor(p.on).add(led);
  W.addEmitter('spark', { position: [p.x + 0.22, p.y - 0.78, z + 0.16], area: [0.08, 0.08, 0.08], rate: 1.3, burst: 14 }, p.on);
  W.addEmitter('smoke', { position: [p.x + 0.1, p.y + 0.1, z + 0.2], area: [0.2, 0.1, 0.1], rate: 1.2 }, p.on);
}

// ---------------------------------------------------------------- living pieces

function crossSprite() {
  const t = worldTexture('med_cross');
  const m = new THREE.SpriteMaterial({ map: t.map, color: new THREE.Color(2.2, 2.6, 2.3), transparent: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.set(0.45, 0.45, 1);
  return s;
}

function medStation(W, B, mat, p) {
  B.box({ front: mat.med, left: mat.side, right: mat.side, top: mat.cap }, p.x, p.z, 1.0, 0.62, 0, 1.5, 0,
    { left: [0, 0, 0.62, 1.5], right: [0, 0, 0.62, 1.5] });
  W.addBox(p.x, p.z, 1.04, 0.66);
  const cross = crossSprite();
  cross.position.set(p.x, 2.05, p.z + 0.1);
  W.root.add(cross);
  const glow = makeGlow('#5dff9c', 1.3, 0.9);
  glow.position.set(p.x, 2.05, p.z + 0.12);
  W.root.add(glow);
  W.addEmitter('heal', { position: [p.x, 0.25, p.z + 0.55], area: [0.7, 0.1, 0.25], rate: 1.6, speed: 0.6, size: 0.7 });
  const phase = p.x;
  W.updaters.push((dt, t) => {
    cross.position.y = 2.05 + Math.sin(t * 1.8 + phase) * 0.07;
    cross.material.rotation = Math.sin(t * 0.9 + phase) * 0.12;
  });
  W.addInteractable({ kind: 'med', id: p.id, x: p.x, z: p.z + 0.31, box: [p.x - 0.52, p.z - 0.33, p.x + 0.52, p.z + 0.33], label: 'Med-Station', icon: 'save' });
}

function reactor(W, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const set = textureSet('reactor_core', { repeat: [1, 1] });
  W.mats.animated.push({ set, phase: 0 });
  const core = new THREE.MeshBasicMaterial({ map: set.map, color: new THREE.Color(2.1, 2.1, 2.1), transparent: true, fog: true });
  const steel = worldTexture('metal_side');
  const metal = new THREE.MeshStandardMaterial({ map: steel.map, normalMap: steel.normalMap, roughness: 0.55, metalness: 0.45, transparent: true });
  const pipeSet = textureSet('pipe', { repeat: [1, 1] });
  const band = new THREE.MeshStandardMaterial({ map: pipeSet.map, normalMap: pipeSet.normalMap, roughness: 0.5, metalness: 0.5, transparent: true });
  const mats = [core, metal, band];

  const column = new THREE.Mesh(wrappedCylinder(0.955, 3.3, { arc: 2, texHeight: 2, y0: 0.35 }), core);
  g.add(column);
  const add = (geo, m, y) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  add(new THREE.CylinderGeometry(1.45, 1.55, 0.35, 24), metal, 0.175);
  add(new THREE.CylinderGeometry(1.12, 1.12, 0.12, 24), band, 0.41);
  for (const y of [1.35, 2.35]) add(new THREE.CylinderGeometry(1.06, 1.06, 0.16, 24, 1, true), band, y);
  add(new THREE.CylinderGeometry(1.2, 1.08, 0.42, 24), metal, 3.86);
  add(new THREE.CylinderGeometry(0.7, 1.2, 0.3, 24), band, 4.22);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const strut = add(new THREE.BoxGeometry(0.14, 3.3, 0.14), metal, 2.0);
    strut.position.x = Math.sin(a) * 1.08;
    strut.position.z = Math.cos(a) * 1.08;
  }
  const glow = makeGlow('#ff6a3a', 3.6, 0.55, { pull: 0.2 });
  glow.position.set(0, 2.0, 0);
  g.add(glow);
  W.root.add(g);
  W.addCircle(p.x, p.z, 1.55);
  W.addEmitter('ember', { position: [p.x, 3.9, p.z], area: [1.2, 0.3, 1.2], rate: 7 });
  W.addEmitter('ember', { position: [p.x, 0.5, p.z], area: [2.6, 0.1, 2.6], rate: 4 });
  W.reactor = { group: g, x: p.x, z: p.z, mats, core, glow, fade: 1 };
}

function holoTable(W, B, mat, p) {
  B.box({ front: mat.side, left: mat.side, right: mat.side, top: mat.holo }, p.x, p.z, 2.0, 2.0, 0, 0.85, 0,
    { front: [0, 0, 2, 0.85], left: [0, 0, 2, 0.85], right: [0, 0, 2, 0.85] });
  W.addBox(p.x, p.z, 2.05, 2.05);
  const set = textureSet('holo_table');
  W.mats.animated.push({ set, phase: 0.4 });
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), makeHologramMaterial(set.emissiveMap, '#4cc8ee', { jitter: 0.012, opacity: 0.6 }));
  holo.position.set(p.x, 1.55, p.z);
  holo.rotation.x = -Math.PI / 2 + 0.55;
  holo.renderOrder = 4;
  W.root.add(holo);
  const glow = makeGlow('#45d4ff', 2.2, 0.35, { pull: 0.2 });
  glow.position.set(p.x, 1.2, p.z);
  W.root.add(glow);
  W.addEmitter('holo', { position: [p.x, 1.35, p.z], area: [1.4, 0.8, 1.4], rate: 14 });
  W.updaters.push((dt, t) => {
    holo.position.y = 1.55 + Math.sin(t * 1.3) * 0.04;
  });
}

function supplyCrate(W, mat, c) {
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  const B = new Batch();
  B.box({ front: mat.crateSide, back: mat.crateSide, left: mat.crateSide, right: mat.crateSide }, 0, 0, 1, 1, 0, 0.84, 0,
    { front: [0, 0, 1, 0.84], back: [0, 0, 1, 0.84], left: [0, 0, 1, 0.84], right: [0, 0, 1, 0.84] });
  B.faceY(W.mats.plain('#0b0e17', { roughness: 1, metalness: 0 }), -0.47, 0.47, -0.47, 0.47, 0.7);
  B.build(g);
  // lid hinged on the back edge
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.84, -0.5);
  const LB = new Batch();
  LB.box({ front: mat.crateSide, back: mat.crateSide, left: mat.crateSide, right: mat.crateSide, top: mat.crateTop }, 0, 0.5, 1.02, 1.02, 0, 0.16, 0,
    { front: [0, 0.82, 1, 1], back: [0, 0.82, 1, 1], left: [0, 0.82, 1, 1], right: [0, 0.82, 1, 1] });
  LB.build(hinge);
  g.add(hinge);
  // status LED: red while sealed, green once opened
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.35, 0.4) });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), ledMat);
  led.position.set(0.28, 0.74, 0.506);
  g.add(led);
  const glow = makeGlow('#ff4050', 0.5, 0.7);
  glow.position.set(0.28, 0.74, 0.56);
  g.add(glow);
  W.root.add(g);
  W.addBox(c.x, c.z, 1.04, 1.04);
  const crate = {
    ...c,
    flag: `crate_${c.id}`,
    opened: false,
    lid: 0,
    setOpen(open, instant = false) {
      crate.opened = open;
      ledMat.color.setRGB(open ? 0.35 : 3, open ? 3 : 0.35, open ? 0.9 : 0.4);
      glow.material.color.set(open ? '#4dff9c' : '#ff4050').multiplyScalar(0.7);
      glow.userData.baseColor.copy(glow.material.color);
      if (instant) { crate.lid = open ? 1 : 0; hinge.rotation.x = -1.95 * crate.lid; }
    },
  };
  W.updaters.push((dt) => {
    const target = crate.opened ? 1 : 0;
    if (crate.lid === target) return;
    crate.lid = Math.min(1, crate.lid + dt * 2.4);
    const k = crate.lid;
    hinge.rotation.x = -1.95 * (1 - (1 - k) * (1 - k)) - Math.sin(k * Math.PI) * 0.12;
  });
  W.crates.push(crate);
  W.addInteractable({ kind: 'crate', id: c.id, crate, x: c.x, z: c.z + 0.5, box: [c.x - 0.52, c.z - 0.52, c.x + 0.52, c.z + 0.52], label: 'Open', icon: 'item' });
}

function npc(W, n) {
  const holo = n.kind === 'holo';
  const actor = new SpriteActor(buildNpcSprite(n.kind), holo ? { lit: false, castShadow: false, shadow: false } : { shadowScale: 0.8, emissiveIntensity: 1.1 });
  if (holo) actor.hologram = true;
  actor.object3d.position.set(n.x, 0, n.z);
  actor.play(`idle_${n.facing}`);
  W.root.add(actor.object3d);
  W.actors.push(actor);
  if (holo) {
    // projector disc under the hologram
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 20), W.mats.plain('#2a3349', { emissive: '#3fd6ff', emissiveIntensity: 0.6 }));
    disc.position.set(n.x, 0.05, n.z);
    disc.receiveShadow = true;
    W.root.add(disc);
    const glow = makeGlow('#45d4ff', 1.4, 0.8);
    glow.position.set(n.x, 0.18, n.z + 0.05);
    W.root.add(glow);
    W.addEmitter('holo', { position: [n.x, 0.8, n.z], area: [0.5, 1.4, 0.3], rate: 6 });
  } else {
    const phase = n.x;
    W.updaters.push((dt, t) => { actor.mesh.position.y = 0.06 + Math.sin(t * 2.6 + phase) * 0.05; });
  }
  W.addCircle(n.x, n.z, 0.38);
  const entry = { ...n, actor, home: n.facing };
  W.npcs[n.id] = entry;
  W.addInteractable({ kind: 'npc', id: n.id, npc: entry, x: n.x, z: n.z, r: 0.35, label: 'Talk', icon: 'talk' });
}

function boss(W) {
  const actor = new SpriteActor(buildEnemySprite('sentinel'), { shadowScale: 1.1 });
  actor.object3d.position.set(BOSS.x, 0, BOSS.z);
  actor.play('idle');
  W.root.add(actor.object3d);
  W.actors.push(actor);
  const circle = W.addCircle(BOSS.x, BOSS.z, 1.3);
  const it = W.addInteractable({ kind: 'boss', id: 'sentinel', x: BOSS.x, z: BOSS.z, r: 1.2, reach: 1.6, label: 'Confront', icon: 'attack' });
  W.boss = {
    ...BOSS,
    actor,
    present: true,
    setPresent(on) {
      W.boss.present = on;
      actor.object3d.visible = on;
      circle.enabled = on;
      it.enabled = on;
      const light = W.lighting && W.lighting.byTag('sentinel');
      if (light) light.enabled = on;
    },
  };
}
