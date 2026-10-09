// epilogue: prop builders (browser, TECH_PLAN 2.5 and 3.3). The pieces the epilogue adds to other
// maps (through `extends`) and the shore's own. Static parts merge into the World's batches; the few
// that move or change state get their own objects and return a LivingProp.
//
//   ep.memorial   { x, z }                   the Cryo Deck's memorial: a dark slab of names in light
//                                            (those who chose to keep dreaming), two vigil lights
//   ep.pod        { x, z, status }           pod 2271: a pod whose door swings open while `status`
//                                            holds (setState), frost light inside
//   ep.wakeLights { points: [[x, y, z]], status }   bed and pod lamps that turn from red to green in a
//                                            wave west to east while `status` holds (the revivals)
//   ep.easel      { x, z, rot = 0 }          HALCYON's easel: tripod, the half-done painting of Tethys
//   ep.passing    { x0, x1, y, z, w, h, speed }   the Halcyon passing beyond Driftmarket's viewport,
//                                            sliding from x0 to x1 from the moment the map is built
//   ep.skiffs     { x0, x1, z, seed, n }     Ringborn skiffs rising past the Halcyon's far side (the
//                                            exterior), one after another east to west, then pacing it
//   ep.ridge      { x, z, w, d, n, seed }    a pressure ridge: a heap of tilted ice blocks
//   ep.hole       { x, z, r = 0.9 }          a Ringborn seeding hole: green-lit water in the ice, a
//                                            tripod winch with a lantern over it

import * as THREE from 'three';
import { makeGlow } from '../../core/vfx.js';
import { textureSet } from '../../art/tiles.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Seeded random in [0, 1). */
function rnd(seed) {
  let s = (Math.floor(Math.abs(seed) * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const all = (m) => ({ front: m, back: m, left: m, right: m, top: m });
const sound = (W, name, opts) => W.onSound && W.onSound(name, opts);
const ease = (k) => 1 - (1 - k) * (1 - k) * (1 - k);

/** Merge a geometry placed at (x, y, z), turned (rx, ry, rz; yaw outermost), scaled into batch B. */
function put(B, mat, geo, [x, y, z], [rx, ry, rz] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) {
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
  B.geometry(mat, geo, _m);
  geo.dispose();
}

function glowAt(W, G, color, size, intensity, x, y, z, register = true) {
  const g = makeGlow(color, size, intensity);
  g.position.set(x, y, z);
  G.add(g);
  if (register) W.addGlow(g, x, z);
  return g;
}

/** A glow whose colour a script-free state flips (keeps userData.baseColor in step for the lighting). */
function setGlow(g, color, k) {
  g.material.color.set(color).multiplyScalar(k);
  if (g.userData.baseColor) g.userData.baseColor.copy(g.material.color);
}

// ---------------------------------------------------------------- the memorial

const memorial = {
  textures: ['ep_slab'],
  build(W, p) {
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const { x, z } = p;
    const stone = W.mats.plain('#1c2430', { roughness: 0.3, metalness: 0.4 });
    const face = W.mats.tile('ep_slab', { emissive: 1.8, roughness: 0.25, metalness: 0.3 });
    const light = W.mats.plain('#bff4ff', { roughness: 0.4, metalness: 0, emissive: '#7fe0f0', emissiveIntensity: 1.6 });
    // a low plinth, the slab on it, a thin lit sill
    B.box(all(stone), x, z, 2.6, 0.7, 0, 0.16, 0);
    B.box({ ...all(stone), front: face }, x, z - 0.06, 2.0, 0.22, 0.16, 1.86, 0);
    B.box(all(light), x, z + 0.1, 2.0, 0.06, 0.16, 0.2, 0);
    // two vigil lights at its sides
    for (const dx of [-1.16, 1.16]) {
      put(B, stone, new THREE.CylinderGeometry(0.1, 0.13, 0.62, 10), [x + dx, 0.47, z + 0.05]);
      put(B, light, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), [x + dx, 0.84, z + 0.05]);
      glowAt(W, G, '#a8eef8', 0.7, 0.9, x + dx, 0.95, z + 0.1);
    }
    glowAt(W, G, '#9fe8ff', 2.4, 0.22, x, 1.1, z + 0.3);
    W.addBox(x, z, 2.6, 0.7);
  },
};

// ---------------------------------------------------------------- pod 2271

const pod = {
  textures: ['cryo_pod', 'metal_side', 'wall_cap', 'wall_low', 'ep_pod_inner', 'ep_sign_2271'],
  build(W, p) {
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const { x, z } = p;
    const side = W.mats.tile('metal_side', { emissive: 1.4 });
    const cap = W.mats.tile('wall_cap', { emissive: 1.4 });
    const low = W.mats.tile('wall_low', { emissive: 1.4 });
    const inner = W.mats.tile('ep_pod_inner', { emissive: 1.4, roughness: 0.4, metalness: 0.1, cast: false });
    const sign = W.mats.tile('ep_sign_2271', { emissive: 2.0, cast: false });
    // the shell, open at the front, the frost-lit cradle inside, the base strip and the plate above
    B.box({ left: side, right: side, top: cap, back: side }, x, z - 0.04, 0.96, 0.62, 0, 2.02, 0);
    B.faceZ(inner, x - 0.44, x + 0.44, 0.06, 1.96, z - 0.3, 1);
    B.box({ front: low, left: side, right: side, top: cap }, x, z + 0.38, 1.0, 0.08, 0, 0.18, 0);
    B.faceZ(sign, x - 0.5, x + 0.5, 2.06, 2.31, z + 0.28, 1);
    // the door on its left hinge
    const hinge = new THREE.Group();
    hinge.position.set(x - 0.47, 0, z + 0.28);
    G.add(hinge);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.9, 0.06), W.mats.tile('cryo_pod', { emissive: 1.6 }));
    door.position.set(0.46, 1.02, 0);
    door.castShadow = true;
    door.receiveShadow = true;
    hinge.add(door);
    const frost = glowAt(W, G, '#bff4ff', 1.4, 0.2, x, 1.1, z + 0.1, false);
    W.addBox(x, z, 0.96, 0.78);

    let shown = W.test(p.status) ? 1 : 0, target = shown;
    hinge.rotation.y = -1.75 * shown;
    frost.material.color.set('#bff4ff').multiplyScalar(0.2 + shown * 0.5);
    return {
      kind: 'ep.pod',
      setState(open, instant = false) {
        target = open ? 1 : 0;
        if (instant) shown = target;
        else if (target && shown < 1) sound(W, 'door', { volume: 0.7 });
      },
      update(dt) {
        if (shown !== target) shown = target > shown ? Math.min(target, shown + dt / 1.3) : Math.max(target, shown - dt / 1.3);
        hinge.rotation.y = -1.75 * ease(shown);
        frost.material.color.set('#bff4ff').multiplyScalar(0.2 + shown * 0.5);
      },
    };
  },
};

