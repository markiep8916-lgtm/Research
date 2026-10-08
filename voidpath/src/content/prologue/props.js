// prologue: prop types for the Halcyon's new rooms (browser, TECH_PLAN 2.5, 3.3). Each is composed
// of built-in props (box, plane, cylinder, pipe) plus glows and emitters, so it shares the World's
// batched materials, colliders, dividers (`on`) and conditional scopes (`when`). They reuse the POC's
// textures wherever they can: visualLint caps a map at 48 distinct textures.
//
//   pro.openPod      { x, z, forced? }   an emptied cryo pod, lid swung open on its hinge (Kade's pod 07,
//                                        Sera's pod M-2 when `forced`: sparks from the pried seal)
//   pro.pump         { x, z }            a coolant pump: casing on a grated plinth, sight glass, riser pipes
//   pro.fabricator   { x, z }            the antechamber fabricator (shop) against a north wall
//   pro.moth         { x, z }            Nyx's skiff in its docking cradle, nose to the west

import { buildProp } from '../../world/props.js';
import { makeGlow } from '../../core/vfx.js';

function glow(W, p, color, size, intensity, x, y, z) {
  const g = makeGlow(color, size, intensity);
  g.position.set(x, y, z);
  W.groupFor(p.on).add(g);
  W.addGlow(g, x, z);
  return g;
}

