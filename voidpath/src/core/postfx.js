// VOIDPATH post-processing: the passes that turn a lit 3D diorama into the "2D-HD" look.
//
//   RenderPass -> ScaledBloomPass -> TiltShiftPass (H, V) -> OutputPass (ACES + sRGB)
//     -> GradePass (display space) -> OverlayPass (flash / fade / iris / glass shatter)
//
// The engine (core/engine.js) builds the chain; this module owns the shaders and the
// shatter-transition geometry. Everything here is allocation-free per frame.

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { makeRng, clamp, smoothstep, ease } from './util.js';

// ---------------------------------------------------------------- FX params

const deepFreeze = (o) => {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
  return Object.freeze(o);
};

export const DEFAULT_FX = deepFreeze({
  tiltShift: { enabled: true, focusY: 0.5, band: 0.14, falloff: 0.30, maxBlur: 1.0 },
  bloom: { enabled: true, strength: 0.85, radius: 0.55, threshold: 0.78 },
  grade: {
    enabled: true, exposure: 1.0, contrast: 1.08, saturation: 1.08, vignette: 0.42, vignetteSoftness: 0.55,
    shadowTint: [0.92, 0.97, 1.08], highlightTint: [1.06, 1.0, 0.92], aberration: 0.0015, grain: 0.035,
  },
  fog: null,
});

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep copy of an FX params object (arrays copied, not shared). */
export function cloneFx(src) {
  if (Array.isArray(src)) return src.slice();
  if (!isPlainObject(src)) return src;
  const out = {};
  for (const k of Object.keys(src)) out[k] = cloneFx(src[k]);
  return out;
}

/** Deep-merge `partial` into `target` in place. Arrays and non-plain values replace. */
export function mergeFx(target, partial) {
  if (!isPlainObject(partial)) return target;
  for (const k of Object.keys(partial)) {
    const v = partial[k];
    if (isPlainObject(v) && isPlainObject(target[k])) mergeFx(target[k], v);
    else target[k] = cloneFx(v);
  }
  return target;
}

// Shared full-screen vertex shader (FullScreenQuad draws one oversized triangle, uv 0..1 on screen).
const FS_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// ---------------------------------------------------------------- bloom

/** UnrealBloomPass whose internal resolution can be scaled down (0.5 => quarter-res mips on 'low'). */
export class ScaledBloomPass extends UnrealBloomPass {
  constructor(resolution, strength, radius, threshold, resScale = 1) {
    super(resolution, strength, radius, threshold);
    this.resScale = resScale;
    this._fullW = resolution.x;
    this._fullH = resolution.y;
  }

  setSize(width, height) {
    this._fullW = width;
    this._fullH = height;
    // UnrealBloomPass already starts its mip chain at half of what it is given.
    super.setSize(Math.max(2, Math.round(width * this.resScale)), Math.max(2, Math.round(height * this.resScale)));
  }

  setResScale(s) {
    if (s === this.resScale) return;
    this.resScale = s;
    this.setSize(this._fullW, this._fullH);
  }
}

// ---------------------------------------------------------------- tilt shift

/**
 * Discrete Gaussian over +-2*pairs texels collapsed into `pairs` bilinear taps per side
 * (the linear-sampling trick: two adjacent texels fetched with one filtered read).
 */
function linearGaussianKernel(pairs) {
  const n = pairs * 2;
  const sigma = n / 3;
  const w = [];
  for (let i = 0; i <= n; i++) w.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  let total = w[0];
  for (let i = 1; i <= n; i++) total += 2 * w[i];
  const offsets = [], weights = [];
  for (let p = 0; p < pairs; p++) {
    const a = 2 * p + 1, b = 2 * p + 2;
    const ws = w[a] + w[b];
    offsets.push((a * w[a] + b * w[b]) / ws);
    weights.push(ws / total);
  }
  return { sigma, center: w[0] / total, offsets, weights };
}

const TILT_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform vec2 uDir;
uniform float uFocusY;
uniform float uBand;
uniform float uFalloff;
uniform float uSigma;       // blur sigma in texels where the blur is at full strength
uniform float uBaseSigma;   // sigma the kernel below was built for
uniform float uCenter;
uniform float uOffsets[PAIRS];
uniform float uWeights[PAIRS];
varying vec2 vUv;

