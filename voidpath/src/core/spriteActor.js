// SpriteActor: a pixel-art sprite plane standing in the 3D diorama, lit by scene lights through an
// auto-generated normal map, with emissive pixels for bloom, alpha-tested silhouette shadows,
// hit flash / tint / dithered fade, an additive aura (boost / target highlight) and a hologram mode.

import * as THREE from 'three';
import { toTexture, makeNormalMap, makeCanvas } from '../art/painter.js';
import { makeBlobShadow, makeHologramMaterial, BAYER_GLSL, NOISE_GLSL } from './vfx.js';

// ---------------------------------------------------------------- per-sheet caches

const sheetCache = new WeakMap();

/**
 * Alpha channel of a canvas as one byte per pixel (read back once per sheet). It reads through a
 * scratch copy so the shared sheet canvas (already read by the normal-map builder) is never read
 * back twice, which would trip Chrome's willReadFrequently warning.
 */
function readAlpha(canvas) {
  const scratch = makeCanvas(canvas.width, canvas.height);
  const g = scratch.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0);
  const rgba = g.getImageData(0, 0, canvas.width, canvas.height).data;
  const a = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < a.length; i++) a[i] = rgba[i * 4 + 3];
  return a;
}

/** Opaque bounding box of frame 0 (frame pixels, y down). */
function frameBounds(sheet, alpha) {
  const W = sheet.canvas.width;
  let x0 = sheet.frameW, y0 = sheet.frameH, x1 = -1, y1 = -1;
  for (let y = 0; y < sheet.frameH; y++) {
    for (let x = 0; x < sheet.frameW; x++) {
      if (alpha[y * W + x] > 127) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x0: 0, y0: 0, x1: sheet.frameW - 1, y1: sheet.frameH - 1 };
  return { x0, y0, x1, y1 };
}

function sheetData(sheet) {
  let d = sheetCache.get(sheet);
  if (d) return d;
  const normalSrc = sheet.normal || makeNormalMap(sheet.canvas, { frameW: sheet.frameW, frameH: sheet.frameH }).canvas;
  const alpha = readAlpha(sheet.canvas);
  d = {
    map: toTexture(sheet.canvas),
    normal: toTexture(normalSrc, { color: false }),
    emissive: sheet.emissive ? toTexture(sheet.emissive) : null,
    alpha, // kept until the aura sheet is built
    bounds: frameBounds(sheet, alpha),
    glow: null, // built lazily by glowSheet()
  };
  sheetCache.set(sheet, d);
  return d;
}

/**
 * Aura sheet: every frame's alpha silhouette, padded, dilated and blurred into a soft halo.
 * Same frame layout as the sheet (cols x rows), each frame grown by `pad` texels on every side.
 */
function glowSheet(sheet) {
  const d = sheetData(sheet);
  if (d.glow) return d.glow;
  const { frameW: fw, frameH: fh, cols, rows } = sheet;
  const pad = Math.max(4, Math.round(Math.min(fw, fh) * 0.12));
  const gw = fw + pad * 2, gh = fh + pad * 2;
  const W = cols * gw, H = rows * gh;
  const src = d.alpha;
  d.alpha = null;
  const SW = sheet.canvas.width;
  const out = new Uint8ClampedArray(W * H * 4);
  const a = new Float32Array(gw * gh), b = new Float32Array(gw * gh);
  const blurR = Math.max(2, Math.round(pad * 0.55));

  const boxH = (from, to, r) => {
    for (let y = 0; y < gh; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += x >= 0 && x < gw ? from[y * gw + x] : 0;
      for (let x = 0; x < gw; x++) {
        to[y * gw + x] = acc / (2 * r + 1);
        const xo = x - r, xi = x + r + 1;
        if (xo >= 0) acc -= from[y * gw + xo];
        if (xi < gw) acc += from[y * gw + xi];
      }
    }
  };
  const boxV = (from, to, r) => {
    for (let x = 0; x < gw; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += y >= 0 && y < gh ? from[y * gw + x] : 0;
      for (let y = 0; y < gh; y++) {
        to[y * gw + x] = acc / (2 * r + 1);
        const yo = y - r, yi = y + r + 1;
        if (yo >= 0) acc -= from[yo * gw + x];
        if (yi < gh) acc += from[yi * gw + x];
      }
    }
  };

  for (let fr = 0; fr < cols * rows; fr++) {
    const fc = fr % cols, frw = Math.floor(fr / cols);
    a.fill(0);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        if (src[(frw * fh + y) * SW + fc * fw + x] > 127) a[(y + pad) * gw + x + pad] = 1;
      }
    }
    // dilate by 1 texel (8-neighbourhood) so the halo hugs thin parts too
    b.set(a);
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        if (b[i]) continue;
        if (b[i - 1] || b[i + 1] || b[i - gw] || b[i + gw] || b[i - gw - 1] || b[i - gw + 1] || b[i + gw - 1] || b[i + gw + 1]) a[i] = 1;
      }
    }
    // two separable box passes ~ gaussian
    boxH(a, b, blurR); boxV(b, a, blurR);
    boxH(a, b, blurR); boxV(b, a, blurR);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const v = Math.min(1, a[y * gw + x] * 1.6);
        const o = ((frw * gh + y) * W + fc * gw + x) * 4;
        out[o] = out[o + 1] = out[o + 2] = 255;
        out[o + 3] = Math.round(v * 255);
      }
    }
  }
  const canvas = makeCanvas(W, H);
  canvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  d.glow = { texture: tex, pad, gw, gh, W, H };
  return d.glow;
}