export default {
  'pro.openPod': {
    textures: ['pro_pod_open', 'cryo_pod', 'metal_side', 'wall_cap'],
    build(W, p) {
      const { x, z } = p;
      buildProp(W, { t: 'box', x, z: z - 0.06, w: 0.92, d: 0.58, h: 2.0, on: p.on, emissive: 2.2,
        tex: { front: 'pro_pod_open', side: 'metal_side', top: 'wall_cap' } });
      // the lid swung out on its left hinge, toward the aisle
      buildProp(W, { t: 'plane', x: x - 0.6, z: z + 0.66, w: 0.86, h: 1.9, y: 0.05, rot: -1.88, tex: 'cryo_pod', on: p.on, alpha: false });
      glow(W, p, '#6fd6ff', 1.2, 0.5, x, 1.2, z + 0.32);
      W.addEmitter('frost', { position: [x, 0.25, z + 0.45], area: [0.7, 0.2, 0.35], rate: p.forced ? 3 : 2 }, p.on);
      if (p.forced) W.addEmitter('spark', { position: [x + 0.42, 1.5, z + 0.34], area: [0.05, 0.3, 0.05], rate: 0.6, burst: 8 }, p.on);
      return null;
    },
  },

  'pro.pump': {
    textures: ['wall_low', 'floor_grate', 'pipe'],
    build(W, p) {
      const { x, z } = p;
      buildProp(W, { t: 'box', x, z, w: 1.3, d: 1.1, h: 0.22, tex: { front: 'wall_low', side: 'wall_low', top: 'floor_grate' }, on: p.on, solid: false });
      buildProp(W, { t: 'cylinder', x, z, r: 0.52, h: 2.0, y: 0.22, tex: 'pipe', on: p.on, emissive: 2.4 });
      buildProp(W, { t: 'pipe', axis: 'y', x: x + 0.3, z: z - 0.28, y0: 2.2, y1: 3.0, r: 0.12, on: p.on });
      buildProp(W, { t: 'pipe', axis: 'y', x: x - 0.32, z: z - 0.26, y0: 2.2, y1: 3.0, r: 0.09, on: p.on });
      glow(W, p, '#6fd6ff', 0.9, 0.7, x + 0.12, 1.1, z + 0.55);
      W.addEmitter('steam', { position: [x + 0.3, 2.9, z - 0.2], area: [0.1, 0.05, 0.1], rate: 1.2 }, p.on);
      return null;
    },
  },

  'pro.fabricator': {
    textures: ['wall_panel_screen', 'metal_side', 'wall_cap'],
    build(W, p) {
      buildProp(W, { t: 'box', x: p.x, z: p.z, w: 0.96, d: 0.62, h: 1.95, on: p.on, emissive: 2.4,
        tex: { front: 'wall_panel_screen', side: 'metal_side', top: 'wall_cap' } });
      glow(W, p, '#7fe3ff', 1.0, 0.55, p.x, 1.55, p.z + 0.36);
      glow(W, p, '#ffb54a', 0.7, 0.5, p.x, 0.85, p.z + 0.36);
      return null;
    },
  },

  'pro.moth': {
    textures: ['pro_moth_hull', 'window_frame', 'wall_low', 'metal_side', 'wall_cap', 'pipe', 'floor_hazard'],
    build(W, p) {
      const { x, z } = p;
      const hull = { front: 'pro_moth_hull', side: 'pro_moth_hull', top: 'pro_moth_hull' };
      const metal = { front: 'metal_side', side: 'metal_side', top: 'wall_cap' };
      const part = (e) => buildProp(W, { on: p.on, emissive: 2.2, ...e });
      // docking cradle and fuel line
      for (const dx of [-0.5, 1.3]) part({ t: 'box', x: x + dx, z, w: 0.5, d: 1.9, h: 0.45, tex: { front: 'wall_low', side: 'wall_low', top: 'floor_hazard' } });
      part({ t: 'pipe', axis: 'y', x: x + 2.0, z: z - 1.3, y0: 0, y1: 2.6, r: 0.1 });
      // fuselage, stepping down to the nose (west), a dorsal spine, the canopy
      part({ t: 'box', x: x + 0.9, z, w: 2.4, d: 1.5, h: 1.0, y: 0.45, tex: hull });
      part({ t: 'box', x: x - 0.9, z, w: 1.4, d: 1.1, h: 0.85, y: 0.5, tex: hull });
      part({ t: 'box', x: x - 1.95, z, w: 0.7, d: 0.7, h: 0.6, y: 0.6, tex: hull });
      part({ t: 'box', x: x + 0.9, z, w: 1.8, d: 0.6, h: 0.28, y: 1.45, tex: hull });
      part({ t: 'box', x: x - 0.8, z, w: 1.1, d: 0.8, h: 0.34, y: 1.35, emissive: 2.6,
        tex: { front: 'window_frame', side: 'window_frame', top: 'window_frame' } });
      // wings: the south one whole, the north one winged by the Halcyon's turrets (its tip lies on the deck)
      for (const sz of [-1, 1]) part({ t: 'box', x: x + 0.6, z: z + sz * 1.15, w: 1.8, d: 0.8, h: 0.12, y: 0.95, tex: hull });
      part({ t: 'box', x: x + 1.0, z: z + 1.85, w: 1.1, d: 0.6, h: 0.1, y: 0.98, tex: hull });
      part({ t: 'box', x: x + 0.2, z: z - 2.3, w: 1.0, d: 0.55, h: 0.1, y: 0, rot: 0.5, tex: hull, solid: false });
      // tail fin and engines
      part({ t: 'box', x: x + 1.9, z, w: 0.8, d: 0.12, h: 0.8, y: 1.45, tex: hull });
      for (const sz of [-1, 1]) part({ t: 'box', x: x + 2.3, z: z + sz * 0.45, w: 0.7, d: 0.5, h: 0.5, y: 0.6, tex: metal });
      // exhaust embers, wingtip lights (red to port, south), the dash glow under the canopy
      glow(W, p, '#ffb54a', 0.8, 0.7, x + 2.72, 0.85, z - 0.45);
      glow(W, p, '#3fd6d2', 0.8, 0.7, x + 2.72, 0.85, z + 0.45);
      glow(W, p, '#ff5a5a', 0.6, 1.3, x + 1.0, 1.1, z + 2.15);
      glow(W, p, '#5dff9c', 0.5, 0.9, x + 0.6, 1.1, z - 1.6);
      glow(W, p, '#ff5a5a', 0.6, 1.2, x + 1.9, 2.3, z);
      glow(W, p, '#7fe3ff', 1.0, 0.45, x - 0.8, 1.6, z + 0.45);
      // the torn wing root still sparks
      W.addEmitter('spark', { position: [x + 0.6, 1.0, z - 1.55], area: [0.4, 0.05, 0.05], rate: 0.5, burst: 6 }, p.on);
      return null;
    },
  },
};