// Interleaved gradient noise: decorrelates the sparse taps of very wide blurs (no ghost copies).
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

void main() {
  float k = smoothstep(uBand, uBand + uFalloff, abs(vUv.y - uFocusY));
  float scale = uSigma * k / uBaseSigma;
  vec4 c = texture2D(tDiffuse, vUv);
  if (scale < 0.03) { gl_FragColor = c; return; }
  // Above ~1.3x the taps are more than two texels apart: jitter them a little.
  float jitter = 1.0 + (ign(gl_FragCoord.xy) - 0.5) * 0.45 * smoothstep(1.3, 2.6, scale);
  vec2 stepUv = uDir * uTexel * scale * jitter;
  vec4 sum = c * uCenter;
  for (int i = 0; i < PAIRS; i++) {
    vec2 o = stepUv * uOffsets[i];
    sum += (texture2D(tDiffuse, vUv + o) + texture2D(tDiffuse, vUv - o)) * uWeights[i];
  }
  gl_FragColor = sum;
}`;

/**
 * Octopath-style tilt-shift: separable Gaussian whose radius grows with the distance from a
 * horizontal focus band. Radius is specified at 1080p and scaled with the render height so the
 * look is identical at any resolution. Two internal draws (H into writeBuffer, V back into
 * readBuffer), so the composer does not swap.
 */
export class TiltShiftPass extends Pass {
  constructor({ taps = 13 } = {}) {
    super();
    this.needsSwap = false;
    this.focusY = 0.5;
    this.band = 0.14;
    this.falloff = 0.30;
    this.maxBlur = 1.0;
    /** Blur sigma in pixels at 1080p for maxBlur = 1. */
    this.pxAt1080 = 7.0;
    this.width = 1;
    this.height = 1;
    this.material = new THREE.ShaderMaterial({
      name: 'VP.TiltShift',
      uniforms: {
        tDiffuse: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uDir: { value: new THREE.Vector2(1, 0) },
        uFocusY: { value: 0.5 },
        uBand: { value: 0.14 },
        uFalloff: { value: 0.3 },
        uSigma: { value: 7 },
        uBaseSigma: { value: 4 },
        uCenter: { value: 0 },
        uOffsets: { value: [] },
        uWeights: { value: [] },
      },
      defines: { PAIRS: 6 },
      vertexShader: FS_VERT,
      fragmentShader: TILT_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
    this.taps = 0;
    this.setTaps(taps);
  }

  /** Odd tap count per direction (9 / 11 / 13). */
  setTaps(taps) {
    const pairs = Math.max(2, Math.round((taps - 1) / 2));
    if (pairs * 2 + 1 === this.taps) return;
    this.taps = pairs * 2 + 1;
    const k = linearGaussianKernel(pairs);
    const u = this.material.uniforms;
    u.uBaseSigma.value = k.sigma;
    u.uCenter.value = k.center;
    u.uOffsets.value = k.offsets;
    u.uWeights.value = k.weights;
    this.material.defines.PAIRS = pairs;
    this.material.needsUpdate = true;
  }

  setParams({ focusY, band, falloff, maxBlur }) {
    if (focusY != null) this.focusY = focusY;
    if (band != null) this.band = band;
    if (falloff != null) this.falloff = falloff;
    if (maxBlur != null) this.maxBlur = maxBlur;
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.material.uniforms.uTexel.value.set(1 / width, 1 / height);
  }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.uFocusY.value = this.focusY;
    u.uBand.value = this.band;
    u.uFalloff.value = Math.max(1e-3, this.falloff);
    u.uSigma.value = this.maxBlur * this.pxAt1080 * (this.height / 1080);

    u.tDiffuse.value = readBuffer.texture;
    u.uDir.value.set(1, 0);
    renderer.setRenderTarget(writeBuffer);
    this.fsQuad.render(renderer);

    u.tDiffuse.value = writeBuffer.texture;
    u.uDir.value.set(0, 1);
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

// ---------------------------------------------------------------- grade

const GRADE_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uPixelRatio;
uniform float uContrast;
uniform float uSaturation;
uniform float uVignette;
uniform float uVignetteSoft;
uniform float uAberration;
uniform float uGrain;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
varying vec2 vUv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 cc = vUv - 0.5;
  float r2 = dot(cc, cc) * 2.0;               // 0 at the centre, 1 in the corners
  vec3 col;
  if (uAberration > 0.0) {
    // Lateral chromatic aberration: grows with r^2, so the centre stays perfectly sharp.
    vec2 off = cc * r2 * uAberration * 2.0;
    col.r = texture2D(tDiffuse, vUv + off).r;
    col.g = texture2D(tDiffuse, vUv).g;
    col.b = texture2D(tDiffuse, vUv - off).b;
  } else {
    col = texture2D(tDiffuse, vUv).rgb;
  }

  // Contrast around a slightly-low pivot (dark sci-fi interiors should not crush).
  col = max((col - 0.42) * uContrast + 0.42, 0.0);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(l), col, uSaturation), 0.0);

  // Split toning: cool shadows, warm highlights.
  col *= mix(uShadowTint, uHighlightTint, smoothstep(0.04, 0.8, l));

  // Vignette (elliptical, follows the screen shape).
  float d = sqrt(r2);
  float inner = 1.0 - uVignetteSoft * 1.2;
  col *= 1.0 - uVignette * smoothstep(inner, 1.18, d);

  // Film grain: 1 CSS pixel cells, re-rolled at 24 fps, triangular distribution,
  // weaker in highlights so bright UI-like areas stay clean.
  vec2 gp = floor(gl_FragCoord.xy / uPixelRatio);
  float seed = floor(uTime * 24.0);
  float n = hash12(gp + seed * vec2(37.0, 17.0)) + hash12(gp.yx + seed * vec2(11.0, 53.0)) - 1.0;
  col += n * uGrain * (1.0 - 0.65 * clamp(l, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}`;