// ---------------------------------------------------------------- shader patches

const SPRITE_PARS = `uniform vec3 uTint;\nuniform vec4 uFlash;\nuniform float uOpacity;\n${BAYER_GLSL}`;
const FADE_DISCARD = 'if (uOpacity < 0.999 && vpBayer4(gl_FragCoord.xy) >= uOpacity) discard;';

function patchSprite(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTint = uniforms.uTint;
    shader.uniforms.uFlash = uniforms.uFlash;
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SPRITE_PARS}`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>\n${FADE_DISCARD}\ndiffuseColor.rgb *= uTint;`)
      // flash mixes over the final lit colour, so it reads on top of any lighting
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uFlash.rgb, uFlash.a);');
  };
  material.customProgramCacheKey = () => 'vp-sprite-1';
}

function patchShadow(material, uniforms) {
  // the faded actor's shadow thins out with the same screen-door pattern (PCF softens it)
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uOpacity;\n${BAYER_GLSL}`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>\n${FADE_DISCARD}`);
  };
  material.customProgramCacheKey = () => 'vp-sprite-shadow-1';
}

const AURA_VERT = /* glsl */ `
uniform vec4 uFrame;
varying vec2 vUv;
varying vec2 vLocal;
void main() {
  vUv = uv * uFrame.zw + uFrame.xy;
  vLocal = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const AURA_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uColor;
uniform float uStrength, uTime, uOpacity, uAspect;
varying vec2 vUv;
varying vec2 vLocal;
${NOISE_GLSL}
void main() {
  float a = texture2D(map, vUv).a;
  float s = clamp(uStrength, 0.0, 4.0);
  // stronger aura = wider and brighter halo
  float halo = pow(a, mix(1.8, 0.75, clamp(s / 3.0, 0.0, 1.0)));
  // flame-like wisps rising through the halo
  float wisp = vpNoise(vec2(vLocal.x * 9.0, vLocal.y * 9.0 * uAspect - uTime * 2.4));
  float pulse = 0.8 + 0.2 * sin(uTime * 4.2);
  float k = halo * (0.55 + 0.75 * wisp) * pulse * (0.2 + 0.22 * s) * uOpacity;
  gl_FragColor = vec4(uColor * k, 1.0);
}`;

// ---------------------------------------------------------------- SpriteActor

const WHITE = new THREE.Color(1, 1, 1);