// ---------------------------------------------------------------- the wake lights

const wakeLights = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const lamps = (p.points || []).map(([x, y, z]) => ({ x, g: glowAt(W, G, '#ff4050', 0.5, 0.6, x, y, z, false), shown: null }));
    let on = W.test(p.status), at = -1;
    return {
      kind: 'ep.wakeLights',
      setState(v, instant = false) {
        v = !!v;
        if (v === on && !instant) return;
        on = v;
        at = instant ? -1 : null;
      },
      update(dt, t) {
        if (at === null) at = t;
        for (const l of lamps) {
          if (l.shown === on) continue;
          // the wave: west to east, a short flicker before each lamp turns
          const k = at < 0 ? 2 : (t - at - l.x * 0.16) / 0.4;
          if (k < 0) continue;
          if (k < 1) {
            l.g.visible = Math.floor(k * 8) % 2 === 0;
            continue;
          }
          l.g.visible = true;
          l.shown = on;
          setGlow(l.g, on ? '#5dff9c' : '#ff4050', 0.6);
        }
      },
    };
  },
};

// ---------------------------------------------------------------- the easel

const easel = {
  textures: ['ep_wood', 'ep_canvas'],
  build(W, p) {
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const rot = p.rot || 0, c = Math.cos(rot), s = Math.sin(rot);
    const at = (lx, lz) => [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
    const wood = W.mats.tile('ep_wood', { emissive: 1.4, roughness: 0.8, metalness: 0 });
    const paint = W.mats.tile('ep_canvas', { emissive: 1.4, roughness: 0.9, metalness: 0 });
    // three legs: two in front, one behind, leaning in
    for (const [lx, lz, tx, tz] of [[-0.42, 0.22, -0.16, 0.0], [0.42, 0.22, 0.16, 0.0], [0, -0.5, 0, -0.08]]) {
      const [x0, z0] = at(lx, lz), [x1, z1] = at(tx, tz);
      const len = Math.hypot(x1 - x0, 1.9, z1 - z0);
      const g = new THREE.BoxGeometry(0.06, len, 0.06);
      const dir = new THREE.Vector3(x1 - x0, 1.9, z1 - z0).normalize();
      _m.makeRotationFromQuaternion(_q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)).setPosition((x0 + x1) / 2, 0.95, (z0 + z1) / 2);
      B.geometry(wood, g, _m);
      g.dispose();
    }
    // the ledge and the canvas, tilted back a little, facing +z before rot
    const [lx, lz] = at(0, 0.18), [bx, bz] = at(0, 0.08), [cx, cz] = at(0, 0.11);
    put(B, wood, new THREE.BoxGeometry(1.2, 0.06, 0.14), [lx, 0.92, lz], [0, rot, 0]);
    put(B, wood, new THREE.BoxGeometry(1.18, 0.9, 0.03), [bx, 1.36, bz], [-0.14, rot, 0]);
    put(B, paint, new THREE.PlaneGeometry(1.12, 0.84), [cx, 1.36, cz], [-0.14, rot, 0]);
    // the painting's light: Tethys glows a little on the canvas
    glowAt(W, G, '#ffcf8a', 0.9, 0.35, cx - 0.15 * c, 1.38, cz + 0.12);
    W.addCircle(p.x, p.z, 0.45);
  },
};