/** Display-space grade: contrast, saturation, split toning, vignette, edge aberration, grain. */
export class GradePass extends Pass {
  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      name: 'VP.Grade',
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uContrast: { value: 1.08 },
        uSaturation: { value: 1.08 },
        uVignette: { value: 0.42 },
        uVignetteSoft: { value: 0.55 },
        uAberration: { value: 0.0015 },
        uGrain: { value: 0.035 },
        uShadowTint: { value: new THREE.Vector3(0.92, 0.97, 1.08) },
        uHighlightTint: { value: new THREE.Vector3(1.06, 1.0, 0.92) },
      },
      vertexShader: FS_VERT,
      fragmentShader: GRADE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setParams(g) {
    const u = this.material.uniforms;
    if (g.contrast != null) u.uContrast.value = g.contrast;
    if (g.saturation != null) u.uSaturation.value = g.saturation;
    if (g.vignette != null) u.uVignette.value = g.vignette;
    if (g.vignetteSoftness != null) u.uVignetteSoft.value = clamp(g.vignetteSoftness, 0, 0.8);
    if (g.aberration != null) u.uAberration.value = g.aberration;
    if (g.grain != null) u.uGrain.value = g.grain;
    if (g.shadowTint) u.uShadowTint.value.fromArray(g.shadowTint);
    if (g.highlightTint) u.uHighlightTint.value.fromArray(g.highlightTint);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

// ---------------------------------------------------------------- overlay (flash, fade, iris)

const OVERLAY_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec3 uFlashColor;
uniform float uFlash;
uniform vec3 uCoverColor;
uniform float uCover;
uniform float uIris;        // radius in screen-height units; < 0 disables the iris
uniform vec2 uIrisCenter;   // uv
uniform vec3 uIrisColor;
uniform vec3 uRingColor;
uniform float uAspect;
uniform float uPx;          // one pixel in screen-height units
varying vec2 vUv;
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  col += uFlashColor * uFlash;
  if (uIris >= 0.0) {
    float d = length((vUv - uIrisCenter) * vec2(uAspect, 1.0));
    float outside = smoothstep(uIris - uPx, uIris + uPx, d);
    col = mix(col, uIrisColor, outside);
    // thin glowing lens ring riding the edge of the iris
    float ring = exp(-pow((d - uIris) / (uPx * 3.0 + 0.004), 2.0));
    col += uRingColor * ring * step(0.002, uIris);
  }
  col = mix(col, uCoverColor, uCover);
  gl_FragColor = vec4(col, 1.0);
}`;

const COPY_MATERIAL = () => new THREE.ShaderMaterial({
  name: 'VP.Copy',
  uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms),
  vertexShader: CopyShader.vertexShader,
  fragmentShader: CopyShader.fragmentShader,
  depthTest: false,
  depthWrite: false,
});

/**
 * Final pass: additive flash, fade-to-color cover and iris wipe. Also hosts the shatter
 * transition: in 'capture' mode it copies the finished frame into the shatter's frozen texture
 * and draws the shards instead of the frame. The engine keeps it disabled when idle.
 */
export class OverlayPass extends Pass {
  constructor() {
    super();
    this.mode = 'normal'; // 'normal' | 'capture'
    this.material = new THREE.ShaderMaterial({
      name: 'VP.Overlay',
      uniforms: {
        tDiffuse: { value: null },
        uFlashColor: { value: new THREE.Color(1, 1, 1) },
        uFlash: { value: 0 },
        uCoverColor: { value: new THREE.Color(0, 0, 0) },
        uCover: { value: 0 },
        uIris: { value: -1 },
        uIrisCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uIrisColor: { value: new THREE.Color(0, 0, 0) },
        uRingColor: { value: new THREE.Color(0, 0, 0) },
        uAspect: { value: 1 },
        uPx: { value: 0.001 },
      },
      vertexShader: FS_VERT,
      fragmentShader: OVERLAY_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
    this.shatter = new ShatterEffect();
  }

  get uniforms() { return this.material.uniforms; }

  /** True when this pass changes the image at all (the engine disables it otherwise). */
  get active() {
    const u = this.material.uniforms;
    return this.mode !== 'normal' || u.uFlash.value > 0.001 || u.uCover.value > 0.001 || u.uIris.value >= 0;
  }

  setSize(width, height) {
    const u = this.material.uniforms;
    u.uAspect.value = width / height;
    u.uPx.value = 1 / height;
  }

  render(renderer, writeBuffer, readBuffer) {
    if (this.mode === 'capture') {
      this.shatter.capture(renderer, readBuffer.texture);
      this.shatter.render(renderer, this.renderToScreen ? null : writeBuffer);
      return;
    }
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
    this.shatter.dispose();
  }
}

// ---------------------------------------------------------------- shatter transition

/**
 * Radial glass-crack pattern around an impact point: jittered spokes x jittered rings, so
 * neighbouring shards share vertices (the crack network is watertight before it flies apart).
 * Plane coordinates: x in [-aspect, aspect], y in [-1, 1] (screen-height units, +y up).
 * Each polygon is fan-triangulated around its centroid; aEdge = 1 at the centroid, 0 on the
 * outline, which the fragment shader turns into constant-width crack lines.
 */
export function buildShatterGeometry(aspect, { seed = 1, impact = [0, 0] } = {}) {
  const rand = makeRng(seed);
  const [ix, iy] = impact;
  let reach = 0;
  for (const [cx, cy] of [[-aspect, -1], [aspect, -1], [-aspect, 1], [aspect, 1]]) reach = Math.max(reach, Math.hypot(cx - ix, cy - iy));

  const spokes = 11 + rand.int(0, 2);
  const ringFrac = [0.1, 0.25, 0.46, 0.72, 1.4];
  const step = (Math.PI * 2) / spokes;
  const base = rand() * Math.PI * 2;
  const spokeAng = [];
  for (let i = 0; i < spokes; i++) spokeAng.push(base + (i + (rand() - 0.5) * 0.5) * step);

  const V = ringFrac.map((f, j) => spokeAng.map((a) => {
    const last = j === ringFrac.length - 1;
    const ang = a + (last ? 0 : (rand() - 0.5) * 0.36 * step);
    const r = reach * f * (last ? 1 : 1 + (rand() - 0.5) * 0.32);
    return [ix + Math.cos(ang) * r, iy + Math.sin(ang) * r];
  }));

  const polys = [];
  for (let i = 0; i < spokes; i++) polys.push([[ix, iy], V[0][i], V[0][(i + 1) % spokes]]);
  for (let j = 0; j < ringFrac.length - 1; j++) {
    for (let i = 0; i < spokes; i++) {
      const i2 = (i + 1) % spokes;
      const a = V[j][i], b = V[j + 1][i], c = V[j + 1][i2], d = V[j][i2];
      if (j >= 1 && rand() < 0.62) {
        if (rand() < 0.5) polys.push([a, b, c], [a, c, d]);
        else polys.push([a, b, d], [b, c, d]);
      } else polys.push([a, b, c, d]);
    }
  }

  // Drop polygons entirely off-screen.
  const visible = polys.filter((p) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return x1 > -aspect && x0 < aspect && y1 > -1 && y0 < 1;
  });

  // Shards are drawn without depth testing (near-coplanar panes z-fight along shared edges), so
  // order them far-to-near: those leaving earliest and fastest toward the camera are drawn last.
  const shards = visible.map((p) => {
    let cx = 0, cy = 0;
    for (const [x, y] of p) { cx += x; cy += y; }
    cx /= p.length; cy /= p.length;
    const r = [rand(), rand(), rand(), rand()];
    const dn = Math.min(1, Math.hypot(cx - ix, cy - iy) / reach);
    return { p, cx, cy, r, key: (0.3 + r[2] * 1.3) * (1.25 - dn) };
  }).sort((a, b) => a.key - b.key);

  const pos = [], uv = [], center = [], rnd = [], edge = [];
  const pushVert = (x, y, cx, cy, r, e) => {
    pos.push(x, y, 0);
    uv.push((x / aspect + 1) * 0.5, (y + 1) * 0.5);
    center.push(cx, cy, 0);
    rnd.push(r[0], r[1], r[2], r[3]);
    edge.push(e);
  };
  for (const { p, cx, cy, r } of shards) {
    for (let k = 0; k < p.length; k++) {
      const [ax, ay] = p[k], [bx, by] = p[(k + 1) % p.length];
      pushVert(cx, cy, cx, cy, r, 1);
      pushVert(ax, ay, cx, cy, r, 0);
      pushVert(bx, by, cx, cy, r, 0);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aCenter', new THREE.Float32BufferAttribute(center, 3));
  g.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 4));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  g.userData.shardCount = visible.length;
  g.userData.reach = reach;
  return g;
}

const SHARD_VERT = /* glsl */`
attribute vec3 aCenter;
attribute vec4 aRand;
attribute float aEdge;
uniform float uFly;        // 0..1 flight progress
uniform float uOpen;       // 0..1 crack phase: panes catch the light differently
uniform vec2 uImpact;
uniform float uReach;
varying vec2 vUv;
varying float vEdge;
varying float vShine;
varying float vMove;
varying float vDist;
varying float vTone;
varying float vLine;
varying float vSheen;
varying vec2 vDir;

