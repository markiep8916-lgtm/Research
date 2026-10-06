// Lighting and atmosphere helpers for the 2D-HD look: additive glows, volumetric light shafts,
// soft blob shadows, the hologram material and light flicker controllers.
// Everything animated here is advanced by updateVfx(dt, t) (call it once per frame).

import * as THREE from 'three';
import { makeCanvas } from '../art/painter.js';

// ---------------------------------------------------------------- shared GLSL

/** Hash / value-noise / fbm helpers shared by the vfx shaders (prefix vp to avoid clashes). */
export const NOISE_GLSL = /* glsl */ `
float vpHash1(float n) { return fract(sin(n) * 43758.5453123); }
float vpHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vpNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = vpHash(i), b = vpHash(i + vec2(1.0, 0.0));
  float c = vpHash(i + vec2(0.0, 1.0)), d = vpHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float vpFbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vpNoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
`;

/** Ordered 4x4 Bayer threshold in [0,1) for a pixel position (screen-door transparency). */
export const BAYER_GLSL = /* glsl */ `
float vpBayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float vpBayer4(vec2 a) { return vpBayer2(0.5 * a) * 0.25 + vpBayer2(a); }
`;

// ---------------------------------------------------------------- registry

const timeUniforms = new Set(); // { value } time uniforms of vfx materials, set to t by updateVfx
const flickers = new Set();
let clock = 0;

function trackTime(material, uniform) {
  timeUniforms.add(uniform);
  material.addEventListener('dispose', () => timeUniforms.delete(uniform));
}

/**
 * Advance every animated vfx object made by this module (light shafts, holograms, flickers).
 * `t` is absolute time in seconds; when omitted an internal clock accumulates dt.
 */
export function updateVfx(dt, t) {
  clock = t ?? clock + dt;
  for (const u of timeUniforms) u.value = clock;
  for (const f of flickers) f.update(dt, clock);
}

// ---------------------------------------------------------------- cached textures

function radialTexture(size, alphaAt, { rgb = 255 } = {}) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - h, y + 0.5 - h) / h;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = rgb;
      img.data[i + 3] = Math.round(Math.max(0, Math.min(1, alphaAt(r))) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; // the alpha falloff is data, not color
  t.needsUpdate = true;
  return t;
}

const smooth01 = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

let glowTex = null;
/** White radial halo: gaussian body plus a tight hot core, zero at the edge. */
export function glowTexture() {
  if (!glowTex) {
    glowTex = radialTexture(128, (r) =>
      (Math.exp(-r * r * 5.2) * 0.72 + Math.exp(-r * r * 48) * 0.45) * (1 - smooth01(0.7, 1, r)));
  }
  return glowTex;
}

let blobTex = null;
function blobTexture() {
  if (!blobTex) blobTex = radialTexture(64, (r) => Math.pow(1 - smooth01(0.0, 1.0, r), 1.35), { rgb: 0 });
  return blobTex;
}

// ---------------------------------------------------------------- makeGlow

/**
 * Additive, camera-facing soft halo for lamps, LEDs and energy cores.
 * The quad is pulled toward the camera along the view ray (same screen footprint) so that a
 * glow placed on a lamp in a wall is not sliced in half by the wall. Extra options:
 *   pull: fraction of the glow size to pull toward the camera (default 0.5)
 */
export function makeGlow(color, size = 1, intensity = 1, { pull = 0.5 } = {}) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: new THREE.Color(color).multiplyScalar(intensity),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const uPull = { value: pull };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPull = uPull;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float uPull;\nvoid main() {')
      .replace('mvPosition.xy += rotatedPosition;', `mvPosition.xy += rotatedPosition;
      if (isPerspectiveMatrix(projectionMatrix)) {
        float vpD = length(modelViewMatrix[3].xyz);
        mvPosition.xyz *= max(vpD - uPull * max(scale.x, scale.y), 0.05) / max(vpD, 1e-4);
      }`);
  };
  mat.customProgramCacheKey = () => 'vp-glow';
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 2;
  sprite.userData.baseColor = mat.color.clone();
  sprite.userData.uniforms = { uPull };
  return sprite;
}