export class SpriteActor {
  constructor(sheet, {
    pxPerUnit = 32,
    tilt = 0.32,
    shadow = true,
    shadowScale = 1,
    castShadow = true,
    emissiveIntensity = 2.2,
    lit = true,
    anchor = [0.5, 0],
    receiveShadow = true,
    normalScale = 1.4,         // >1 exaggerates the edge bevel so coloured lights rim the silhouette more
  } = {}) {
    this.sheet = sheet;
    this.pxPerUnit = pxPerUnit;
    this.tilt = tilt;
    this.anchor = anchor;
    const d = sheetData(sheet);
    const fw = sheet.frameW, fh = sheet.frameH;
    const w = fw / pxPerUnit, h = fh / pxPerUnit;
    this.width = w;
    this.height = h;

    // cloned textures share the image (one GPU upload) but keep their own frame offset/repeat
    this.map = d.map.clone();
    this.normalMap = d.normal.clone();
    this.emissiveMap = d.emissive ? d.emissive.clone() : null;
    this._textures = this.emissiveMap ? [this.map, this.normalMap, this.emissiveMap] : [this.map, this.normalMap];

    this._u = {
      uTint: { value: new THREE.Color(1, 1, 1) },
      uFlash: { value: new THREE.Vector4(1, 1, 1, 0) },
      uOpacity: { value: 1 },
    };
    this._time = { value: Math.random() * 10 };

    let mat;
    if (lit) {
      mat = new THREE.MeshStandardMaterial({
        map: this.map,
        normalMap: this.normalMap,
        emissiveMap: this.emissiveMap,
        emissive: this.emissiveMap ? 0xffffff : 0x000000,
        emissiveIntensity,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0,
        normalScale: new THREE.Vector2(normalScale, normalScale),
      });
    } else {
      mat = new THREE.MeshBasicMaterial({ map: this.map, alphaTest: 0.5, side: THREE.DoubleSide });
    }
    patchSprite(mat, this._u);
    this._litMaterial = mat;
    this._holoMaterial = null;

    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(w * (0.5 - anchor[0]), h * (0.5 - anchor[1]), 0);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -tilt; // lean back: the top moves toward -Z, away from the camera
    this._receiveShadow = receiveShadow && lit;
    this.mesh.receiveShadow = this._receiveShadow;
    this._castShadow = castShadow;
    if (castShadow) {
      this._depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.map, alphaTest: 0.5, side: THREE.DoubleSide });
      this._distMat = new THREE.MeshDistanceMaterial({ map: this.map, alphaTest: 0.5, side: THREE.DoubleSide });
      patchShadow(this._depthMat, this._u);
      patchShadow(this._distMat, this._u);
      this.mesh.customDepthMaterial = this._depthMat;
      this.mesh.customDistanceMaterial = this._distMat;
      this.mesh.castShadow = true;
    }

    this.object3d = new THREE.Group();
    this.object3d.add(this.mesh);
    this.object3d.userData.actor = this;

    // blob shadow sized from the art's footprint (frame 0 opaque width)
    const b = d.bounds;
    const artW = (b.x1 - b.x0 + 1) / pxPerUnit;
    this.blob = null;
    if (shadow) {
      this.blob = makeBlobShadow(Math.max(0.22, Math.min(artW * 0.42, w * 0.5)) * shadowScale, 0.42);
      this.blob.scale.z = 0.62;
      this._blobX = ((b.x0 + b.x1 + 1) / 2 / pxPerUnit) - w * anchor[0];
      this.blob.position.x = this._blobX;
      this.object3d.add(this.blob);
    }
    // frame-0 opaque bounds in frame pixels (y down), for callers that place effects on the art
    this.bounds = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    // visual top of the art in the group's space (for damage numbers, cursors, name tags)
    const artTop = (fh - b.y0) / pxPerUnit - h * anchor[1];
    this.top = artTop * Math.cos(tilt);

    // aura (built on first setGlow)
    this._glowMesh = null;
    this._glowU = null;
    this._glowInfo = null;

    // animation state
    this.currentAnim = null;
    this._anim = null;
    this._animT = 0;
    this._ended = false;
    this._onEnd = null;
    this._frame = 0;
    this._flipX = false;
    this._hologram = false;
    this._flashT = 0;
    this._flashDur = 0;
    this._opacity = 1;
    this._applyFrame();
  }

  // ---------------------------------------------------------------- animation

  play(animName, { restart = false, onEnd } = {}) {
    const a = this.sheet.anims && this.sheet.anims[animName];
    if (!a || !a.frames || !a.frames.length) return this;
    if (animName === this.currentAnim && this._anim && !restart) {
      if (onEnd) {
        this._onEnd = onEnd;
        this._ended = false; // an already finished one-shot reports on the next update
      }
      return this;
    }
    this.currentAnim = animName;
    this._anim = a;
    this._animT = 0;
    this._ended = false;
    this._onEnd = onEnd || null;
    this._showFrame(a.frames[0]);
    return this;
  }

  setFrame(index) {
    this._anim = null;
    this.currentAnim = null;
    this._onEnd = null;
    this._showFrame(index);
    return this;
  }

  get frame() { return this._frame; }

  get flipX() { return this._flipX; }
  set flipX(v) {
    v = !!v;
    if (v === this._flipX) return;
    this._flipX = v;
    if (this.blob) this.blob.position.x = v ? -this._blobX : this._blobX;
    this._applyFrame();
  }

  _showFrame(i) {
    const n = this.sheet.count || this.sheet.cols * this.sheet.rows;
    i = Math.max(0, Math.min(n - 1, i | 0));
    if (i === this._frame) return;
    this._frame = i;
    this._applyFrame();
  }

  /** Point every texture's UV window at the current frame (half-texel inset, mirrored for flipX). */
  _applyFrame() {
    const s = this.sheet;
    const W = s.frameW * s.cols, H = s.frameH * s.rows;
    const col = this._frame % s.cols, row = Math.floor(this._frame / s.cols);
    const iu = 0.5 / W, iv = 0.5 / H;
    const rx = 1 / s.cols - 2 * iu, ry = 1 / s.rows - 2 * iv;
    let ox = col / s.cols + iu;
    const oy = 1 - (row + 1) / s.rows + iv;
    let sx = rx;
    if (this._flipX) { ox += rx; sx = -rx; }
    for (let k = 0; k < this._textures.length; k++) {
      const t = this._textures[k];
      t.offset.set(ox, oy);
      t.repeat.set(sx, ry);
      t.updateMatrix();
    }
    if (this._glowU) this._applyGlowFrame(col, row);
  }

  _applyGlowFrame(col, row) {
    const g = this._glowInfo;
    const s = this.sheet;
    const iu = 0.5 / g.W, iv = 0.5 / g.H;
    const rx = 1 / s.cols - 2 * iu, ry = 1 / s.rows - 2 * iv;
    let ox = col / s.cols + iu;
    const oy = 1 - (row + 1) / s.rows + iv;
    let sx = rx;
    if (this._flipX) { ox += rx; sx = -rx; }
    this._glowU.uFrame.value.set(ox, oy, sx, ry);
  }

  update(dt) {
    this._time.value += dt;
    const a = this._anim;
    if (a) {
      this._animT += dt;
      const n = a.frames.length;
      let k = Math.floor(this._animT * (a.fps || 8));
      if (a.loop === false) {
        if (k >= n) {
          k = n - 1;
          if (!this._ended) {
            this._ended = true;
            const cb = this._onEnd;
            this._onEnd = null;
            if (cb) cb(this);
          }
        }
      } else {
        k %= n;
      }
      // the callback may have started another animation
      if (this._anim === a) this._showFrame(a.frames[k]);
    }
    if (this._flashDur > 0) {
      this._flashT += dt;
      const k = this._flashT / this._flashDur;
      if (k >= 1) {
        this._flashDur = 0;
        this._u.uFlash.value.w = 0;
      } else {
        this._u.uFlash.value.w = 1 - k * k;
      }
    }
  }

  // ---------------------------------------------------------------- effects

  /** Tint toward `color` for `duration` seconds (hit flash). Drawn over the lit result, slightly HDR so it blooms. */
  flash(color = '#ffffff', duration = 0.12) {
    const f = this._u.uFlash.value;
    _c.set(color);
    f.set(_c.r * 1.2, _c.g * 1.2, _c.b * 1.2, 1);
    this._flashT = 0;
    this._flashDur = Math.max(0.001, duration);
  }

  /** Persistent multiply tint of the albedo (lighting and emissive pixels stay intact); null clears. */
  setTint(color) {
    if (color == null) this._u.uTint.value.copy(WHITE);
    else this._u.uTint.value.set(color);
  }

  /** 0-1. Below 1 the sprite (and its cast shadow) fades with an ordered-dither screen door. */
  setOpacity(a) {
    a = Math.max(0, Math.min(1, a));
    this._opacity = a;
    this._u.uOpacity.value = a;
    this.mesh.visible = a > 0.004;
    if (this.blob) this.blob.material.opacity = this.blob.userData.baseOpacity * a;
    if (this._glowU) this._glowU.uOpacity.value = a;
    if (this._holoMaterial) this._holoMaterial.uniforms.uOpacity.value = a;
  }

  get opacity() { return this._opacity; }

  /** Additive aura behind the sprite following its silhouette; strength ~ boost level (1-3). null hides it. */
  setGlow(color, strength = 1) {
    if (color == null || strength <= 0) {
      if (this._glowMesh) this._glowMesh.visible = false;
      return;
    }
    if (!this._glowMesh) this._buildGlow();
    this._glowU.uColor.value.set(color);
    this._glowU.uStrength.value = strength;
    this._glowMesh.visible = true;
  }

  _buildGlow() {
    const g = glowSheet(this.sheet);
    this._glowInfo = g;
    const ppu = this.pxPerUnit;
    const gw = g.gw / ppu, gh = g.gh / ppu;
    this._glowU = {
      map: { value: g.texture },
      uFrame: { value: new THREE.Vector4() },
      uColor: { value: new THREE.Color() },
      uStrength: { value: 1 },
      uTime: this._time,
      uOpacity: { value: this._opacity },
      uAspect: { value: g.gh / g.gw },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this._glowU,
      vertexShader: AURA_VERT,
      fragmentShader: AURA_FRAG,
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
    const geo = new THREE.PlaneGeometry(gw, gh);
    // same centre as the sprite frame, a hair behind it
    geo.translate(this.width * (0.5 - this.anchor[0]), this.height * (0.5 - this.anchor[1]), -0.03);
    this._glowMesh = new THREE.Mesh(geo, mat);
    this._glowMesh.renderOrder = 1;
    this.mesh.add(this._glowMesh);
    this._applyGlowFrame(this._frame % this.sheet.cols, Math.floor(this._frame / this.sheet.cols));
  }

  get hologram() { return this._hologram; }
  set hologram(v) {
    v = !!v;
    if (v === this._hologram) return;
    this._hologram = v;
    if (v) {
      if (!this._holoMaterial) {
        this._holoMaterial = makeHologramMaterial(this.map, '#6fe9ff', { time: this._time, jitter: 0.025, opacity: this._opacity });
        const s = this.sheet;
        this._holoMaterial.uniforms.uBands.value = Math.round(s.frameH / 3);
      }
      this.mesh.material = this._holoMaterial;
      this.mesh.castShadow = false;
      this.mesh.receiveShadow = false;
      if (this.blob) this.blob.visible = false;
    } else {
      this.mesh.material = this._litMaterial;
      this.mesh.castShadow = this._castShadow;
      this.mesh.receiveShadow = this._receiveShadow;
      if (this.blob) this.blob.visible = true;
    }
  }

  dispose() {
    if (this.object3d.parent) this.object3d.parent.remove(this.object3d);
    this.mesh.geometry.dispose();
    this._litMaterial.dispose();
    if (this._holoMaterial) this._holoMaterial.dispose();
    if (this._depthMat) this._depthMat.dispose();
    if (this._distMat) this._distMat.dispose();
    for (const t of this._textures) t.dispose();
    if (this._glowMesh) {
      this._glowMesh.geometry.dispose();
      this._glowMesh.material.dispose();
    }
    if (this.blob) {
      this.blob.geometry.dispose();
      this.blob.material.dispose();
    }
    this._onEnd = null;
    this._anim = null;
  }
}

const _c = new THREE.Color();