vec3 rotateAxis(vec3 v, vec3 k, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

void main() {
  vUv = uv;
  vEdge = aEdge;
  vDist = length(position.xy - uImpact);
  vec2 rel = aCenter.xy - uImpact;
  float dist = length(rel);
  vec2 dir = dist > 1e-4 ? rel / dist : vec2(0.0, 1.0);
  float dn = clamp(dist / uReach, 0.0, 1.0);

  // Shards near the impact leave first; a random stagger keeps it from looking like a wave.
  float delay = dn * 0.42 + aRand.x * 0.18;
  float f = clamp((uFly - delay) / 0.5, 0.0, 1.0);
  float e = f * f;

  vec3 axis = normalize(vec3(aRand.y - 0.5, aRand.z - 0.5, (aRand.w - 0.5) * 0.45) + vec3(1e-4));
  float spin = (aRand.w > 0.5 ? 1.0 : -1.0) * (2.2 + aRand.x * 5.5);
  float ang = e * spin;

  vec3 p = rotateAxis(position - aCenter, axis, ang);
  vec3 off = vec3(dir * (0.2 + aRand.y * 0.65) * (f * 0.16 + e * 1.05), 0.0);
  off.z = (0.3 + aRand.z * 1.3) * e;
  off.y -= e * e * (0.3 + aRand.w * 0.7);
  p += aCenter + off;

  // Fake specular glint as each pane tumbles past a key light above-left of the camera.
  vec3 n = rotateAxis(vec3(0.0, 0.0, 1.0), axis, ang);
  vec3 h = normalize(normalize(vec3(-0.45, 0.6, 1.0)) + vec3(0.0, 0.0, 1.0));
  vShine = pow(abs(dot(n, h)), 60.0) * smoothstep(0.0, 0.25, f);
  vMove = e;
  vDir = dir;
  vTone = (aRand.z - 0.5) * uOpen;
  vLine = 0.55 + 0.45 * fract(aRand.x * 7.13 + aRand.w * 3.7);
  // each pane reflects a little differently: a soft linear sheen across it in a random direction
  vec2 sheenDir = normalize(vec2(aRand.w - 0.5, aRand.y - 0.5) + vec2(1e-3));
  vSheen = uOpen * (0.05 + 0.1 * aRand.x) * clamp(dot(position.xy - aCenter.xy, sheenDir) * 4.0 + 0.3, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const SHARD_FRAG = /* glsl */`
uniform sampler2D tFrozen;
uniform float uCrack;        // 0..1 crack front sweeping out from the impact
uniform float uReach;
uniform float uGlow;         // 0..1 shards brighten as they fly
uniform float uImpactFlash;
uniform vec3 uCrackColor;
uniform vec2 uSplitScale;    // chromatic split (uv units) per unit of motion
varying vec2 vUv;
varying float vEdge;
varying float vShine;
varying float vMove;
varying float vDist;
varying float vTone;
varying float vLine;
varying float vSheen;
varying vec2 vDir;
void main() {
  vec2 split = vDir * uSplitScale * (0.2 + vMove);
  vec3 col = vec3(
    texture2D(tFrozen, vUv + split).r,
    texture2D(tFrozen, vUv).g,
    texture2D(tFrozen, vUv - split).b);
  col *= 1.0 + vTone * 0.16;
  col += uCrackColor * vSheen;

  // Crack lines: ~1px core per side (neighbours share the edge, so ~2px total) plus a soft halo.
  float front = uCrack * uReach * 1.1;
  float lineVis = (1.0 - smoothstep(front - 0.08, front, vDist)) * vLine
    * mix(1.0, 0.5, smoothstep(0.15, 0.9, vDist / uReach));
  float w = fwidth(vEdge);
  float line = 1.0 - smoothstep(0.0, w * 1.05, vEdge);
  float halo = 1.0 - smoothstep(0.0, w * 6.0, vEdge);
  // a dark refraction band just inside the bright edge sells the glass thickness
  float band = smoothstep(w * 1.0, w * 2.0, vEdge) * (1.0 - smoothstep(w * 2.0, w * 4.0, vEdge));
  col *= 1.0 - band * 0.25 * lineVis;
  col = mix(col, uCrackColor * 1.25, line * lineVis * 0.85);
  col += uCrackColor * halo * lineVis * (0.1 + 0.35 * vMove);

  col += vShine * vec3(0.95, 0.98, 1.0) * 1.25;
  col = mix(col, uCrackColor, uGlow * (0.1 + 0.55 * vMove));
  col += uCrackColor * uImpactFlash * exp(-vDist * vDist * 40.0);
  gl_FragColor = vec4(col, 1.0);
}`;

// Light bursting through the gaps: a white core that grows from the impact, cooling to a deep
// tint toward the edges.
const SHATTER_BG_FRAG = /* glsl */`
uniform vec3 uColor;
uniform vec3 uTint;
uniform float uAmount;
uniform float uRadius;       // core radius in reach units
uniform vec2 uImpact;
uniform float uAspect;
uniform float uReach;
varying vec2 vUv;
void main() {
  vec2 p = vec2((vUv.x * 2.0 - 1.0) * uAspect, vUv.y * 2.0 - 1.0);
  float d = length(p - uImpact) / uReach;
  float core = exp(-pow(d / max(uRadius, 1e-3), 2.0) * 2.2);
  vec3 col = mix(uTint * (0.18 + 0.3 * (1.0 - d)), uColor * 1.6, core);
  gl_FragColor = vec4(col * uAmount, 1.0);
}`;

// Unit plane -> full clip space, independent of the camera.
const CLIP_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;

const SHATTER_COVER_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uAlpha;
void main() { gl_FragColor = vec4(uColor, uAlpha); }`;

/**
 * Glass-shatter encounter transition (Octopath's signature cut into battle). The frozen frame is
 * cracked into ~50-90 panes that spin toward the camera over a growing radial flash, then the
 * screen whites out and cuts to black. Drive it with setProgress(p) for p in 0..1.
 */
export class ShatterEffect {
  constructor() {
    this.frozen = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: false });
    this.frozen.texture.name = 'VP.ShatterFrozen';
    /** MSAA samples for the shard overlay (0 = draw straight to the target, aliased edges). */
    this.samples = 4;
    /** Keep the full-size targets between transitions (no reallocation per encounter; desktop). */
    this.keepTargets = false;
    this.msaa = null;
    this.copyMaterial = COPY_MATERIAL();
    this.copyQuad = new FullScreenQuad(this.copyMaterial);

    this.camDist = 3.2;
    this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2 * Math.atan(1 / this.camDist)), 1, 0.05, 20);
    this.camera.position.set(0, 0, this.camDist);
    this.camera.lookAt(0, 0, 0);
    this.scene = new THREE.Scene();

    this.uniforms = {
      tFrozen: { value: this.frozen.texture },
      uFly: { value: 0 },
      uOpen: { value: 0 },
      uCrack: { value: 0 },
      uGlow: { value: 0 },
      uImpactFlash: { value: 0 },
      uImpact: { value: new THREE.Vector2() },
      uReach: { value: 2 },
      uCrackColor: { value: new THREE.Color('#e9f8ff') },
      uSplitScale: { value: new THREE.Vector2(0.006, 0.006) },
    };
    this.shardMaterial = new THREE.ShaderMaterial({
      name: 'VP.Shards',
      uniforms: this.uniforms,
      vertexShader: SHARD_VERT,
      fragmentShader: SHARD_FRAG,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    this.shards = new THREE.Mesh(new THREE.BufferGeometry(), this.shardMaterial);
    this.shards.frustumCulled = false;

    this.bgUniforms = {
      uColor: { value: new THREE.Color('#ffffff') },
      uTint: { value: new THREE.Color('#5fd2ff') },
      uAmount: { value: 0 },
      uRadius: { value: 0.1 },
      uImpact: this.uniforms.uImpact,
      uAspect: { value: 1 },
      uReach: this.uniforms.uReach,
    };
    this.bg = this._fullscreenPlane(new THREE.ShaderMaterial({
      name: 'VP.ShatterBG', uniforms: this.bgUniforms, vertexShader: CLIP_VERT, fragmentShader: SHATTER_BG_FRAG,
      depthTest: false, depthWrite: false,
    }), -1);

    this.coverUniforms = { uColor: { value: new THREE.Color(1, 1, 1) }, uAlpha: { value: 0 } };
    this.cover = this._fullscreenPlane(new THREE.ShaderMaterial({
      name: 'VP.ShatterCover', uniforms: this.coverUniforms, vertexShader: CLIP_VERT, fragmentShader: SHATTER_COVER_FRAG,
      transparent: true, depthTest: false, depthWrite: false,
    }), 10);

    this.scene.add(this.bg, this.shards, this.cover);
    this.flashColor = new THREE.Color('#ffffff');
    this.shardCount = 0;
  }

  // A clip-space quad (CLIP_VERT ignores the camera), so it always fills the screen.
  _fullscreenPlane(material, order) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    m.frustumCulled = false;
    m.renderOrder = order;
    return m;
  }

  /**
   * New crack pattern for a frame of the given aspect.
   *   impact: [x, y] in plane units (x in [-aspect, aspect], y in [-1, 1])
   *   color:  flash / crack tint
   */
  setup(aspect, { seed = (Math.random() * 1e9) | 0, impact = [0, 0], color = '#ffffff' } = {}) {
    this.shards.geometry.dispose();
    const g = buildShatterGeometry(aspect, { seed, impact });
    this.shards.geometry = g;
    this.shardCount = g.userData.shardCount;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.uniforms.uImpact.value.set(impact[0], impact[1]);
    this.uniforms.uReach.value = g.userData.reach;
    this.bgUniforms.uAspect.value = aspect;
    this.flashColor.set(color);
    this.bgUniforms.uColor.value.copy(this.flashColor);
    this.uniforms.uCrackColor.value.copy(this.flashColor).lerp(new THREE.Color('#dff6ff'), 0.5);
    this.setProgress(0);
  }

  /** Copy a finished (display-space) frame into the frozen texture. */
  capture(renderer, texture) {
    const img = texture.image;
    if (this.frozen.width !== img.width || this.frozen.height !== img.height) this.frozen.setSize(img.width, img.height);
    this.copyMaterial.uniforms.tDiffuse.value = texture;
    renderer.setRenderTarget(this.frozen);
    this.copyQuad.render(renderer);
  }

  /** Freeze a plain black frame (used when there is no view to capture). */
  clearFrozen(renderer) {
    renderer.setRenderTarget(this.frozen);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, false, false);
  }

  /**
   * Timeline (p = 0..1 of the cover phase):
   *   0.00-0.13 crack lines race out from the impact, a pinpoint flash
   *   0.10-0.90 panes tumble toward the camera over a light burst growing from the impact
   *   0.76-0.90 white-out;  >= 0.92 cut to black
   */
  setProgress(p) {
    const u = this.uniforms;
    u.uCrack.value = ease.outCubic(clamp(p / 0.13, 0, 1));
    u.uOpen.value = smoothstep(0.04, 0.14, p);
    u.uFly.value = clamp((p - 0.1) / 0.8, 0, 1) * 1.1;
    u.uImpactFlash.value = smoothstep(0, 0.02, p) * (1 - smoothstep(0.02, 0.16, p)) * 1.5;
    u.uGlow.value = smoothstep(0.55, 0.9, p);
    this.bgUniforms.uAmount.value = smoothstep(0.05, 0.4, p) * 1.2;
    this.bgUniforms.uRadius.value = 0.12 + 1.3 * ease.inCubic(smoothstep(0.08, 0.9, p));
    const c = this.coverUniforms;
    if (p >= 0.92) {
      c.uColor.value.setRGB(0, 0, 0);
      c.uAlpha.value = 1;
    } else {
      c.uColor.value.copy(this.flashColor);
      c.uAlpha.value = smoothstep(0.76, 0.9, p);
    }
  }

  render(renderer, target = null) {
    if (this.samples > 0) {
      const { width, height } = this.frozen;
      if (!this.msaa || this.msaa.samples !== this.samples) {
        this.msaa?.dispose();
        this.msaa = new THREE.WebGLRenderTarget(width, height, { samples: this.samples, type: THREE.UnsignedByteType, depthBuffer: false });
        this.msaa.texture.name = 'VP.ShatterMSAA';
      } else if (this.msaa.width !== width || this.msaa.height !== height) this.msaa.setSize(width, height);
      renderer.setRenderTarget(this.msaa);
      renderer.render(this.scene, this.camera);
      this.copyMaterial.uniforms.tDiffuse.value = this.msaa.texture;
      renderer.setRenderTarget(target);
      this.copyQuad.render(renderer);
      return;
    }
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  /** Free the full-resolution targets between transitions unless keepTargets (re-created on demand). */
  release() {
    if (this.keepTargets) return;
    this.frozen.setSize(4, 4);
    this.msaa?.dispose();
    this.msaa = null;
  }

  dispose() {
    this.frozen.dispose();
    this.msaa?.dispose();
    this.copyMaterial.dispose();
    this.copyQuad.dispose();
    this.shards.geometry.dispose();
    this.shardMaterial.dispose();
    this.bg.geometry.dispose();
    this.bg.material.dispose();
    this.cover.geometry.dispose();
    this.cover.material.dispose();
  }
}