// ---------------------------------------------------------------- makeLightShaft

const SHAFT_VERT = /* glsl */ `
uniform vec3 uSide;
uniform float uLength, uWidth0, uWidth1;
varying vec2 vUv;     // x: -1..1 across the beam, y: 0 at the source .. 1 at the far end
varying vec2 vLocal;  // the same in local units
varying float vWorldY;
void main() {
  float t = -position.y;
  float halfW = mix(uWidth0, uWidth1, t) * 0.5;
  vec3 p = uSide * (position.x * halfW) + vec3(0.0, -t * uLength, 0.0);
  vUv = vec2(position.x, t);
  vLocal = vec2(position.x * halfW, t * uLength);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorldY = wp.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity, uTime, uSeed, uDust, uSoftness, uFloorY, uFloorFade;
varying vec2 vUv;
varying vec2 vLocal;
varying float vWorldY;
${NOISE_GLSL}
void main() {
  float across = abs(vUv.x);
  float edge = 1.0 - smoothstep(1.0 - uSoftness, 1.0, across);
  edge *= edge;
  float t = vUv.y;
  // fade in from the source, out along the length and softly into the floor (no hard intersection line)
  float ends = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.35, 1.0, t))
             * smoothstep(uFloorY, uFloorY + uFloorFade, vWorldY);
  float grad = mix(1.0, 0.4, t);
  // long streaks along the beam plus slow billowing haze drifting through it
  float streak = vpNoise(vec2(vUv.x * 3.5 + uSeed, t * 0.7 - uTime * 0.04));
  float billow = vpFbm(vec2(vLocal.x * 1.1 + uSeed * 3.0 + uTime * 0.05, vLocal.y * 0.55 - uTime * 0.13));
  float body = edge * ends * grad * (0.6 + 0.4 * streak) * (0.55 + 0.7 * billow) * 2.2;
  // sparse dust specks catching the light, drifting slowly down the beam
  vec2 g = vLocal * vec2(6.0, 6.0) + vec2(sin(uTime * 0.31 + vLocal.y * 1.7) * 0.35, -uTime * 0.28);
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = vpHash(cell + uSeed);
  vec2 off = (vec2(vpHash(cell + 7.13), vpHash(cell + 3.71)) - 0.5) * 0.55;
  float tw = 0.45 + 0.55 * sin(uTime * (0.8 + h * 2.4) + h * 40.0);
  float mote = step(0.84, h) * smoothstep(0.16, 0.02, length(f - off)) * max(tw, 0.0);
  float breathe = 0.93 + 0.07 * sin(uTime * 0.55 + uSeed * 5.0);
  vec3 col = uColor * (body * uOpacity * breathe + mote * uDust * edge * ends * 0.75);
  gl_FragColor = vec4(col, 1.0);
}`;

const _camLocal = new THREE.Vector3();

/**
 * Additive volumetric light beam. The mesh pivot is the SOURCE end (e.g. the window); the beam
 * extends along local -Y for `height` units, widening from `width` to `width * spread`.
 * Rotate/position the mesh to aim it (e.g. rotation.x = -0.6 slants it toward +Z as it falls).
 * With billboard (default) the beam turns around its own axis to face the camera, so it reads as
 * a volume from any angle. Extra options: spread, softness (edge falloff 0-1), dust (0-2), seed,
 * floorY / floorFade (the beam fades out over floorFade units above world height floorY).
 * mesh.userData.update(dt) advances it on its own; updateVfx() also drives it.
 */
