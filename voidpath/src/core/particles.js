// CPU-simulated particle pools rendered as THREE.Points with a custom shader.
// One Points object per blend mode (additive / normal alpha). Per-particle colour, alpha, size,
// shape (soft round, crisp pixel square, velocity streak, pixel plus, tumbling glass shard).
// Sizes are in world units, attenuated with the camera FOV and the drawing-buffer height.
// update() allocates nothing: simulation and GPU data live in preallocated typed arrays.

import * as THREE from 'three';
import { makeCanvas } from '../art/painter.js';

// ---------------------------------------------------------------- constants

const SOFT = 0, SQUARE = 1, STREAK = 2, PLUS = 3, SHARD = 4;
const ADD = 0, NORMAL = 1;

// simulation record layout (floats per particle)
const PX = 0, PY = 1, PZ = 2, VX = 3, VY = 4, VZ = 5, AGE = 6, LIFE = 7, S0 = 8, GROW = 9;
const R0 = 10, G0 = 11, B0 = 12, R1 = 13, G1 = 14, B1 = 15, ALPHA = 16, FIN = 17, FOUT = 18;
const GRAV = 19, DRAG = 20, WOB = 21, PHASE = 22, FLICK = 23, SHAPE = 24, ROT = 25, SPIN = 26;
const STRK = 27, BOUNCE = 28, JIT = 29, FLOOR = 30, FROZEN = 31;
const S = 32;
// GPU record: position 3, colour+alpha 4, size 1, streak tail 3, shape+rotation 2
const G = 13;

// ---------------------------------------------------------------- presets

const BASE = {
  n: 10, blend: ADD, shape: SOFT, life: [1, 1], speed: [0, 0], dir: 'sphere', cone: 0.5,
  spawn: 'ball', spread: 0, size: [0.1, 0.1], grow: 1, colors: ['#ffffff'], end: null,
  intensity: 1, alpha: 1, fade: [0.08, 0.5], gravity: 0, drag: 0, wobble: 0, flicker: 0,
  spin: 0, streak: 0, bounce: 0, jitter: 0, lift: 0, bolt: false, segs: 6, boltLen: [0.6, 1.0],
};

const _pc = new THREE.Color();
function lin(hex) {
  _pc.set(hex);
  return [_pc.r, _pc.g, _pc.b];
}

function layer(o) {
  const L = { ...BASE, ...o };
  L.colorsLin = L.colors.map(lin);
  L.endLin = L.end ? lin(L.end) : null;
  return L;
}

function preset(...layers) {
  const ls = layers.map(layer);
  let sum = 0;
  const cum = ls.map((l) => (sum += l.n));
  return { layers: ls, cum, total: sum };
}

/**
 * Preset catalogue. Layer fields: n (burst count), blend, shape, life/speed/size ranges, dir
 * ('sphere' | 'up' | 'down' | 'ring' | 'implode'), cone (half-angle, rad), spawn ('ball' | 'disc' | 'shell'),
 * spread (spawn radius), grow (end size multiplier), colors (start, one picked per particle), end colour,
 * intensity (HDR multiplier: > 1 blooms), alpha, fade [in, out] (fractions of life), gravity (+ pulls down),
 * drag, wobble (lateral drift), flicker (twinkle 0-1), spin (rad/s), streak (seconds of motion shown),
 * bounce (floor restitution), jitter (random kinks), lift (extra upward velocity),
 * bolt (each count is a jagged lightning bolt of `segs` static streak segments, `boltLen` long).
 */
