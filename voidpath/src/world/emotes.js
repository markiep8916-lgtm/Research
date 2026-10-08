// Emote bubbles (TECH_PLAN 3.13 world.emote, 8.7): pixel-art speech bubbles that pop up above a
// head in the diorama itself (unlit sprites, so they sit at the right depth and take the tilt-shift
// blur), follow their target while it moves, and fade out.
//
// export const EMOTE_KINDS = ['!', '?', '...', 'note', 'heart', 'anger', 'sweat', 'idea', 'zzz']
// export function showEmote(world, target, kind, { ms = 1200 } = {}) -> Promise   resolves when it is gone
//     target: an NpcActor, the Player (anything with .actor), a SpriteActor, an Object3D or { x, y?, z }
//     world: a World (needs scene; uses addUpdater / updaters for animation and onSound('emote'))
//     A new emote on the same target replaces the old one. Unknown kinds show '?' with one warning.
// export function clearEmotes(world)     remove every bubble of a world (resolves their promises)
// export function primeEmotes(world)     add a hidden bubble so compileScene links the emote program
//     before the first emote (NpcActor calls it; the World frees it with the scene)

import * as THREE from 'three';
import { textureSet } from '../art/tiles.js';
import { noteMissingArt } from '../art/cache.js';
import { release } from '../core/programs.js';
import { EMOTE_ORDER } from './paint.js';

export const EMOTE_KINDS = EMOTE_ORDER.slice();

const SIZE = 20 / 32;        // world units (20 px bubbles at 32 px per unit)
const POP = 0.18;            // pop-in seconds
const OUT = 0.2;             // fade-out seconds
const layers = new WeakMap(); // world -> { bubbles: [], hooked, ticked, primed }
const BUBBLE = new THREE.Color(0.72, 0.72, 0.72);

function layerOf(world) {
  let L = layers.get(world);
  if (L) return L;
  L = { bubbles: [], hooked: false, ticked: 0, primed: false };
  layers.set(world, L);
  const step = (dt) => stepLayer(L, dt);
  if (world.addUpdater) { world.addUpdater(step); L.hooked = true; }
  else if (world.updaters) { world.updaters.push(step); L.hooked = true; }
  return L;
}

/** World-space anchor above the target's head. */
function anchorOf(target, out) {
  const actor = target.actor && target.actor.object3d ? target.actor : target.object3d ? target : null;
  if (actor) {
    actor.object3d.getWorldPosition(out);
    out.y += (actor.top || 1.4) * actor.object3d.scale.y + 0.38;
    return out;
  }
  if (target.isObject3D) return target.getWorldPosition(out).add(_up);
  return out.set(target.x, (target.y ?? 1.4) + 0.38, target.z);
}
const _up = new THREE.Vector3(0, 1.8, 0);

function stepLayer(L, dt) {
  L.ticked = performance.now();
  for (let i = L.bubbles.length - 1; i >= 0; i--) {
    const b = L.bubbles[i];
    b.t += dt;
    anchorOf(b.target, b.sprite.position);
    const k = b.t;
    // pop in with a small overshoot, then a gentle bob; the last OUT seconds fade
    const pop = k < POP ? k / POP : 1;
    const s = pop < 1 ? 0.2 + 0.95 * Math.sin(pop * Math.PI * 0.62) / Math.sin(Math.PI * 0.62) : 1;
    const bob = Math.sin(k * 5) * 0.03;
    b.sprite.position.y += bob + (b.kind === 'zzz' || b.kind === 'note' ? k * 0.06 : 0);
    b.sprite.scale.set(SIZE * s, SIZE * s, 1);
    const out = clamp01((b.dur - k) / OUT);
    b.mat.opacity = Math.min(1, out);
    if (k >= b.dur) remove(L, b);
  }
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function remove(L, b) {
  const i = L.bubbles.indexOf(b);
  if (i >= 0) L.bubbles.splice(i, 1);
  b.sprite.removeFromParent();
  b.mat.map.dispose();
  release(b.mat);
  clearTimeout(b.timer);
  b.resolve();
}

function bubbleMaterial(kind) {
  const set = textureSet('emotes', { layers: ['map'] });
  set.map.offset.x = EMOTE_KINDS.indexOf(kind) / EMOTE_KINDS.length;
  // a touch under white so the bubble stays under the bloom threshold and its glyph reads
  return new THREE.SpriteMaterial({ map: set.map, color: BUBBLE, transparent: true, depthWrite: false, fog: false, alphaTest: 0.05 });
}

/** A hidden bubble in the world's scene, so compiling the scene links the emote program up front. */
export function primeEmotes(world) {
  if (!world || !world.scene) return;
  const L = layerOf(world);
  if (L.primed) return;
  L.primed = true;
  const s = new THREE.Sprite(bubbleMaterial('?'));
  s.visible = false;
  world.scene.add(s);
}

/** Pop an emote bubble over `target`; resolves after `ms` (when it has faded). */
export function showEmote(world, target, kind, { ms = 1200 } = {}) {
  if (!world || !target) return Promise.resolve();
  if (!EMOTE_KINDS.includes(kind)) {
    if (noteMissingArt('emote', String(kind))) console.warn(`emotes: unknown emote "${kind}" (showing "?")`);
    kind = '?';
  }
  const L = layerOf(world);
  for (const b of L.bubbles.slice()) if (b.target === target) remove(L, b);
  const mat = bubbleMaterial(kind);
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.3, 0.05);     // the tail points down at the head
  sprite.scale.set(0.001, 0.001, 1);
  sprite.renderOrder = 20;
  anchorOf(target, sprite.position);
  world.scene.add(sprite);
  if (world.onSound) world.onSound('emote', { volume: 0.7 });
  const dur = Math.max(0.3, ms / 1000);
  return new Promise((resolve) => {
    const b = { target, kind, sprite, mat, t: 0, dur, resolve };
    L.bubbles.push(b);
    // a world that stops updating (paused, disposed) must not hang a script; a slow one is fine
    const watch = () => {
      if (!L.bubbles.includes(b)) return;
      if (L.hooked && performance.now() - L.ticked < 1000) b.timer = setTimeout(watch, 1000);
      else remove(L, b);
    };
    b.timer = setTimeout(watch, dur * 1000 + 1500);
  });
}

/** Remove every emote bubble of a world. */
export function clearEmotes(world) {
  const L = layers.get(world);
  if (!L) return;
  for (const b of L.bubbles.slice()) remove(L, b);
}
