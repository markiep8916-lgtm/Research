// arboretum: prop builders (browser, TECH_PLAN 3.3). Plants are alpha cards from the arb_flora atlas
// (crossed pairs, so they read from the field camera); machines are batched boxes on the arb_tech
// atlas; floor decals come from arb_decal. Everything merges into the World's batches (one draw per
// material), so a garden of hundreds of plants costs a handful of draw calls.
//
//   arb.fern       { x, z, s, kind: 'a' | 'b' | 'leaf' }    a fern clump (crossed cards)
//   arb.bloom      { x, z, s, hue: 'pink' | 'violet' }      a bloom bush with a glowing heart
//   arb.bedPlants  { c, r0, r1, kind: 'fern' | 'tall', south }  dresses a raised bed (cells c..c+1, rows
//                                                           r0..r1); `south`: it rises from the south wall
//   arb.podBank    { c, r0, r1 }                            stasis pods laid across a root bank
//   arb.pod        { x, z, faulty? }                        one pod on a plinth (Esme's: red alarm until arb:esme)
//   arb.tree       { x, z, s }                              a trunk with a canopy and hanging vines
//   arb.vines      { x0, x1, z }                            vine strands hanging down a wall face at z
//   arb.domeShaft  { x, z, s }                              warm Tethys light falling through the dome
//   arb.sprinkler  { x, z }                                 a standpipe sprinkler raining glowing drops
//   arb.pump       { x, z, s }                              a pump housing with a glowing sight glass
//   arb.sluice     { x, z }                                 the sluice frame between the left and right valves
//   arb.fountain   { x, z }                                 the Glasshouse fountain
//   arb.choirDoor  { x, z, on }                             the Choir door's arch and vines (court side)
//   arb.rootMound  { x, z }                                 roots heaped where the Gardener stands
//   arb.choirPods  { x0, x1, z0, z1 }                       rows of harmonised pods, gold-lit (solid)
//   arb.choirTiers { x, z }                                 the Choir's back wall: tiers of glowing pods
//   arb.theoPod    { x, z }                                 pod 2271 on its dais, Theo asleep inside (his sprite)
//   arb.planterChest  chest: a planter crate whose mossy lid swings open   LivingProp setOpen
//   arb.logTerminal   { x, z, rot }                         MOTHER-7's log lectern
//   arb.lift       { x, z }                                 the service lift down to the dock
//   arb.seedRacks  { x, z, w }                              seed drawers along a north wall
//   arb.lamp       { x, z, cool? }                          a work lamp on a wall
//   arb.decal      { x, z, kind, s | w + d, rot }           a floor decal (DECAL regions)

import * as THREE from 'three';
import { makeGlow, makeLightShaft } from '../../core/vfx.js';
import { buildFieldSprite } from '../../art/characters.js';
import { SpriteActor } from '../../core/spriteActor.js';
import { wrappedCylinder, pipeGeometry } from '../../world/geometry.js';
import { FLORA, TECH, DECAL, uvOf } from './tex.js';

const _m = new THREE.Matrix4();