export const PRESETS = {
  dust: preset(
    { n: 24, shape: SOFT, life: [7, 12], speed: [0.015, 0.06], size: [0.04, 0.085], colors: ['#fff0d2', '#ffe2b0', '#cfe4ff'],
      intensity: 1.3, alpha: 0.55, fade: [0.25, 0.35], gravity: -0.004, drag: 0.15, wobble: 0.07, flicker: 0.45 },
  ),
  spark: preset(
    { n: 16, shape: STREAK, life: [0.35, 0.85], speed: [2.4, 5.8], dir: 'up', cone: 1.05, size: [0.03, 0.045], colors: ['#fff8de'],
      end: '#ff5a14', intensity: 3.2, fade: [0.0, 0.35], gravity: 9.5, drag: 0.5, streak: 0.04, bounce: 0.38 },
    { n: 2, shape: SOFT, life: [0.08, 0.14], size: [0.3, 0.42], grow: 1.4, colors: ['#ffc46a'], intensity: 1.4, alpha: 0.7, fade: [0.0, 0.8] },
    { n: 5, shape: SQUARE, life: [0.5, 1.0], speed: [1.0, 2.6], dir: 'up', cone: 1.2, size: [0.03, 0.045], colors: ['#ffd27a'],
      end: '#ff3b1a', intensity: 2.6, fade: [0.0, 0.4], gravity: 7, drag: 0.4, bounce: 0.3 },
  ),
  steam: preset(
    { n: 12, blend: NORMAL, shape: SOFT, life: [1.6, 2.8], speed: [0.5, 1.2], dir: 'up', cone: 0.32, spread: 0.08,
      size: [0.22, 0.36], grow: 3.4, colors: ['#c4d0de'], end: '#6f8098', alpha: 0.22, fade: [0.12, 0.7],
      gravity: -0.35, drag: 1.1, wobble: 0.28 },
  ),
  frost: preset(
    { n: 16, shape: SQUARE, life: [1.6, 3.2], speed: [0.05, 0.3], size: [0.035, 0.055], colors: ['#f2fdff', '#bdefff'],
      end: '#5fc8ff', intensity: 1.8, alpha: 0.85, fade: [0.15, 0.45], gravity: 0.12, drag: 0.8, wobble: 0.12, flicker: 0.7 },
    { n: 6, shape: SOFT, life: [1.2, 2.2], speed: [0.05, 0.2], size: [0.06, 0.1], colors: ['#dff8ff'], end: '#7fd8ff',
      intensity: 1.2, alpha: 0.45, fade: [0.2, 0.5], gravity: 0.05, drag: 0.8, wobble: 0.1, flicker: 0.3 },
  ),
  ember: preset(
    { n: 14, shape: SQUARE, life: [1.3, 2.6], speed: [0.3, 0.9], dir: 'up', cone: 0.6, spread: 0.12, size: [0.035, 0.06],
      grow: 0.4, colors: ['#ffe08a', '#ffc04d'], end: '#ff3214', intensity: 2.8, fade: [0.05, 0.5],
      gravity: -0.55, drag: 0.5, wobble: 0.45, flicker: 0.5 },
  ),
  holo: preset(
    { n: 16, shape: SQUARE, life: [0.6, 1.5], speed: [0.05, 0.45], dir: 'up', cone: 1.2, size: [0.03, 0.055],
      colors: ['#d8fcff', '#8ff0ff'], end: '#2a9dff', intensity: 2.2, fade: [0.1, 0.4], gravity: -0.15, drag: 1.2, flicker: 0.9 },
  ),
  hit: preset(
    { n: 14, shape: STREAK, life: [0.16, 0.32], speed: [4.5, 8.5], size: [0.035, 0.05], colors: ['#ffffff'], end: '#a9dcff',
      intensity: 3.4, fade: [0.0, 0.5], drag: 5, streak: 0.045 },
    { n: 1, shape: SOFT, life: [0.16, 0.16], size: [0.7, 0.7], grow: 1.6, colors: ['#ffffff'], intensity: 1.6, alpha: 0.85, fade: [0.0, 0.9] },
    { n: 6, shape: SQUARE, life: [0.3, 0.55], speed: [1.5, 3.2], size: [0.04, 0.055], colors: ['#ffffff'], end: '#cfe8ff',
      intensity: 2.4, fade: [0.0, 0.4], gravity: 7, drag: 1.5 },
  ),
  break: preset(
    { n: 22, shape: SHARD, life: [0.7, 1.25], speed: [2.8, 6.4], lift: 1.6, size: [0.13, 0.26],
      colors: ['#ffffff', '#ffd2ec', '#ff63b6', '#ff8fd0', '#d23596'], intensity: 2.6, fade: [0.0, 0.35],
      gravity: 8, drag: 1.1, spin: 16, bounce: 0.32 },
    { n: 1, shape: SOFT, life: [0.24, 0.24], size: [1.3, 1.3], grow: 1.6, colors: ['#ff7cc8'], intensity: 1.5, alpha: 0.75, fade: [0.0, 0.9] },
    { n: 16, shape: STREAK, life: [0.2, 0.42], speed: [6, 10.5], size: [0.035, 0.05], colors: ['#ffffff'], end: '#ff4fb0',
      intensity: 3.4, fade: [0.0, 0.5], drag: 3.5, streak: 0.05 },
    { n: 12, shape: SQUARE, life: [0.6, 1.1], speed: [1, 3], lift: 1, size: [0.035, 0.05], colors: ['#ffb0dc', '#ffffff'],
      end: '#95207a', intensity: 2.4, fade: [0.0, 0.4], gravity: 4, drag: 1, flicker: 0.5 },
  ),
  boost: preset(
    { n: 14, shape: SOFT, life: [0.8, 1.5], speed: [0.6, 1.4], dir: 'up', cone: 0.25, spawn: 'disc', spread: 0.42,
      size: [0.05, 0.1], grow: 0.5, colors: ['#fff3cf', '#ffd98a'], end: '#e8892a', intensity: 2.4, fade: [0.1, 0.5],
      gravity: -0.5, drag: 0.6, wobble: 0.2, flicker: 0.3 },
    { n: 8, shape: SQUARE, life: [0.6, 1.2], speed: [0.9, 1.8], dir: 'up', cone: 0.2, spawn: 'disc', spread: 0.4,
      size: [0.03, 0.045], colors: ['#ffd98a'], end: '#ff8a2a', intensity: 2.6, fade: [0.0, 0.5], drag: 0.5, flicker: 0.6 },
  ),
  heal: preset(
    { n: 10, shape: PLUS, life: [1.0, 1.7], speed: [0.35, 0.8], dir: 'up', cone: 0.3, spawn: 'disc', spread: 0.45,
      size: [0.13, 0.19], colors: ['#d4fff0', '#a9f7c4'], end: '#3fd6d2', intensity: 1.9, fade: [0.15, 0.45],
      gravity: -0.2, drag: 0.8, wobble: 0.12 },
    { n: 12, shape: SOFT, life: [0.8, 1.5], speed: [0.4, 1.1], dir: 'up', cone: 0.35, spawn: 'disc', spread: 0.4,
      size: [0.04, 0.08], colors: ['#c8fff0'], end: '#4fd889', intensity: 2, fade: [0.1, 0.5], drag: 0.6, flicker: 0.4 },
  ),
  thermal: preset(
    { n: 16, shape: SOFT, life: [0.45, 0.85], speed: [0.8, 2.4], lift: 1.2, spread: 0.15, size: [0.2, 0.34], grow: 1.9,
      colors: ['#ffd77a', '#ffb347', '#ff9a3a'], end: '#b0200a', intensity: 1.15, alpha: 0.75, fade: [0.0, 0.6], gravity: -2.2, drag: 2.6 },
    { n: 3, shape: SOFT, life: [0.18, 0.28], speed: [0, 0.3], size: [0.45, 0.6], grow: 1.5, colors: ['#fff2c0'], end: '#ff7a2f',
      intensity: 1.2, alpha: 0.7, fade: [0.0, 0.8] },
    { n: 14, shape: SQUARE, life: [0.7, 1.4], speed: [1.6, 3.8], lift: 1.5, size: [0.035, 0.055], colors: ['#ffe08a'],
      end: '#ff3214', intensity: 3, fade: [0.0, 0.5], gravity: -0.8, drag: 1.2, wobble: 0.5, flicker: 0.4 },
    { n: 5, blend: NORMAL, shape: SOFT, life: [0.9, 1.4], speed: [0.4, 1.0], dir: 'up', cone: 0.8, spread: 0.2,
      size: [0.3, 0.45], grow: 2.4, colors: ['#3a2a26'], end: '#16141a', alpha: 0.4, fade: [0.25, 0.6], gravity: -1, drag: 1.5 },
  ),
  cryo: preset(
    { n: 16, shape: SHARD, life: [0.6, 1.1], speed: [1.4, 3.6], lift: 0.6, size: [0.1, 0.2], colors: ['#e6fbff', '#9fe6ff', '#6fd6ff'],
      end: '#1479b0', intensity: 1.7, fade: [0.0, 0.4], gravity: 2.2, drag: 2.2, spin: 7 },
    { n: 7, shape: SOFT, life: [0.6, 1.0], speed: [0.4, 1.0], spread: 0.15, size: [0.35, 0.5], grow: 1.8, colors: ['#9fe6ff'],
      end: '#0d4f78', intensity: 0.7, alpha: 0.4, fade: [0.0, 0.6], drag: 3 },
    { n: 16, shape: SQUARE, life: [0.9, 1.7], speed: [0.3, 1.4], size: [0.03, 0.045], colors: ['#f2fdff', '#c8f3ff'], end: '#29a9e0',
      intensity: 2.2, fade: [0.0, 0.5], gravity: 0.6, drag: 1.2, flicker: 0.8 },
  ),
  volt: preset(
    { n: 6, bolt: true, segs: 8, boltLen: [1.0, 1.7], shape: STREAK, life: [0.16, 0.3], size: [0.04, 0.055],
      colors: ['#ffffff', '#fff6a0'], end: '#ffe94d', intensity: 4, fade: [0.0, 0.3], flicker: 0.6 },
    { n: 8, shape: STREAK, life: [0.1, 0.22], speed: [5, 9], size: [0.025, 0.035], colors: ['#fff6a0'], end: '#ffe94d',
      intensity: 3.4, fade: [0.0, 0.3], drag: 1, streak: 0.05, jitter: 1 },
    { n: 2, shape: SOFT, life: [0.1, 0.16], size: [0.6, 0.8], grow: 1.3, colors: ['#fff6a0'], intensity: 1.4, alpha: 0.75, fade: [0.0, 0.7] },
    { n: 10, shape: SQUARE, life: [0.35, 0.7], speed: [1.5, 3.5], size: [0.03, 0.045], colors: ['#ffe94d'], end: '#ffb020',
      intensity: 3, fade: [0.0, 0.4], gravity: 6, drag: 0.8, flicker: 0.8, bounce: 0.3 },
  ),
  photon: preset(
    { n: 24, shape: SOFT, life: [0.5, 0.95], speed: [2.2, 5], dir: 'up', cone: 0.06, spawn: 'disc', spread: 0.32,
      size: [0.05, 0.1], colors: ['#ffffff', '#fff6c8'], end: '#ffd27a', intensity: 1.8, fade: [0.0, 0.5], drag: 1.2 },
    { n: 10, shape: STREAK, life: [0.3, 0.6], speed: [5, 8.5], dir: 'up', cone: 0.04, spawn: 'disc', spread: 0.28,
      size: [0.035, 0.05], colors: ['#ffffff'], end: '#fff0a8', intensity: 3.4, fade: [0.0, 0.5], streak: 0.06, drag: 0.6 },
    { n: 3, shape: SOFT, life: [0.25, 0.35], speed: [0, 0.4], dir: 'up', cone: 0.1, size: [0.7, 0.9], grow: 1.3,
      colors: ['#fff6c8'], intensity: 1.0, alpha: 0.55, fade: [0.0, 0.8] },
  ),
  void: preset(
    { n: 26, shape: SOFT, dir: 'implode', spawn: 'shell', spread: 1.1, life: [0.45, 0.75], speed: [1.5, 2.4],
      size: [0.07, 0.13], grow: 0.4, colors: ['#c3b1f7', '#b06bff', '#ff63e0'], end: '#2a1b4f', intensity: 2.4, fade: [0.2, 0.3] },
    { n: 10, shape: STREAK, dir: 'implode', spawn: 'shell', spread: 0.9, life: [0.3, 0.5], speed: [2.5, 3.4], size: [0.03, 0.045],
      colors: ['#e0c8ff'], end: '#6343b0', intensity: 3, fade: [0.2, 0.3], streak: 0.07 },
    { n: 3, blend: NORMAL, shape: SOFT, life: [0.6, 0.8], size: [0.35, 0.45], grow: 2.6, colors: ['#08020f'], end: '#170f2c',
      alpha: 0.85, fade: [0.15, 0.6] },
    { n: 1, shape: SOFT, life: [0.6, 0.6], size: [0.9, 0.9], grow: 0.25, colors: ['#8e6ee0'], intensity: 1.8, alpha: 0.7, fade: [0.1, 0.4] },
  ),
  smoke: preset(
    { n: 10, blend: NORMAL, shape: SOFT, life: [2.6, 4.2], speed: [0.25, 0.6], dir: 'up', cone: 0.4, spread: 0.12,
      size: [0.32, 0.5], grow: 3.2, colors: ['#4d535f', '#5a5f6a'], end: '#16181d', alpha: 0.42, fade: [0.15, 0.6],
      gravity: -0.22, drag: 0.8, wobble: 0.25 },
  ),
};