export function makeLightShaft({
  width = 2, height = 6, color = '#9fd8ff', opacity = 0.18,
  spread = 1.45, softness = 0.75, dust = 1, seed = Math.random() * 50, billboard = true,
  floorY = 0, floorFade = 0.9,
} = {}) {
  const geo = new THREE.PlaneGeometry(2, 1, 1, 12);
  geo.translate(0, -0.5, 0);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -height / 2, 0), Math.hypot(height / 2, width * spread));
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uTime: { value: 0 },
    uSeed: { value: seed },
    uDust: { value: dust },
    uSoftness: { value: softness },
    uSide: { value: new THREE.Vector3(1, 0, 0) },
    uLength: { value: height },
    uWidth0: { value: width },
    uWidth1: { value: width * spread },
    uFloorY: { value: floorY },
    uFloorFade: { value: floorFade },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SHAFT_VERT,
    fragmentShader: SHAFT_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    fog: false,
  });
  trackTime(mat, uniforms.uTime);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  if (billboard) {
    mesh.onBeforeRender = (renderer, scene, camera) => {
      // turn the beam around its local Y axis to face the camera
      _camLocal.setFromMatrixPosition(camera.matrixWorld);
      mesh.worldToLocal(_camLocal);
      const l = Math.hypot(_camLocal.x, _camLocal.z);
      if (l > 1e-4) uniforms.uSide.value.set(_camLocal.z / l, 0, -_camLocal.x / l);
    };
  }
  mesh.userData.uniforms = uniforms;
  mesh.userData.update = (dt) => { uniforms.uTime.value += dt; };
  return mesh;
}

// ---------------------------------------------------------------- makeBlobShadow

/** Soft dark ellipse lying on the floor (y = 0.012 in its parent's space) under an actor or prop. */
export function makeBlobShadow(radius = 0.5, opacity = 0.45) {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: blobTexture(),
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.012;
  mesh.renderOrder = -1; // before other transparent effects so it only darkens the floor
  mesh.userData.baseOpacity = opacity;
  return mesh;
}

// ---------------------------------------------------------------- makeHologramMaterial

