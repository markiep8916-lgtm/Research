// Renderer, scene, lighting, sky dome, fog. One instance for the whole game.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { THEMES } from './themes.js';

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = `
uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cHor; uniform vec3 cBot;
varying vec3 vDir;
void main(){
  float h = vDir.y;
  vec3 c = mix(cHor, cMid, smoothstep(0.0, 0.35, h));
  c = mix(c, cTop, smoothstep(0.3, 0.9, h));
  c = mix(c, cBot, smoothstep(0.0, -0.35, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export class Gfx {
  constructor(container, { shadows = true, shadowSize = 2048 } = {}) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.id = 'gl';
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 700);
    this.camera.position.set(0, 3, 21);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.2);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = shadows;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = this.sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 110;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.rim = new THREE.DirectionalLight(0xffaa66, 0.8);
    this.rim.position.set(14, 8, -18);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.rim);

    // fixed pool of point lights so the shader programs never change between rooms
    this.plights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffffff, 0, 16, 2); l.position.set(0, -50, 0); this.scene.add(l); return l; });

    // sky dome follows the camera
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { cTop: { value: new THREE.Color() }, cMid: { value: new THREE.Color() }, cHor: { value: new THREE.Color() }, cBot: { value: new THREE.Color() } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 16), this.skyMat);
    this.sky.renderOrder = -1000;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // subtle image-based lighting so metals (iron, gold, steel girders) have something to reflect
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.38;
    pmrem.dispose();

    this.theme = null;
    this.sunOffset = new THREE.Vector3(-16, 24, 26);
    this.resScale = 1;
    this.maxDpr = 2;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  applyTheme(key) {
    const t = THEMES[key];
    if (!t) return;
    this.theme = t;
    this.themeKey = key;
    this.scene.fog = new THREE.Fog(t.fog.color, t.fog.near, t.fog.far);
    this.scene.background = new THREE.Color(t.fog.color);
    this.hemi.color.set(t.hemi.sky); this.hemi.groundColor.set(t.hemi.ground); this.hemi.intensity = t.hemi.intensity;
    this.sun.color.set(t.sun.color); this.sun.intensity = t.sun.intensity;
    this.sunOffset.set(...t.sun.pos);
    this.rim.color.set(t.rim.color); this.rim.intensity = t.rim.intensity;
    this.renderer.toneMappingExposure = t.exposure;
    this.scene.environmentIntensity = t.env ?? 0.25;
    const u = this.skyMat.uniforms;
    u.cTop.value.set(t.sky.top); u.cMid.value.set(t.sky.mid); u.cHor.value.set(t.sky.horizon); u.cBot.value.set(t.sky.bottom);
  }

  /** Keep the shadow frustum centred on the action so the map stays crisp. */
  followShadow(x, y) {
    this.sun.target.position.set(x, y, 0);
    this.sun.position.set(x + this.sunOffset.x, y + this.sunOffset.y, this.sunOffset.z);
    this.sun.target.updateMatrixWorld();
  }

  /** Assign the four nearest of the room's glow lights (torches, crystals, lava) to the pooled point lights. */
  setPointLights(list, fx, fy, time = 0) {
    const sorted = (list || []).slice().sort((a, b) => ((a.x - fx) ** 2 + (a.y - fy) ** 2) - ((b.x - fx) ** 2 + (b.y - fy) ** 2));
    for (let i = 0; i < this.plights.length; i++) {
      const l = this.plights[i], d = sorted[i];
      if (!d) { l.intensity = 0; continue; }
      l.position.set(d.x, d.y, d.z);
      l.color.set(d.color);
      l.distance = d.distance;
      const flick = d.flicker !== undefined ? 0.9 + Math.sin(time * 11 + d.flicker) * 0.07 + Math.sin(time * 19 + d.flicker * 3) * 0.05 : 1;
      l.intensity = d.intensity * flick;
    }
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth || 1280;
    const h = this.container.clientHeight || window.innerHeight || 720;
    this.w = w; this.h = h;
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.applyPixelRatio();
  }

  applyPixelRatio() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr) * this.resScale;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
  }

  setResolutionScale(s) {
    s = Math.max(0.5, Math.min(1, s));
    if (Math.abs(s - this.resScale) < 0.01) return;
    this.resScale = s;
    this.applyPixelRatio();
  }

  render() {
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }
}