/** Seeded random in [0, 1). */
function rnd(seed) {
  let s = (Math.floor(Math.abs(seed) * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// ---------------------------------------------------------------- shared materials (per World)

function mats(W) {
  if (W.arbMats) return W.arbMats;
  const flora = W.mats.tile('arb_flora', { alphaTest: 0.5, side: THREE.DoubleSide, emissive: 2.2, roughness: 0.82, metalness: 0, cast: true });
  if (!flora.userData.depthMat) {
    flora.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: flora.map, alphaTest: 0.5 });
  }
  W.arbMats = {
    flora,
    tech: W.mats.tile('arb_tech', { emissive: 2.4, roughness: 0.55, metalness: 0.35 }),
    decal: W.mats.decal('arb_decal'),
    bark: W.mats.tile('arb_bark', { emissive: 2.2, roughness: 0.85, metalness: 0 }),
    pipe: W.mats.tile('pipe', { roughness: 0.5, metalness: 0.45 }),
    soil: W.mats.tile('arb_soil', { roughness: 0.9, metalness: 0, cast: false }),
  };
  return W.arbMats;
}

const fUV = (k) => uvOf(FLORA, FLORA[k]);
const tUV = (k) => uvOf(TECH, TECH[k]);
const dUV = (k) => uvOf(DECAL, DECAL[k]);

/** A vertical card centred at (x, z), turned by rot, from y0 up h. */
function card(B, mat, x, z, w, h, rot, uv, y0 = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const ax = x - (w / 2) * c, az = z + (w / 2) * s, bx = x + (w / 2) * c, bz = z - (w / 2) * s;
  B.quad(mat, [ax, y0, az], [bx, y0, bz], [bx, y0 + h, bz], [ax, y0 + h, az], uv);
}

/** A card leaning back (top away from the camera) by `tilt`, so the key light falls on its face. */
function leanCard(B, mat, x, z, w, h, rot, tilt, uv, y0 = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), uy = Math.cos(tilt) * h, uz = -Math.sin(tilt) * h;
  const a = [x - (w / 2) * c, y0, z + (w / 2) * s], b = [x + (w / 2) * c, y0, z - (w / 2) * s];
  B.quad(mat, a, b, [b[0], y0 + uy, b[2] + uz], [a[0], y0 + uy, a[2] + uz], uv);
}

/** Two crossed, back-leaning cards (an X seen from above) so a plant reads from the field camera. */
function cross(B, mat, x, z, w, h, uv, y0 = 0, turn = 0) {
  leanCard(B, mat, x, z, w, h, 0.5 + turn, 0.42, uv, y0);
  leanCard(B, mat, x, z, w, h, -0.5 + turn, 0.42, uv, y0);
}

/** A floor decal from the atlas: a flat quad at y, turned by rot (radians). */
function decal(B, mat, x, z, w, d, uv, rot = 0, y = 0.008) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (lx, lz) => [x + lx * c + lz * s, y, z - lx * s + lz * c];
  B.quad(mat, P(-w / 2, d / 2), P(w / 2, d / 2), P(w / 2, -d / 2), P(-w / 2, -d / 2), uv);
}

function glow(W, G, color, size, intensity, x, y, z, link = true) {
  const s = makeGlow(color, size, intensity);
  s.position.set(x, y, z);
  G.add(s);
  if (link) W.addGlow(s, x, z);
  return s;
}

/** A box with every face on one atlas region (top optional). */
function techBox(B, mat, x, z, w, d, y0, y1, faces, rot = 0) {
  B.box({ front: mat, back: mat, left: mat, right: mat, top: mat }, x, z, w, d, y0, y1, rot, faces);
}

const PLANTS = {
  a: ['fernA', 1.25, 1.2],
  b: ['fernB', 1.25, 1.2],
  leaf: ['leafBig', 1.2, 1.15],
  pink: ['bloomPink', 1.0, 0.95],
  violet: ['bloomViolet', 1.0, 0.95],
  tall: ['tall', 1.3, 2.5],
  tuft: ['tuft', 1.4, 0.7],
  shrooms: ['shrooms', 1.2, 0.6],
};

function plant(B, M, kind, x, z, s = 1, y0 = 0, turn = 0) {
  const [region, w, h] = PLANTS[kind];
  cross(B, M.flora, x, z, w * s, h * s, fUV(region), y0, turn);
}

// ---------------------------------------------------------------- builders