const HOLO_VERT = /* glsl */ `
uniform mat3 uvTransform;
uniform float uTime, uJitter;
varying vec2 vUv;
varying vec2 vRaw;
${NOISE_GLSL}
void main() {
  vUv = (uvTransform * vec3(uv, 1.0)).xy;
  vRaw = uv;
  vec3 p = position;
  float tick = floor(uTime * 14.0);
  float glitch = step(0.9, vpHash1(tick * 1.37 + 0.5));
  p.y += (vpHash1(tick * 3.1) - 0.5) * uJitter * glitch + sin(uTime * 1.7) * uJitter * 0.2;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const HOLO_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uColor;
uniform float uTime, uOpacity, uBands;
uniform vec2 uTexel;
varying vec2 vUv;
varying vec2 vRaw;
${NOISE_GLSL}
void main() {
  // occasional horizontal tearing of a few bands
  float tick = floor(uTime * 10.0);
  float band = floor(vRaw.y * uBands);
  float tear = step(0.92, vpHash1(tick * 0.71 + 0.2)) * step(0.55, vpHash1(band * 1.93 + tick));
  vec2 uv = vUv + vec2((vpHash1(band + tick * 2.3) - 0.5) * 6.0 * uTexel.x * tear, 0.0);
  vec4 tex = texture2D(map, uv);
  if (tex.a < 0.5) discard;
  float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  // silhouette edge: any transparent 4-neighbour texel
  float solid = texture2D(map, uv + vec2(uTexel.x, 0.0)).a * texture2D(map, uv - vec2(uTexel.x, 0.0)).a
              * texture2D(map, uv + vec2(0.0, uTexel.y)).a * texture2D(map, uv - vec2(0.0, uTexel.y)).a;
  float edge = 1.0 - step(0.5, solid);
  // scanlines on texel rows (pixel aligned) plus a bright sweep travelling upward
  float row = floor(uv.y / uTexel.y + 0.5);
  float scan = mod(row, 2.0) < 1.0 ? 1.0 : 0.42;
  float sweep = pow(fract(vRaw.y * 0.5 - uTime * 0.42), 14.0);
  float flick = 0.9 + 0.1 * sin(uTime * 31.0) * sin(uTime * 7.3 + 1.0);
  flick *= 1.0 - 0.5 * step(0.95, vpHash1(floor(uTime * 16.0) + 0.3));
  vec3 base = uColor * (0.12 + 1.05 * pow(luma, 0.5));
  vec3 col = (base * scan + uColor * (edge * 0.85 + sweep * 0.9)) * flick * uOpacity;
  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * Unlit additive hologram: cyan monochrome, pixel scanlines, upward sweep, flicker, tearing and a
 * slight vertical jitter. Honors texture.offset/repeat (animated sheets: set them, the matrix is
 * refreshed before each draw). Extra options: time (external { value } uniform), jitter (world units).
 */
export function makeHologramMaterial(texture, color = '#6fe9ff', { time = null, jitter = 0.03, opacity = 1 } = {}) {
  const img = texture.image;
  const w = (img && img.width) || 64, h = (img && img.height) || 64;
  const uniforms = {
    map: { value: texture },
    uvTransform: { value: texture.matrix },
    uColor: { value: new THREE.Color(color) },
    uTime: time || { value: 0 },
    uOpacity: { value: opacity },
    uJitter: { value: jitter },
    uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
    uBands: { value: 18 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: HOLO_VERT,
    fragmentShader: HOLO_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  mat.onBeforeRender = () => {
    const t = uniforms.map.value;
    if (t && t.matrixAutoUpdate) t.updateMatrix();
  };
  if (!time) trackTime(mat, uniforms.uTime);
  return mat;
}

// ---------------------------------------------------------------- makeFlicker

function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
}

/**
 * Animate light.intensity around `base`:
 *   'flicker' failing lamp: steady with irregular dips and rare blackouts
 *   'pulse'   smooth breathing between base and base*(1-amount); speed in rad/s
 *   'strobe'  hard flashes, speed/(2*PI) per second
 * Extra options: glow (a makeGlow sprite whose brightness follows), seed.
 * Returns { update(dt, t), dispose(), factor, light, base, amount, speed, mode, enabled }.
 */
export function makeFlicker(light, { base, amount = 0.5, speed = 8, mode = 'flicker', glow = null, seed = Math.random() * 100 } = {}) {
  const f = {
    light, base: base ?? light.intensity, amount, speed, mode, glow, seed,
    enabled: true,
    factor: 1,
    update(dt, t) {
      if (!f.enabled) return;
      let k = 1;
      if (f.mode === 'pulse') {
        k = 1 - f.amount * (0.5 - 0.5 * Math.cos(t * f.speed + f.seed));
      } else if (f.mode === 'strobe') {
        const ph = (t * f.speed / (Math.PI * 2) + f.seed) % 1;
        k = ph < 0.22 ? 1 : 1 - f.amount;
      } else {
        const n = noise1(t * f.speed + f.seed);
        const dip = Math.max(0, (n - 0.55) / 0.45);
        k = 1 - f.amount * dip * dip * 1.6;
        // rare short blackouts with a stutter
        const w = Math.floor(t * f.speed * 0.35 + f.seed);
        if (hash1(w) > 0.86 && ((t * f.speed * 0.35 + f.seed) % 1) < 0.35) k *= hash1(Math.floor(t * 30)) > 0.5 ? 0.12 : 0.55;
        k = Math.max(0, Math.min(1, k + (hash1(Math.floor(t * 60) + f.seed) - 0.5) * 0.04 * f.amount));
      }
      f.factor = k;
      f.light.intensity = f.base * k;
      if (f.glow) {
        const bc = f.glow.userData.baseColor;
        if (bc) f.glow.material.color.copy(bc).multiplyScalar(0.25 + 0.75 * k);
        else f.glow.material.opacity = k;
      }
    },
    dispose() { flickers.delete(f); },
  };
  flickers.add(f);
  return f;
}