// ---------------------------------------------------------------- the Halcyon passing Driftmarket

const passing = {
  textures: ['ep_halcyon_far'],
  build(W, p) {
    const G = W.groupFor(p.on);
    const set = textureSet('ep_halcyon_far', { layers: ['map'] });
    const mat = new THREE.MeshBasicMaterial({
      map: set.map, transparent: true, alphaTest: 0.05, depthWrite: false, fog: false, color: new THREE.Color(p.tint || '#d8d0e0'),
    });
    const w = p.w || 8, h = p.h || 2;
    const ship = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    ship.renderOrder = -900;
    ship.position.set(p.x0, p.y, p.z);
    G.add(ship);
    const engine = makeGlow('#9fe8ff', 2.4, 0.8);
    G.add(engine);
    let t0 = null;
    const place = (x) => {
      ship.position.x = x;
      engine.position.set(x + w * 0.48, p.y, p.z + 0.1);
    };
    place(p.x0);
    return {
      kind: 'ep.passing',
      update(dt, t) {
        if (t0 === null) t0 = t;
        const dir = Math.sign(p.x1 - p.x0);
        const x = p.x0 + dir * Math.min(Math.abs(p.x1 - p.x0), (t - t0) * (p.speed || 0.8));
        place(x);
      },
    };
  },
};

// ---------------------------------------------------------------- Ringborn skiffs at the exterior

function skiffMesh(W) {
  const hull = W.mats.plain('#5e6a78', { roughness: 0.5, metalness: 0.45 });
  const stripe = W.mats.plain('#e8922e', { roughness: 0.5, metalness: 0.2, emissive: '#c06a1c', emissiveIntensity: 0.6 });
  const glass = W.mats.plain('#9fe8ff', { roughness: 0.2, metalness: 0, emissive: '#5cc4dc', emissiveIntensity: 1.4 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.0, 8), hull);
  body.rotation.z = Math.PI / 2;           // nose to -x
  g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.16, 8), stripe);
  band.rotation.z = Math.PI / 2;
  band.position.x = 0.45;
  g.add(band);
  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 1.7), hull);
  wings.position.set(0.3, -0.05, 0);
  g.add(wings);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.04), stripe);
  fin.position.set(0.75, 0.25, 0);
  g.add(fin);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glass);
  canopy.scale.set(1.6, 0.8, 0.9);
  canopy.position.set(-0.45, 0.16, 0);
  g.add(canopy);
  const jet = makeGlow('#ffb070', 1.2, 1.2);
  jet.position.set(1.1, 0, 0);
  g.add(jet);
  return g;
}