const props = {
  'arb.fern': {
    textures: ['arb_flora'],
    build(W, p) {
      const B = W.batchFor(p.on), M = mats(W);
      plant(B, M, p.kind || (Math.floor(p.x * 7 + p.z) % 2 ? 'a' : 'b'), p.x, p.z, p.s || 1, p.y || 0, (p.x % 1) * 0.6);
    },
  },

  'arb.bloom': {
    textures: ['arb_flora'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const violet = p.hue === 'violet';
      plant(B, M, violet ? 'violet' : 'pink', p.x, p.z, p.s || 1, p.y || 0);
      glow(W, G, violet ? '#b98cff' : '#ff8ac0', 0.9 * (p.s || 1), 0.45, p.x, (p.y || 0) + 0.6, p.z, false);
    },
  },

  'arb.bedPlants': {
    textures: ['arb_flora', 'arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const r = rnd(p.c * 13 + p.r0);
      const x = p.c + 1, top = 0.55;
      const len = p.r1 - p.r0 + 1;
      for (let i = 0; i < len; i += 1) {
        const z = p.r0 + i + 0.5 + (r() - 0.5) * 0.3;
        // the north end of a bed that rises from the south wall sits in front of the path: keep it low
        const low = p.south && i < 2;
        const nearEnd = i === len - 1 || i === 0;
        for (const dx of [-0.45, 0.45]) {
          if (p.kind === 'tall' && !low && !nearEnd && i % 3 === 1 && dx < 0) {
            plant(B, M, 'tall', x + dx * 0.5, z, 0.9 + r() * 0.3, top, r());
          } else if (low || r() < 0.18) {
            plant(B, M, r() < 0.6 ? 'tuft' : 'shrooms', x + dx, z, 0.8 + r() * 0.25, top, r());
          } else {
            const pick = r();
            const kind = pick < 0.3 ? 'a' : pick < 0.55 ? 'b' : pick < 0.72 ? 'leaf' : pick < 0.86 ? 'pink' : 'violet';
            plant(B, M, kind, x + dx + (r() - 0.5) * 0.2, z, 0.85 + r() * 0.35, top, r());
            if ((kind === 'pink' || kind === 'violet') && dx > 0) glow(W, G, kind === 'pink' ? '#ff8ac0' : '#b98cff', 0.8, 0.45, x + dx, top + 0.6, z, false);
          }
        }
      }
      // a sprinkler nozzle on the bed's irrigation line every few cells
      for (let i = 2; i < len - 1; i += 4) {
        techBox(B, M.tech, x + 0.85, p.r0 + i + 0.5, 0.12, 0.12, top, top + 0.22, { front: tUV('steel'), back: tUV('steel'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
      }
    },
  },

  'arb.podBank': {
    textures: ['arb_tech', 'arb_flora'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const r = rnd(p.c * 31 + p.r0);
      const x = p.c + 1, top = 0.6;
      for (let z = p.r0 + 0.6; z < p.r1 + 0.6; z += 1.0) {
        const empty = r() < 0.12;
        const faces = { front: tUV('podEnd'), back: tUV('podEnd'), left: tUV('podSide'), right: tUV('podSide'), top: tUV(empty ? 'podTopEmpty' : 'podTop') };
        techBox(B, M.tech, x, z, 1.7, 0.78, top, top + 0.42, faces);
        if (r() < 0.4) card(B, M.flora, x + (r() - 0.5) * 0.6, z + 0.36, 1.4, 0.8, 0, fUV('roots'), top + 0.1);
      }
      // a few roots climbing out of the bank and glowing fungus
      for (let i = 0; i < 3; i++) plant(B, M, 'shrooms', x + (r() - 0.5) * 1.2, p.r0 + 1 + r() * (p.r1 - p.r0 - 1), 0.6, top, r());
      glow(W, G, '#7fe8ff', 0.8, 0.35, x, top + 0.6, (p.r0 + p.r1) / 2, false);
    },
  },

  'arb.pod': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      techBox(B, M.tech, p.x, p.z, 1.9, 1.0, 0, 0.5, { front: tUV('steel'), back: tUV('steel'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
      techBox(B, M.tech, p.x, p.z, 1.7, 0.78, 0.5, 0.92, { front: tUV('podEnd'), back: tUV('podEnd'), left: tUV('podSide'), right: tUV('podSide'), top: tUV('podTop') });
      W.addBox(p.x, p.z, 1.9, 1.0);
      if (!p.faulty) return null;
      const alarm = glow(W, G, '#ff4050', 0.9, 1.0, p.x + 0.7, 1.05, p.z + 0.3, false);
      const em = W.addEmitter('spark', { position: [p.x + 0.8, 0.95, p.z + 0.35], area: [0.05, 0.05, 0.05], rate: 0.5, burst: 6 }, p.on);
      return {
        kind: 'arb.pod',
        update(dt, t) {
          const fixed = W.test('arb:esme');
          alarm.material.color.set(fixed ? '#4dffc0' : '#ff4050').multiplyScalar(fixed ? 0.6 : 0.5 + 0.5 * (Math.sin(t * 6) > 0 ? 1 : 0.2));
          em.rate = fixed ? 0 : 0.5;
        },
      };
    },
  },

  'arb.tree': {
    textures: ['arb_bark', 'arb_flora'],
    build(W, p) {
      const B = W.batchFor(p.on), M = mats(W);
      const s = p.s || 1;
      const r = rnd(p.x * 3 + p.z);
      const h = 2.7 * s;
      const trunk = wrappedCylinder(0.22 * s, h, { arc: 1, texHeight: 2, segPerArc: 4 });
      B.geometry(M.bark, trunk, _m.makeTranslation(p.x, 0, p.z));
      trunk.dispose();
      // roots flaring at the foot
      for (let k = 0; k < 4; k++) card(B, M.flora, p.x, p.z, 1.3 * s, 0.5 * s, k * 0.8 + r(), fUV('roots'), 0);
      // canopy: leaf clusters around the crown, each tilted up and back so it faces the camera
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + r() * 0.5;
        const cx = p.x + Math.cos(a) * 0.6 * s, cz = p.z + Math.sin(a) * 0.45 * s - 0.2 * s;
        const w = (1.4 + r() * 0.5) * s;
        const y = h - 0.4 * s + r() * 0.4 * s;
        const tilt = 0.75 + r() * 0.3, rho = (r() - 0.5) * 0.8;
        const ux = Math.cos(rho), uz = Math.sin(rho), vy = Math.sin(tilt), vz = -Math.cos(tilt);
        const P = (lu, lv) => [cx + lu * ux, y + lv * vy, cz + lu * uz + lv * vz];
        B.quad(M.flora, P(-w / 2, -w / 2), P(w / 2, -w / 2), P(w / 2, w / 2), P(-w / 2, w / 2), fUV('canopy'));
      }
      for (let k = 0; k < 3; k++) {
        const vx = p.x + (r() - 0.5) * 1.4 * s, vz = p.z + 0.4 * s;
        card(B, M.flora, vx, vz, 0.18, 1.6 * s, 0, fUV(['vineA', 'vineB', 'vineC'][k]), h - 1.7 * s);
      }
      W.addCircle(p.x, p.z, 0.3 * s);
    },
  },

  'arb.vines': {
    textures: ['arb_flora'],
    build(W, p) {
      const B = W.batchFor(p.on), M = mats(W);
      const r = rnd(p.x0 * 17 + p.z);
      for (let x = p.x0 + 0.3; x < p.x1 + 0.7; x += 0.45 + r() * 0.9) {
        const len = 0.8 + r() * 1.8;
        const k = ['vineA', 'vineB', 'vineC'][Math.floor(r() * 3)];
        card(B, M.flora, x, p.z + 0.04 + r() * 0.05, 0.2 + r() * 0.06, len, 0, fUV(k), 3.0 - len);
      }
      // a draped garland every so often
      for (let x = p.x0 + 2 + r() * 3; x < p.x1 - 2; x += 6 + r() * 6) {
        card(B, M.flora, x, p.z + 0.08, 2.6, 1.3, 0, fUV('hanging'), 1.75);
      }
    },
  },

  'arb.domeShaft': {
    build(W, p) {
      const G = W.groupFor(p.on);
      const s = p.s || 1;
      const shaft = makeLightShaft({ width: 0.9 * s, height: 6.5, color: '#ffd090', opacity: 0.16, spread: 1.7, dust: 1.4, seed: p.x * 3.1 + p.z });
      shaft.position.set(p.x - 1.6, 6.2, p.z - 2.2);
      shaft.rotation.set(-0.36, 0, 0.26);
      G.add(shaft);
    },
  },

  'arb.sprinkler': {
    textures: ['arb_tech', 'pipe'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const riser = pipeGeometry(0.05, 2.4, 'y');
      B.geometry(M.pipe, riser, _m.makeTranslation(p.x, 1.2, p.z));
      riser.dispose();
      techBox(B, M.tech, p.x, p.z, 0.32, 0.32, 2.36, 2.5, { front: tUV('steel'), back: tUV('steel'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
      glow(W, G, '#7ff4e0', 0.7, 0.6, p.x, 2.36, p.z + 0.1, false);
      W.addEmitter('rain', { position: [p.x, 2.35, p.z], area: [0.5, 0.05, 0.5], rate: 16 }, p.on);
      W.addEmitter('drip', { position: [p.x, 0.05, p.z], area: [0.9, 0.05, 0.9], rate: 2 }, p.on);
      W.addCircle(p.x, p.z, 0.12);
    },
  },

  'arb.pump': {
    textures: ['arb_tech', 'pipe'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const s = p.s || 1;
      B.box({ front: M.tech, back: M.tech, left: M.tech, right: M.tech, top: M.tech }, p.x, p.z, 1.8 * s, 1.0 * s, 0, 1.8 * s, 0,
        { front: tUV('pumpFront'), back: tUV('pumpSide'), left: tUV('pumpSide'), right: tUV('pumpSide'), top: tUV('steel') });
      for (const dx of [-0.6, 0.6]) {
        const pipe = pipeGeometry(0.12 * s, 1.4, 'y');
        B.geometry(M.pipe, pipe, _m.makeTranslation(p.x + dx * s, 2.4 * s, p.z - 0.2 * s));
        pipe.dispose();
      }
      glow(W, G, '#4dffe0', 1.2 * s, 0.6, p.x - 0.3 * s, 1.0 * s, p.z + 0.55 * s);
      W.addEmitter('steam', { position: [p.x + 0.5 * s, 1.9 * s, p.z], area: [0.2, 0.1, 0.2], rate: 2 }, p.on);
      W.addBox(p.x, p.z, 1.8 * s, 1.0 * s);
    },
  },

  'arb.sluice': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const steel = { front: tUV('steel'), back: tUV('steel'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') };
      // two pillars and a low header across the basin's south lip, between the valves
      for (const dx of [-2.6, 2.6]) techBox(B, M.tech, p.x + dx, p.z, 0.4, 0.4, 0, 2.0, steel);
      B.box({ front: M.tech, back: M.tech, top: M.tech }, p.x, p.z, 5.6, 0.3, 1.5, 2.05, 0, { front: tUV('sluice'), back: tUV('steel'), top: tUV('steel') });
      glow(W, G, '#ffbf4d', 0.6, 0.8, p.x - 2.0, 1.95, p.z + 0.2);
      glow(W, G, '#ffbf4d', 0.6, 0.8, p.x + 2.0, 1.95, p.z + 0.2);
      W.addBox(p.x - 2.6, p.z, 0.4, 0.4);
      W.addBox(p.x + 2.6, p.z, 0.4, 0.4);
    },
  },

  'arb.fountain': {
    textures: ['arb_tech', 'arb_water', 'arb_bank'],
    build(W, p) {
      const G = W.groupFor(p.on), M = mats(W);
      const rim = new THREE.Mesh(wrappedCylinder(1.1, 0.5, { arc: 1, texHeight: 0.75, segPerArc: 4 }), W.mats.tile('arb_bank', { emissive: 2.2 }));
      rim.position.set(p.x, 0, p.z);
      rim.castShadow = true;
      rim.receiveShadow = true;
      G.add(rim);
      const water = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), W.mats.tile('arb_water', { emissive: 1.8, roughness: 0.15, metalness: 0.2 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(p.x, 0.38, p.z);
      G.add(water);
      const B = W.batchFor(p.on);
      techBox(B, M.tech, p.x, p.z, 0.3, 0.3, 0.38, 1.2, { front: tUV('steel'), back: tUV('steel'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
      glow(W, G, '#4dffe0', 1.6, 0.7, p.x, 0.6, p.z);
      W.addEmitter('rain', { position: [p.x, 1.25, p.z], area: [0.15, 0.05, 0.15], rate: 12 }, p.on);
      W.addEmitter('firefly', { position: [p.x, 1.0, p.z], area: [2, 1, 2], rate: 1 }, p.on);
      W.addCircle(p.x, p.z, 1.15);
    },
  },

  'arb.choirDoor': {
    textures: ['arb_tech', 'arb_flora'],
    build(W, p) {
      const B = W.batchFor(p.on), M = mats(W);
      const gold = { front: tUV('gold'), back: tUV('gold'), left: tUV('gold'), right: tUV('gold'), top: tUV('gold') };
      for (const dx of [-1.35, 1.35]) techBox(B, M.tech, p.x + dx, p.z + 0.1, 0.32, 0.3, 0, 3.0, gold);
      techBox(B, M.tech, p.x, p.z + 0.1, 3.0, 0.3, 2.85, 3.25, gold);
      for (let k = 0; k < 7; k++) card(B, M.flora, p.x - 1.5 + k * 0.5, p.z + 0.3, 0.22, 1.2 + (k % 3) * 0.5, 0, fUV(['vineA', 'vineB', 'vineC'][k % 3]), 3.1 - (1.2 + (k % 3) * 0.5));
      card(B, M.flora, p.x, p.z + 0.32, 3.2, 1.4, 0, fUV('hanging'), 1.9);
    },
  },

  'arb.rootMound': {
    textures: ['arb_decal', 'arb_flora'],
    build(W, p) {
      const B = W.batchFor(p.on), M = mats(W);
      decal(B, M.decal, p.x, p.z, 4.2, 3.4, dUV('rootsFlat'), 0.3);
      decal(B, M.decal, p.x + 0.4, p.z + 0.3, 3.2, 2.6, dUV('mossPatch'), 1.2);
      decal(B, M.decal, p.x - 0.5, p.z + 0.8, 2.2, 2.0, dUV('petals'), 2.1);
    },
  },

  'arb.choirPods': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const x = (p.x0 + p.x1) / 2, w = p.x1 - p.x0;
      for (let z = p.z0; z <= p.z1 + 0.01; z += 1.6) {
        techBox(B, M.tech, x, z, w, 1.15, 0, 0.35, { front: tUV('steel'), back: tUV('steel'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
        techBox(B, M.tech, x, z, w - 0.4, 0.82, 0.35, 0.8, { front: tUV('podEnd'), back: tUV('podEnd'), left: tUV('podSideGold'), right: tUV('podSideGold'), top: tUV('podTopGold') });
        glow(W, G, '#ffd27a', 0.7, 0.3, x, 0.95, z + 0.2, false);
        W.addBox(x, z, w, 1.15);
      }
    },
  },

  'arb.choirTiers': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      B.faceZ(M.tech, p.x - 6.9, p.x + 6.9, 0, 3.0, p.z, 1, tUV('tiers'));
      for (let k = 0; k < 4; k++) glow(W, G, '#ffe2a0', 1.6, 0.25, p.x - 4.5 + k * 3, 1.4 + (k % 2) * 0.8, p.z + 0.3, false);
      W.addEmitter('mote', { position: [p.x, 1.5, p.z + 0.8], area: [13, 2.4, 1.2], rate: 3 }, p.on);
    },
  },

  'arb.theoPod': {
    textures: ['arb_tech', 'arb_decal'],
    sprites: ['npc:theo'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const gold = { front: tUV('gold'), back: tUV('gold'), left: tUV('gold'), right: tUV('gold'), top: tUV('steel') };
      // the dais, two shallow steps, and the pod's open cradle (the glass is a faint shell)
      techBox(B, M.tech, p.x, p.z, 3.4, 2.4, 0, 0.14, gold);
      techBox(B, M.tech, p.x, p.z - 0.1, 2.8, 1.8, 0.14, 0.28, gold);
      techBox(B, M.tech, p.x, p.z - 0.45, 2.1, 0.22, 0.28, 0.72, { front: tUV('podSideGold'), back: tUV('podSideGold'), left: tUV('podEnd'), right: tUV('podEnd'), top: tUV('gold') });
      for (const dx of [-1.0, 1.0]) techBox(B, M.tech, p.x + dx, p.z, 0.16, 0.9, 0.28, 0.62, { front: tUV('podEnd'), back: tUV('podEnd'), left: tUV('podSideGold'), right: tUV('podSideGold'), top: tUV('gold') });
      B.quad(M.tech, [p.x - 0.95, 0.3, p.z + 0.42], [p.x + 0.95, 0.3, p.z + 0.42], [p.x + 0.95, 0.3, p.z - 0.4], [p.x - 0.95, 0.3, p.z - 0.4], tUV('podTopEmpty'));
      decal(B, M.decal, p.x, p.z + 1.9, 2.6, 1.6, dUV('sigilFloor'), 0, 0.02);
      // Theo asleep in the cradle
      const sheet = buildFieldSprite('theo');
      const actor = new SpriteActor(sheet, { shadowScale: 0.6 });
      actor.object3d.position.set(p.x, 0.3, p.z + 0.1);
      actor.play(sheet.anims.collapse_down ? 'collapse_down' : 'idle_down');
      G.add(actor.object3d);
      W.addActor(actor);
      // the glass shell: a faint gold sheen over him
      const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: '#ffe9b8', transparent: true, opacity: 0.12, roughness: 0.1, metalness: 0.2, depthWrite: false, emissive: '#ffd27a', emissiveIntensity: 0.15 }));
      glass.scale.set(1.0, 0.42, 0.42);
      glass.position.set(p.x, 0.3, p.z);
      W.track(glass.material);
      W.track(glass.geometry);
      G.add(glass);
      glow(W, G, '#ffd27a', 1.6, 0.35, p.x, 0.9, p.z + 0.2, false);
      W.addEmitter('mote', { position: [p.x, 0.9, p.z], area: [2.2, 1.2, 1.2], rate: 3 }, p.on);
      W.addBox(p.x, p.z - 0.1, 2.4, 1.2);
      return { kind: 'arb.theoPod', actor, object: actor.object3d };
    },
  },

  'arb.planterChest': {
    textures: ['arb_tech'],
    build(W, p) {
      const M = mats(W);
      const G = W.groupFor(p.on);
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.rot || 0;
      G.add(g);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.7), M.tech);
      setBoxUV(body.geometry, tUV('planter'), tUV('planterTop'));
      body.position.y = 0.31;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const hinge = new THREE.Group();
      hinge.position.set(0, 0.62, -0.35);
      g.add(hinge);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.1, 0.74), M.tech);
      setBoxUV(lid.geometry, tUV('steel'), tUV('planterTop'));
      lid.position.set(0, 0.05, 0.37);
      lid.castShadow = true;
      hinge.add(lid);
      const led = makeGlow('#ffbf4d', 0.5, 0.9);
      led.position.set(0, 0.42, 0.37);
      g.add(led);
      for (const o of [body.geometry, lid.geometry]) W.track(o);
      W.addBox(p.x, p.z, 0.94, 0.74);
      let k = 0, target = 0;
      const apply = () => {
        hinge.rotation.x = -k * 1.9;
        led.material.color.set(target ? '#4dffc0' : '#ffbf4d').multiplyScalar(0.9);
      };
      return {
        kind: 'chest',
        setOpen(open, instant) {
          target = open ? 1 : 0;
          if (instant) k = target;
          apply();
        },
        update(dt) {
          if (k === target) return;
          k = target > k ? Math.min(1, k + dt * 2.5) : Math.max(0, k - dt * 2.5);
          apply();
        },
      };
    },
  },

  'arb.logTerminal': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const rot = p.rot || 0;
      B.box({ front: M.tech, back: M.tech, left: M.tech, right: M.tech, top: M.tech }, p.x, p.z, 0.8, 0.4, 0, 1.3, rot,
        { front: tUV('terminal'), back: tUV('steel'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
      glow(W, G, '#8fe08a', 0.9, 0.7, p.x + Math.sin(rot) * 0.3, 1.05, p.z + Math.cos(rot) * 0.3);
      W.addBox(p.x, p.z, 0.8, 0.4);
    },
  },

  'arb.lift': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      B.box({ front: M.tech, left: M.tech, right: M.tech, top: M.tech }, p.x, p.z - 0.3, 1.5, 0.3, 0, 2.4, 0,
        { front: tUV('lift'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
      B.faceY(M.tech, p.x - 0.75, p.x + 0.75, p.z - 0.15, p.z + 0.75, 0.02, tUV('steel'));
      glow(W, G, '#ffbf4d', 0.8, 0.8, p.x, 2.3, p.z - 0.1);
    },
  },

  'arb.seedRacks': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      const n = Math.floor(p.w / 3);
      for (let i = 0; i < n; i++) {
        const x = p.x - p.w / 2 + 1.5 + i * 3;
        B.box({ front: M.tech, left: M.tech, right: M.tech, top: M.tech }, x, p.z + 0.3, 2.8, 0.6, 0, 2.0, 0,
          { front: tUV('racks'), left: tUV('steel'), right: tUV('steel'), top: tUV('steel') });
        if (i % 2) glow(W, G, '#4dffe0', 0.7, 0.4, x, 1.6, p.z + 0.7, false);
      }
      W.addBox(p.x, p.z + 0.3, n * 3, 0.6);
    },
  },

  'arb.lamp': {
    textures: ['arb_tech'],
    build(W, p) {
      const B = W.batchFor(p.on), G = W.groupFor(p.on), M = mats(W);
      card(B, M.tech, p.x, p.z + 0.05, 0.7, 0.7, 0, tUV('lamp'), 2.15);
      glow(W, G, p.cool ? '#bfefff' : '#ffc070', 1.1, 0.9, p.x, 2.25, p.z + 0.25);
    },
  },

  'arb.decal': {
    textures: ['arb_decal'],
    build(W, p) {
      const B = W.batchFor(p.on), M = mats(W);
      const R = DECAL[p.kind] || DECAL.litterA;
      const s = p.s || 1;
      decal(B, M.decal, p.x, p.z, p.w ?? (R.w / 32) * s, p.d ?? (R.h / 32) * s, uvOf(DECAL, R), p.rot || 0);
    },
  },
};

/** UVs of a BoxGeometry: the sides on one atlas region, the top (+y) on another. */
function setBoxUV(geo, side, top) {
  const uv = geo.attributes.uv;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z; four vertices each
  for (let f = 0; f < 6; f++) {
    const r = f === 2 ? top : side;
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, r[0] + uv.getX(k) * (r[2] - r[0]), r[1] + uv.getY(k) * (r[3] - r[1]));
    }
  }
  uv.needsUpdate = true;
}

export default props;