// ---------------------------------------------------------------- shaders

const VERT = /* glsl */ `
attribute vec4 aColor;
attribute float aSize;
attribute vec3 aStreak;
attribute vec2 aShape;
uniform vec3 uViewport;   // drawing-buffer width, height (px), max point size
varying vec4 vColor;
varying vec4 vShape;      // shape, rotation, streak half-length, radius (both relative to the point)
varying vec2 vDir;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float pxPerUnit = 0.5 * uViewport.y * projectionMatrix[1][1];
  float size = aSize * pxPerUnit / (isOrthographic ? 1.0 : max(-mvPosition.z, 0.001));
  float alpha = aColor.a;
  float minPx = aShape.x > 0.5 && aShape.x < 1.5 ? 1.0 : 2.0;
  if (size < minPx) { alpha *= (size / minPx) * (size / minPx); size = minPx; }
  float total = size, seg = 0.0;
  vDir = vec2(1.0, 0.0);
  if (aShape.x > 1.5 && aShape.x < 2.5) {
    // stretch along the screen-space motion: centre the point on the head-tail segment
    vec4 tail = projectionMatrix * (mvPosition + vec4(mat3(modelViewMatrix) * aStreak, 0.0));
    if (tail.w > 0.001 && gl_Position.w > 0.001) {
      vec2 h = gl_Position.xy / gl_Position.w;
      vec2 d = (h - tail.xy / tail.w) * 0.5 * uViewport.xy;
      float dl = length(d);
      if (dl > 0.5) {
        float len = min(dl, uViewport.z - size);
        vec2 dir = d / dl;
        vDir = vec2(dir.x, -dir.y);    // gl_PointCoord has y pointing down
        gl_Position.xy = (h - dir * len / uViewport.xy) * gl_Position.w;
        seg = len;
        total = size + len;
      }
    }
  }
  gl_PointSize = min(total, uViewport.z);
  vShape = vec4(aShape, seg / total, size / total);
  vColor = vec4(aColor.rgb, alpha);
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform sampler2D uSoft;
varying vec4 vColor;
varying vec4 vShape;
varying vec2 vDir;
#include <fog_pars_fragment>
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float shape = vShape.x;
  float a, hot;
  if (shape < 0.5) {                    // soft round
    a = texture2D(uSoft, gl_PointCoord).a;
    hot = a * a;
  } else if (shape < 1.5) {             // crisp pixel square
    a = 1.0; hot = 0.45;
  } else if (shape < 2.5) {             // velocity streak, brightest at the head
    float along = dot(q, vDir), across = dot(q, vec2(-vDir.y, vDir.x));
    float hl = vShape.z, r = max(vShape.w, 1e-3);
    float dd = length(vec2(max(abs(along) - hl, 0.0), across)) / r;
    float head = clamp(along / max(hl, 1e-3) * 0.5 + 0.5, 0.0, 1.0);
    a = (1.0 - smoothstep(0.25, 1.0, dd)) * mix(0.2, 1.0, head);
    hot = a * head;
  } else if (shape < 3.5) {             // pixel plus on a 5x5 grid
    vec2 c = floor(gl_PointCoord * 5.0);
    if (c.x != 2.0 && c.y != 2.0) discard;
    a = 1.0;
    hot = (c.x == 2.0 && c.y == 2.0) ? 1.0 : 0.25;
  } else {                              // tumbling glass shard: kite with a bright rim
    float cs = cos(vShape.y), sn = sin(vShape.y);
    vec2 r = vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y);
    float w = 0.22 + 0.26 * abs(sin(vShape.y * 1.7));
    float d = abs(r.x) / w + abs(r.y + 0.15 * sign(r.x) * r.y);
    if (d > 1.0) discard;
    a = d > 0.7 ? 1.0 : 0.45;
    hot = d > 0.7 ? 0.9 : (r.x > 0.0 ? 0.35 : 0.0);
  }
  float alpha = a * vColor.a;
  if (alpha < 0.002) discard;
  vec3 col = vColor.rgb * (1.0 + hot * 0.7);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogF = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
  #else
    float fogF = 0.0;
  #endif
  #ifdef ADDITIVE
    gl_FragColor = vec4(col * alpha * (1.0 - fogF), 1.0);
  #else
    #ifdef USE_FOG
      col = mix(col, fogColor, fogF);
    #endif
    gl_FragColor = vec4(col, alpha);
  #endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

let softTex = null;
/** Soft round sprite (white, radial alpha) drawn on a canvas; shared by every pool. */
function softTexture() {
  if (softTex) return softTex;
  const s = 64;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.86)');
  grad.addColorStop(0.42, 'rgba(255,255,255,0.38)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  softTex = new THREE.CanvasTexture(c);
  softTex.colorSpace = THREE.NoColorSpace;
  softTex.needsUpdate = true;
  return softTex;
}

const maxPointSize = new WeakMap();
function pointLimit(renderer) {
  let v = maxPointSize.get(renderer);
  if (v === undefined) {
    const gl = renderer.getContext();
    const r = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    v = r && r[1] ? Math.min(r[1], 1024) : 256;
    maxPointSize.set(renderer, v);
  }
  return v;
}

const _vp = new THREE.Vector4();

class Pool {
  constructor(scene, capacity, blend) {
    this.cap = capacity;
    this.count = 0;
    this.sim = new Float32Array(capacity * S);
    this.gpu = new Float32Array(capacity * G);
    const ib = new THREE.InterleavedBuffer(this.gpu, G);
    ib.setUsage(THREE.DynamicDrawUsage);
    this.ib = ib;
    this.range = { start: 0, count: 0 };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(ib, 4, 3));
    geo.setAttribute('aSize', new THREE.InterleavedBufferAttribute(ib, 1, 7));
    geo.setAttribute('aStreak', new THREE.InterleavedBufferAttribute(ib, 3, 8));
    geo.setAttribute('aShape', new THREE.InterleavedBufferAttribute(ib, 2, 11));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uViewport: { value: new THREE.Vector3(1, 1, 256) } }]);
    uniforms.uSoft = { value: softTexture() };
    const additive = blend === ADD;
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: additive ? { ADDITIVE: 1 } : {},
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: true,
      blending: additive ? THREE.CustomBlending : THREE.NormalBlending,
    });
    if (additive) {
      mat.blendEquation = THREE.AddEquation;
      mat.blendSrc = THREE.OneFactor;
      mat.blendDst = THREE.OneFactor;
      mat.blendSrcAlpha = THREE.ZeroFactor;
      mat.blendDstAlpha = THREE.OneFactor;
    }
    this.mat = mat;
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = additive ? 5 : 4;
    pts.visible = false;
    pts.onBeforeRender = (renderer) => {
      renderer.getCurrentViewport(_vp);
      uniforms.uViewport.value.set(_vp.z, _vp.w, pointLimit(renderer));
    };
    this.points = pts;
    scene.add(pts);
  }

  /** Reserve a record; returns its float offset or -1 when the pool is full. */
  alloc() {
    if (this.count >= this.cap) return -1;
    return this.count++ * S;
  }

  update(dt) {
    const sim = this.sim, gpu = this.gpu;
    let n = this.count;
    let i = 0;
    while (i < n) {
      const o = i * S;
      const age = sim[o + AGE] + dt;
      const life = sim[o + LIFE];
      if (age >= life) {
        n--;
        if (i !== n) sim.copyWithin(o, n * S, n * S + S);
        continue;
      }
      sim[o + AGE] = age;
      let vx = sim[o + VX], vy = sim[o + VY], vz = sim[o + VZ];
      const frozen = sim[o + FROZEN] > 0;
      if (!frozen) vy -= sim[o + GRAV] * dt;
      const dr = sim[o + DRAG];
      if (dr > 0) {
        const f = 1 / (1 + dr * dt);
        vx *= f; vy *= f; vz *= f;
      }
      const jit = sim[o + JIT];
      if (jit > 0 && Math.random() < dt * 30) {
        // lightning kink: swing the velocity to a new random direction, keeping most of the speed
        const sp = Math.sqrt(vx * vx + vy * vy + vz * vz) * jit;
        vx = vx * 0.35 + (Math.random() - 0.5) * sp * 1.6;
        vy = vy * 0.35 + (Math.random() - 0.5) * sp * 1.6;
        vz = vz * 0.35 + (Math.random() - 0.5) * sp * 1.6;
      }
      let x = sim[o + PX], y = sim[o + PY], z = sim[o + PZ];
      if (!frozen) { x += vx * dt; y += vy * dt; z += vz * dt; }
      const wob = sim[o + WOB];
      const ph = sim[o + PHASE];
      if (wob > 0) {
        x += Math.sin(age * 1.3 + ph) * wob * dt;
        z += Math.cos(age * 1.1 + ph * 1.7) * wob * dt;
        y += Math.sin(age * 0.9 + ph * 2.3) * wob * 0.4 * dt;
      }
      const bounce = sim[o + BOUNCE];
      if (bounce > 0 && y < sim[o + FLOOR] && vy < 0) {
        y = sim[o + FLOOR];
        vy = -vy * bounce;
        vx *= 0.6; vz *= 0.6;
      }
      sim[o + PX] = x; sim[o + PY] = y; sim[o + PZ] = z;
      sim[o + VX] = vx; sim[o + VY] = vy; sim[o + VZ] = vz;
      const rot = sim[o + ROT] + sim[o + SPIN] * dt;
      sim[o + ROT] = rot;

      const k = age / life;
      const fin = sim[o + FIN], fout = sim[o + FOUT];
      let a = sim[o + ALPHA];
      if (fin > 0 && k < fin) { const t = k / fin; a *= t * t * (3 - 2 * t); }
      if (fout > 0 && k > 1 - fout) { const t = (1 - k) / fout; a *= t * t * (3 - 2 * t); }
      const fl = sim[o + FLICK];
      if (fl > 0) {
        const s = 0.5 + 0.5 * Math.sin(age * (5 + 9 * ((ph * 7.31) % 1)) + ph * 6.28);
        a *= 1 - fl + fl * (0.3 + 1.6 * s * s * s * s);
      }
      const ck = k < 1 ? k : 1;
      const grow = sim[o + GROW];
      const size = sim[o + S0] * (1 + (grow - 1) * (1 - (1 - ck) * (1 - ck)));
      const strk = sim[o + STRK];

      const g = i * G;
      gpu[g] = x; gpu[g + 1] = y; gpu[g + 2] = z;
      gpu[g + 3] = sim[o + R0] + (sim[o + R1] - sim[o + R0]) * ck;
      gpu[g + 4] = sim[o + G0] + (sim[o + G1] - sim[o + G0]) * ck;
      gpu[g + 5] = sim[o + B0] + (sim[o + B1] - sim[o + B0]) * ck;
      gpu[g + 6] = a;
      gpu[g + 7] = size;
      gpu[g + 8] = -vx * strk; gpu[g + 9] = -vy * strk; gpu[g + 10] = -vz * strk;
      gpu[g + 11] = sim[o + SHAPE];
      gpu[g + 12] = rot;
      i++;
    }
    this.count = n;
    this.geo.setDrawRange(0, n);
    this.points.visible = n > 0;
    if (n > 0) {
      this.range.count = n * G;
      this.ib.updateRanges.length = 0;
      this.ib.updateRanges.push(this.range);
      this.ib.needsUpdate = true;
    }
  }

  dispose() {
    if (this.points.parent) this.points.parent.remove(this.points);
    this.geo.dispose();
    this.mat.dispose();
  }
}

// ---------------------------------------------------------------- spawning

const rnd = (r) => r[0] + Math.random() * (r[1] - r[0]);
const _d = { x: 0, y: 1, z: 0 };

/** Random unit vector inside a cone of half-angle `c` around (ax, ay, az) (normalized). Writes _d. */
function coneDir(ax, ay, az, c) {
  const cosT = 1 - Math.random() * (1 - Math.cos(c));
  const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
  const phi = Math.random() * Math.PI * 2;
  // orthonormal basis around the axis
  let ux, uy, uz;
  if (Math.abs(ay) < 0.9) { ux = az; uy = 0; uz = -ax; } else { ux = 0; uy = -az; uz = ay; }
  const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
  ux /= ul; uy /= ul; uz /= ul;
  const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
  const cp = Math.cos(phi) * sinT, sp = Math.sin(phi) * sinT;
  _d.x = ax * cosT + ux * cp + vx * sp;
  _d.y = ay * cosT + uy * cp + vy * sp;
  _d.z = az * cosT + uz * cp + vz * sp;
}

function sphereDir() {
  const z = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  _d.x = r * Math.cos(t); _d.y = z; _d.z = r * Math.sin(t);
}

/** Resolved per-call options (reused objects, so emit/emitters allocate nothing per particle). */
function makeCtx() {
  return { color: new THREE.Color(), hasColor: false, spread: -1, speed: 1, size: 1, life: 1, dir: new THREE.Vector3(), hasDir: false, floor: 0 };
}

function resolveCtx(ctx, opts) {
  ctx.hasColor = opts.color != null;
  if (ctx.hasColor) ctx.color.set(opts.color);
  ctx.spread = opts.spread ?? -1;
  ctx.speed = opts.speed ?? 1;
  ctx.size = opts.size ?? 1;
  ctx.life = opts.life ?? 1;
  ctx.floor = opts.floor ?? 0;
  const d = opts.direction;
  ctx.hasDir = d != null;
  if (ctx.hasDir) {
    if (Array.isArray(d)) ctx.dir.set(d[0], d[1], d[2]);
    else ctx.dir.copy(d);
    if (ctx.dir.lengthSq() < 1e-8) ctx.hasDir = false;
    else ctx.dir.normalize();
  }
  return ctx;
}

// ---------------------------------------------------------------- Particles

export class Particles {
  constructor(scene, { max = 4000 } = {}) {
    const addCap = Math.max(16, Math.round(max * 0.75));
    this.pools = [new Pool(scene, addCap, ADD), new Pool(scene, Math.max(16, max - addCap), NORMAL)];
    this.emitters = [];
    this._ctx = makeCtx();
  }

  /** Number of live particles (both pools). */
  get count() { return this.pools[0].count + this.pools[1].count; }

  /**
   * One-shot burst. opts: count (first layer; other layers scale with it), color (replaces the
   * start colours), spread (spawn radius, world units), speed / size / life (multipliers),
   * direction (Vector3 or [x,y,z]: aims directional layers / biases bursts), floor (bounce height).
   */
  emit(presetName, position, opts = {}) {
    const p = PRESETS[presetName];
    if (!p) return;
    const ctx = resolveCtx(this._ctx, opts);
    const px = Array.isArray(position) ? position[0] : position.x;
    const py = Array.isArray(position) ? position[1] : position.y;
    const pz = Array.isArray(position) ? position[2] : position.z;
    const n0 = p.layers[0].n;
    const scale = opts.count != null ? opts.count / n0 : 1;
    for (let li = 0; li < p.layers.length; li++) {
      const L = p.layers[li];
      const n = li === 0 ? Math.round(n0 * scale) : Math.round(L.n * scale);
      for (let k = 0; k < n; k++) this._spawn(L, px, py, pz, ctx);
    }
  }

  /**
   * Continuous emitter. Particles spawn uniformly inside the `area` box (full extents) centred on
   * `position`, `rate` per second. Extra: burst (> 0: spawn whole bursts of that many particles at
   * random intervals averaging `rate` per second, e.g. a sparking conduit), plus any emit() opts.
   * Returns { position, area, rate, active, burst, remove() }.
   */
  addEmitter(presetName, { position, area = [1, 1, 1], rate = 10, color, burst = 0, ...opts } = {}) {
    const p = PRESETS[presetName];
    const em = {
      preset: presetName,
      position: Array.isArray(position) ? new THREE.Vector3().fromArray(position) : position ? position.clone() : new THREE.Vector3(),
      area: Array.isArray(area) ? area.slice() : [area, area, area],
      rate,
      active: true,
      burst,
      _p: p,
      _acc: Math.random(),
      _next: burst > 0 ? Math.random() / Math.max(rate, 1e-3) : 0,
      _ctx: resolveCtx(makeCtx(), { color, ...opts }),
      remove: () => {
        const i = this.emitters.indexOf(em);
        if (i >= 0) this.emitters.splice(i, 1);
      },
    };
    if (p) this.emitters.push(em);
    return em;
  }

  update(dt) {
    if (!(dt > 0)) return;
    for (let e = 0; e < this.emitters.length; e++) {
      const em = this.emitters[e];
      if (!em.active || em.rate <= 0) continue;
      const p = em._p;
      if (em.burst > 0) {
        em._next -= dt;
        while (em._next <= 0) {
          em._next += -Math.log(1 - Math.random()) / em.rate;
          const x = em.position.x + (Math.random() - 0.5) * em.area[0];
          const y = em.position.y + (Math.random() - 0.5) * em.area[1];
          const z = em.position.z + (Math.random() - 0.5) * em.area[2];
          const scale = em.burst / p.layers[0].n;
          for (let li = 0; li < p.layers.length; li++) {
            const L = p.layers[li];
            const n = Math.round(L.n * scale);
            for (let k = 0; k < n; k++) this._spawn(L, x, y, z, em._ctx);
          }
        }
      } else {
        em._acc += em.rate * dt;
        while (em._acc >= 1) {
          em._acc -= 1;
          // pick a layer weighted by its burst count
          const r = Math.random() * p.total;
          let li = 0;
          while (li < p.cum.length - 1 && r >= p.cum[li]) li++;
          this._spawn(p.layers[li],
            em.position.x + (Math.random() - 0.5) * em.area[0],
            em.position.y + (Math.random() - 0.5) * em.area[1],
            em.position.z + (Math.random() - 0.5) * em.area[2], em._ctx);
        }
      }
    }
    this.pools[0].update(dt);
    this.pools[1].update(dt);
  }

  _spawn(L, x, y, z, ctx) {
    if (L.bolt) {
      this._spawnBolt(L, x, y, z, ctx);
      return;
    }
    const o = this._spawnOne(L, x, y, z, ctx);
    if (o >= 0) this.pools[L.blend].sim[o + FROZEN] = 0;
  }

  /** Jagged lightning: a chain of static streak segments leaving (x, y, z) in a random direction. */
  _spawnBolt(L, x, y, z, ctx) {
    const pool = this.pools[L.blend];
    if (ctx.hasDir) coneDir(ctx.dir.x, ctx.dir.y, ctx.dir.z, 1.2);
    else sphereDir();
    let dx = _d.x, dy = _d.y, dz = _d.z;
    const segs = L.segs;
    const step = (rnd(L.boltLen) * ctx.size) / segs;
    const life = rnd(L.life) * ctx.life;
    let px = x, py = y, pz = z;
    for (let k = 0; k < segs; k++) {
      // kink the direction for every segment
      coneDir(dx, dy, dz, 0.75);
      dx = _d.x; dy = _d.y; dz = _d.z;
      const nx = px + dx * step, ny = py + dy * step, nz = pz + dz * step;
      const o = this._spawnOne(L, nx, ny, nz, ctx);
      if (o < 0) return;
      const sim = pool.sim;
      sim[o + PX] = nx; sim[o + PY] = ny; sim[o + PZ] = nz;
      // static segment: velocity holds the head-to-tail vector, streak time 1
      sim[o + VX] = nx - px; sim[o + VY] = ny - py; sim[o + VZ] = nz - pz;
      sim[o + STRK] = 1;
      sim[o + LIFE] = life * (1 - k * 0.06);
      sim[o + FROZEN] = 1;
      px = nx; py = ny; pz = nz;
    }
  }

  _spawnOne(L, x, y, z, ctx) {
    const pool = this.pools[L.blend];
    const o = pool.alloc();
    if (o < 0) return -1;
    const sim = pool.sim;
    const spread = ctx.spread >= 0 ? ctx.spread : L.spread;

    // direction of travel
    const dir = L.dir;
    if (dir === 'implode') {
      sphereDir();
    } else if (ctx.hasDir) {
      coneDir(ctx.dir.x, ctx.dir.y, ctx.dir.z, dir === 'sphere' ? 1.0 : L.cone);
    } else if (dir === 'up') {
      coneDir(0, 1, 0, L.cone);
    } else if (dir === 'down') {
      coneDir(0, -1, 0, L.cone);
    } else if (dir === 'ring') {
      const a = Math.random() * Math.PI * 2;
      _d.x = Math.cos(a); _d.y = 0.15; _d.z = Math.sin(a);
    } else {
      sphereDir();
    }
    const dx = _d.x, dy = _d.y, dz = _d.z;

    // spawn offset
    let ox = 0, oy = 0, oz = 0;
    if (spread > 0) {
      if (L.spawn === 'shell' || dir === 'implode') {
        ox = dx * spread; oy = dy * spread; oz = dz * spread;
      } else if (L.spawn === 'disc') {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
        ox = Math.cos(a) * r; oz = Math.sin(a) * r;
      } else {
        const a = Math.random() * Math.PI * 2, r = Math.cbrt(Math.random()) * spread;
        const u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u);
        ox = s * Math.cos(a) * r; oy = u * r; oz = s * Math.sin(a) * r;
      }
    }
    sim[o + PX] = x + ox; sim[o + PY] = y + oy; sim[o + PZ] = z + oz;

    const life = rnd(L.life) * ctx.life;
    let sp = rnd(L.speed) * ctx.speed;
    if (dir === 'implode') {
      // travel inward so particles arrive at the centre around the end of their life
      sp = Math.max(sp, spread / (life * 0.9));
      sim[o + VX] = -dx * sp; sim[o + VY] = -dy * sp; sim[o + VZ] = -dz * sp;
    } else {
      sim[o + VX] = dx * sp; sim[o + VY] = dy * sp + L.lift * ctx.speed; sim[o + VZ] = dz * sp;
    }
    sim[o + AGE] = 0;
    sim[o + LIFE] = Math.max(0.02, life);
    sim[o + S0] = rnd(L.size) * ctx.size;
    sim[o + GROW] = L.grow;

    const intensity = L.intensity;
    let r0, g0, b0;
    if (ctx.hasColor) {
      r0 = ctx.color.r; g0 = ctx.color.g; b0 = ctx.color.b;
    } else {
      const c = L.colorsLin[(Math.random() * L.colorsLin.length) | 0];
      r0 = c[0]; g0 = c[1]; b0 = c[2];
    }
    sim[o + R0] = r0 * intensity; sim[o + G0] = g0 * intensity; sim[o + B0] = b0 * intensity;
    if (ctx.hasColor || !L.endLin) {
      // fade toward a darker, slightly cooler version of the start colour
      sim[o + R1] = r0 * intensity * 0.45; sim[o + G1] = g0 * intensity * 0.45; sim[o + B1] = b0 * intensity * 0.55;
    } else {
      sim[o + R1] = L.endLin[0] * intensity; sim[o + G1] = L.endLin[1] * intensity; sim[o + B1] = L.endLin[2] * intensity;
    }
    sim[o + ALPHA] = L.alpha;
    sim[o + FIN] = L.fade[0];
    sim[o + FOUT] = L.fade[1];
    sim[o + GRAV] = L.gravity;
    sim[o + DRAG] = L.drag;
    sim[o + WOB] = L.wobble;
    sim[o + PHASE] = Math.random() * 100;
    sim[o + FLICK] = L.flicker;
    sim[o + SHAPE] = L.shape;
    sim[o + ROT] = Math.random() * Math.PI * 2;
    sim[o + SPIN] = L.spin ? (Math.random() * 2 - 1) * L.spin : 0;
    sim[o + STRK] = L.streak;
    sim[o + BOUNCE] = L.bounce;
    sim[o + JIT] = L.jitter;
    sim[o + FLOOR] = ctx.floor;
    return o;
  }

  /** Kill every live particle (emitters stay). */
  clear() {
    this.pools[0].count = 0;
    this.pools[1].count = 0;
    this.pools[0].update(0.0001);
    this.pools[1].update(0.0001);
  }

  dispose() {
    this.emitters.length = 0;
    this.pools[0].dispose();
    this.pools[1].dispose();
  }
}

export const PARTICLE_PRESETS = Object.keys(PRESETS);