const skiffs = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const r = rnd(p.seed || 3);
    const n = p.n || 7;
    const list = [];
    for (let i = 0; i < n; i++) {
      const x = p.x0 + ((p.x1 - p.x0) * (i + 0.5)) / n + (r() - 0.5) * 2;
      const z = p.z - r() * 6;
      const g = skiffMesh(W);
      const s = 0.7 + r() * 0.5;
      g.scale.setScalar(s);
      G.add(g);
      // east first: the camera pans west along the hull as they come up
      list.push({ g, x, z, y0: -9 - r() * 3, y1: 1.4 + r() * 3.6, delay: 0.4 + (p.x1 - x) * 0.13, phase: r() * 6 });
    }
    let t0 = null;
    return {
      kind: 'ep.skiffs',
      update(dt, t) {
        if (t0 === null) t0 = t;
        for (const k of list) {
          const u = Math.min(1, Math.max(0, (t - t0 - k.delay) / 4.5));
          const e = ease(u);
          k.g.visible = u > 0;
          k.g.position.set(k.x - Math.max(0, t - t0 - k.delay - 4.5) * 0.15, k.y0 + (k.y1 - k.y0) * e + Math.sin(t * 1.3 + k.phase) * 0.08 * e, k.z);
          // nose up while climbing, level once alongside
          k.g.rotation.z = -(1 - e) * 1.1;
        }
      },
    };
  },
};

// ---------------------------------------------------------------- the shore: ridges and seeding holes

const ridge = {
  textures: ['ep_block'],
  build(W, p) {
    const B = W.batchFor(p.on);
    const ice = W.mats.tile('ep_block', { emissive: 1.4, roughness: 0.3, metalness: 0.1 });
    const r = rnd(p.seed || p.x * 7 + p.z);
    const n = p.n || 6, w = p.w || 2.4, d = p.d || 1.2;
    for (let i = 0; i < n; i++) {
      const bw = 0.5 + r() * 0.9, bh = 0.35 + r() * 1.1, bd = 0.4 + r() * 0.6;
      const x = p.x + (r() - 0.5) * (w - bw), z = p.z + (r() - 0.5) * (d - bd);
      put(B, ice, new THREE.BoxGeometry(bw, bh, bd), [x, bh * 0.38, z], [(r() - 0.5) * 0.6, r() * Math.PI, (r() - 0.5) * 0.7]);
    }
    W.addBox(p.x, p.z, w, d);
  },
};

const hole = {
  textures: ['ep_snow'],
  build(W, p) {
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const { x, z } = p, R = p.r || 0.9;
    const water = W.mats.plain('#1e6a5a', { roughness: 0.15, metalness: 0.1, emissive: '#2ac08a', emissiveIntensity: 0.9 });
    const rim = W.mats.tile('ep_snow', { emissive: 1.2, roughness: 0.9, metalness: 0 });
    const iron = W.mats.plain('#2a2c34', { roughness: 0.6, metalness: 0.6 });
    put(B, water, new THREE.CircleGeometry(R, 20), [x, 0.015, z], [-Math.PI / 2, 0, 0]);
    put(B, rim, new THREE.TorusGeometry(R + 0.05, 0.1, 5, 24), [x, 0.03, z], [-Math.PI / 2, 0, 0], [1, 1, 0.5]);
    // the tripod winch, a line down into the green, a lantern
    const top = [x, 2.1, z];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const foot = [x + Math.cos(a) * (R + 0.35), 0, z + Math.sin(a) * (R + 0.35)];
      const mid = new THREE.Vector3((foot[0] + top[0]) / 2, top[1] / 2, (foot[2] + top[2]) / 2);
      const dir = new THREE.Vector3(top[0] - foot[0], top[1], top[2] - foot[2]);
      const g = new THREE.CylinderGeometry(0.035, 0.035, dir.length(), 6);
      _m.makeRotationFromQuaternion(_q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())).setPosition(mid);
      B.geometry(iron, g, _m);
      g.dispose();
    }
    put(B, iron, new THREE.CylinderGeometry(0.012, 0.012, 2.1, 4), [x, 1.05, z]);
    glowAt(W, G, '#ffb850', 0.9, 1.0, x + 0.12, 1.95, z + 0.05);
    glowAt(W, G, '#5cffb0', 1.8, 0.5, x, 0.2, z);
    W.addEmitter('spore', { position: [x, 0.2, z], area: [R * 1.4, 0.2, R * 1.4], rate: 1.2 }, p.on);
    W.addCircle(x, z, R + 0.2);
  },
};

export default {
  'ep.memorial': memorial,
  'ep.pod': pod,
  'ep.wakeLights': wakeLights,
  'ep.easel': easel,
  'ep.passing': passing,
  'ep.skiffs': skiffs,
  'ep.ridge': ridge,
  'ep.hole': hole,
};
