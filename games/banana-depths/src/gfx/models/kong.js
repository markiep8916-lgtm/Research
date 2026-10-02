// The hero: a hefty brown gorilla in a red necktie. Built from primitives and posed procedurally.
// Local space: +y up, +z forward, +x is the ape's LEFT. Feet at y = 0. ~1.9 units tall.
import * as THREE from 'three';
import { sphere, capsule, box, cone, torus, cyl, mat, part, group } from './common.js';
import { clamp, damp, lerp } from '../../core/util.js';

const YAW = Math.PI / 2 - 0.55; // three-quarter view toward the camera

export function createKong() {
  const fur = mat(0x5b3a20, { roughness: 0.95 });
  const furDark = mat(0x3b2412, { roughness: 0.95 });
  const furLight = mat(0x77502c, { roughness: 0.95 });
  const tan = mat(0xdca66b, { roughness: 0.8 });
  const tanLight = mat(0xefc690, { roughness: 0.8 });
  const red = mat(0xd4201d, { roughness: 0.45 });
  const yellow = mat(0xffd23a, { roughness: 0.4, emissive: 0xaa7a00, emissiveIntensity: 0.35 });
  const white = mat(0xffffff, { roughness: 0.3 });
  const black = mat(0x0c0a0a, { roughness: 0.3 });
  const mouthMat = mat(0x4a1010, { roughness: 0.6 });
  const mats = [fur, furDark, furLight, tan, tanLight, red];

  const root = new THREE.Group();
  const tilt = group(root); // yaw / squash pivot

  // ------------------------------------------------------------ torso
  const torso = group(tilt, [0, 0.98, 0]);
  part(sphere(0.5, 24, 18), fur, { s: [1.04, 1.06, 0.86], parent: torso });
  part(sphere(0.38, 20, 14), furLight, { p: [0, -0.22, 0.12], s: [1.1, 0.9, 0.8], parent: torso });
  part(sphere(0.4, 24, 16), tan, { p: [0, 0.1, 0.3], s: [0.98, 1.0, 0.5], parent: torso });
  // shoulders / back hump
  part(sphere(0.34, 16, 12), furDark, { p: [0, 0.38, -0.12], s: [1.7, 0.7, 0.8], parent: torso });

  // necktie: a strip whose vertices follow the chest surface so it hugs the fur instead of sinking into it
  const surfZ = (y) => Math.max(0.43 * Math.sqrt(Math.max(0, 1 - (y / 0.53) ** 2)), 0.3 + 0.2 * Math.sqrt(Math.max(0, 1 - ((y - 0.1) / 0.4) ** 2)));
  const tieRows = [[0.5, 0.0], [0.47, 0.105], [0.42, 0.115], [0.37, 0.05], [0.33, 0.055], [0.2, 0.11], [0.05, 0.17], [-0.1, 0.2], [-0.2, 0.15], [-0.3, 0.0]];
  const tp = [], ti = [];
  tieRows.forEach(([y, w], i) => {
    const z = surfZ(Math.min(y, 0.5)) + 0.035;
    tp.push(-w, y, z, w, y, z);
    if (i > 0) { const a = (i - 1) * 2; ti.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  const tieGeo = new THREE.BufferGeometry();
  tieGeo.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  tieGeo.setIndex(ti);
  tieGeo.computeVertexNormals();
  const redDS = mat(0xd4201d, { roughness: 0.4, side: THREE.DoubleSide });
  mats.push(redDS);
  part(tieGeo, redDS, { parent: torso, cast: false });
  part(box(0.2, 0.1, 0.1), red, { p: [0, 0.42, surfZ(0.42) + 0.03], parent: torso, cast: false }); // knot
  part(torus(0.07, 0.02, 6, 14, Math.PI * 1.45), yellow, { p: [0, 0.02, surfZ(0.02) + 0.06], r: [0, 0, Math.PI * 0.62], parent: torso, cast: false });
  part(box(0.3, 0.012, 0.02), yellow, { p: [0, 0.13, surfZ(0.13) + 0.045], parent: torso, cast: false });

  // ------------------------------------------------------------ head
  const head = group(torso, [0, 0.7, 0.1]);
  head.scale.setScalar(1.28);
  part(sphere(0.31, 24, 18), fur, { parent: head });
  part(sphere(0.285, 22, 16), tan, { p: [0, -0.045, 0.1], s: [0.96, 0.9, 0.78], parent: head });
  part(sphere(0.19, 20, 14), tanLight, { p: [0, -0.13, 0.26], s: [1.2, 0.82, 0.8], parent: head });
  part(sphere(0.03, 8, 6), black, { p: [-0.045, -0.085, 0.43], parent: head, cast: false });
  part(sphere(0.03, 8, 6), black, { p: [0.045, -0.085, 0.43], parent: head, cast: false });
  const mouth = part(sphere(0.085, 14, 10), mouthMat, { p: [0, -0.2, 0.36], s: [1.35, 0.14, 0.5], parent: head, cast: false });
  // eyes
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = group(head, [sx * 0.105, 0.04, 0.3]);
    part(sphere(0.082, 16, 12), white, { s: [1, 1.1, 0.9], parent: e, cast: false });
    const pupil = part(sphere(0.046, 12, 10), black, { p: [0, -0.005, 0.058], parent: e, cast: false });
    part(sphere(0.014, 6, 6), white, { p: [0.014, 0.014, 0.1], parent: e, cast: false });
    eyes.push({ e, pupil });
  }
  // brow ridge (angled for a mean-but-friendly scowl)
  const browL = part(box(0.19, 0.06, 0.1), furDark, { p: [0.105, 0.145, 0.33], r: [0.1, 0, -0.22], parent: head, cast: false });
  const browR = part(box(0.19, 0.06, 0.1), furDark, { p: [-0.105, 0.145, 0.33], r: [0.1, 0, 0.22], parent: head, cast: false });
  // ears and hair
  for (const sx of [-1, 1]) part(sphere(0.075, 10, 8), tan, { p: [sx * 0.3, 0, 0.0], s: [0.6, 1, 0.9], parent: head, cast: false });
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.28;
    part(cone(0.07, 0.3, 6), furDark, { p: [Math.sin(a) * 0.12, 0.31, -0.06 - Math.abs(i - 2) * 0.01], r: [-0.55, 0, -a * 0.9], parent: head });
  }

  // ------------------------------------------------------------ arms
  function makeArm(sx) {
    const shoulder = group(torso, [sx * 0.56, 0.4, 0.02]);
    part(sphere(0.22, 14, 10), furDark, { parent: shoulder });
    part(capsule(0.17, 0.3), fur, { p: [0, -0.3, 0], parent: shoulder });
    const elbow = group(shoulder, [0, -0.56, 0]);
    part(capsule(0.185, 0.32), furLight, { p: [0, -0.29, 0], parent: elbow });
    const hand = group(elbow, [0, -0.64, 0]);
    part(sphere(0.25, 16, 12), furDark, { s: [1, 1.08, 1.05], parent: hand });
    part(sphere(0.2, 12, 10), tan, { p: [0, -0.04, 0.12], s: [0.85, 0.8, 0.5], parent: hand, cast: false });
    for (let i = 0; i < 3; i++) part(sphere(0.07, 8, 6), furDark, { p: [(i - 1) * 0.12, -0.2, 0.1], parent: hand });
    return { shoulder, elbow, hand };
  }
  const armL = makeArm(1);
  const armR = makeArm(-1);

  // ------------------------------------------------------------ legs
  const hip = group(tilt, [0, 0.56, 0]);
  function makeLeg(sx) {
    const l = group(hip, [sx * 0.26, 0, 0]);
    part(capsule(0.19, 0.16), furDark, { p: [0, -0.2, 0], parent: l });
    const knee = group(l, [0, -0.36, 0]);
    part(capsule(0.17, 0.1), fur, { p: [0, -0.1, 0], parent: knee });
    const foot = part(sphere(0.2, 14, 10), furDark, { p: [0, -0.4, 0.1], s: [1.0, 0.6, 1.45], parent: knee });
    part(sphere(0.14, 10, 8), tan, { p: [0, -0.42, 0.26], s: [1, 0.55, 0.8], parent: knee, cast: false });
    return { l, knee, foot };
  }
  const legL = makeLeg(1);
  const legR = makeLeg(-1);

  // ------------------------------------------------------------ rolling ball form
  const ball = group(root, [0, 0.46, 0]);
  const ballSpin = group(ball);
  part(sphere(0.47, 22, 16), fur, { parent: ballSpin });
  part(sphere(0.34, 18, 12), tan, { p: [0, -0.04, 0.26], s: [1.05, 1.0, 0.55], parent: ballSpin });
  part(sphere(0.2, 14, 10), fur, { p: [0.06, 0.34, 0.16], parent: ballSpin });
  part(sphere(0.16, 12, 10), tan, { p: [0.06, 0.33, 0.27], s: [1, 0.9, 0.6], parent: ballSpin });
  part(torus(0.42, 0.045, 8, 28), red, { p: [0, 0, 0], r: [Math.PI / 2, 0, 0], parent: ballSpin });
  for (const sx of [-1, 1]) part(sphere(0.19, 12, 10), furDark, { p: [sx * 0.34, -0.3, 0.12], parent: ballSpin });
  ball.visible = false;

  // ------------------------------------------------------------ boomerang prop held in the hand
  const heldBoom = group(armR.hand, [0, -0.2, 0.2], [0, 0, 0]);
  const boomMat = mat(0xffd23a, { roughness: 0.4, emissive: 0xaa7a00, emissiveIntensity: 0.4 });
  part(torus(0.22, 0.06, 6, 14, Math.PI * 1.2), boomMat, { parent: heldBoom, r: [0, Math.PI / 2, 0] });
  heldBoom.visible = false;

  // ------------------------------------------------------------ animation state
  const st = {
    yaw: YAW, runPh: 0, climbPh: 0, idleT: Math.random() * 10, beatT: 0, squash: 0, landT: 0,
    lean: 0, hurtFlash: 0, blink: 0, nextBlink: 2, ballAng: 0, prevMode: 'move', mouthOpen: 0,
  };

  function setArm(a, x, z = 0, elbow = -0.2) {
    a.shoulder.rotation.x = x; a.shoulder.rotation.z = z; a.elbow.rotation.x = elbow;
  }
  function setLeg(l, hipX, kneeX) { l.l.rotation.x = hipX; l.knee.rotation.x = kneeX; }

  /**
   * s: {face, vx, vy, ground, mode, sliding, climb(-1..1), attack(0..1 | -1), throwing(0..1|-1), hurt, poundPhase, landed}
   */
  function update(s, dt, time) {
    st.idleT += dt;
    const speed = clamp(Math.abs(s.vx) / 7.4, 0, 1.6);
    const rolling = s.mode === 'roll';
    ball.visible = rolling;
    tilt.visible = !rolling;
    heldBoom.visible = s.throwing >= 0 && s.throwing < 0.35;

    // facing
    let yawT = s.face > 0 ? YAW : -YAW;
    if (s.mode === 'climb') yawT = 0.35 * (s.face > 0 ? 1 : -1);
    else if (s.mode === 'pound') yawT = 0.55 * s.face;
    else if (s.sliding) yawT = s.face > 0 ? Math.PI * 0.46 : -Math.PI * 0.46;
    st.yaw = damp(st.yaw, yawT, 22, dt);
    tilt.rotation.y = st.yaw;

    if (rolling) {
      st.ballAng += -s.face * Math.max(Math.abs(s.vx), 5) * dt / 0.47;
      ballSpin.rotation.set(0, 0, st.ballAng);
      ball.rotation.y = s.face > 0 ? 0.0 : 0.0;
      root.scale.set(1, 1, 1);
      return;
    }

    // defaults
    let tx = 0, bob = 0, headX = 0, headZ = 0, tz = 0;
    let aL = [0, 0.18, -0.25], aR = [0, -0.18, -0.25]; // [shoulder.x, shoulder.z, elbow.x]
    let lL = [0, 0], lR = [0, 0];
    let mouth = 0, browAng = 0.22;

    if (s.mode === 'climb') {
      if (s.climb !== 0) st.climbPh += dt * 9 * Math.sign(s.climb);
      const p = Math.sin(st.climbPh);
      aL = [-2.55 + p * 0.5, 0.35, -0.5 - p * 0.35];
      aR = [-2.55 - p * 0.5, -0.35, -0.5 + p * 0.35];
      lL = [-0.9 + p * 0.55, 1.1]; lR = [-0.9 - p * 0.55, 1.1];
      tx = 0.1; bob = Math.abs(p) * 0.03;
    } else if (s.mode === 'pound') {
      if (s.poundPhase === 0) { aL = [-3.05, 0.3, -0.15]; aR = [-3.05, -0.3, -0.15]; tx = -0.3; lL = [-0.3, 0.6]; lR = [-0.3, 0.6]; mouth = 0.5; }
      else { aL = [-0.4, 0.5, -0.2]; aR = [-0.4, -0.5, -0.2]; tx = 0.55; lL = [0.4, 0.2]; lR = [0.4, 0.2]; mouth = 1; browAng = 0.45; }
    } else if (!s.ground) {
      if (s.sliding) {
        aL = [-2.6, 0.2, -0.2]; aR = [-0.8, -0.3, -0.4]; lL = [-0.35, 0.6]; lR = [0.1, 0.5]; tx = -0.05;
      } else if (s.vy > 1) {
        aL = [-2.7, 0.55, -0.35]; aR = [-2.7, -0.55, -0.35]; lL = [-0.5, 0.9]; lR = [-0.9, 1.2]; tx = -0.12; mouth = 0.35;
      } else {
        aL = [-1.6, 1.05, -0.2]; aR = [-1.6, -1.05, -0.2]; lL = [-0.35, 0.5]; lR = [0.15, 0.4]; tx = 0.08; mouth = 0.2;
      }
    } else if (speed > 0.08) {
      st.runPh += dt * (6 + speed * 8);
      const p = Math.sin(st.runPh), q = Math.cos(st.runPh);
      const k = Math.min(speed, 1.2);
      lL = [p * 0.95 * k, Math.max(0, -p) * 1.0 * k + 0.2]; lR = [-p * 0.95 * k, Math.max(0, p) * 1.0 * k + 0.2];
      aL = [-p * 0.9 * k - 0.35, 0.3, -0.5 - Math.max(0, p) * 0.5]; aR = [p * 0.9 * k - 0.35, -0.3, -0.5 - Math.max(0, -p) * 0.5];
      tx = 0.08 + 0.18 * k; bob = Math.abs(q) * 0.07 * k; headX = -0.1 * k;
    } else {
      // idle with breathing, occasional chest beat
      const br = Math.sin(st.idleT * 2.2);
      aL = [0.05 + br * 0.03, 0.2, -0.2]; aR = [0.05 - br * 0.03, -0.2, -0.2];
      bob = br * 0.012; headX = br * 0.02;
      st.beatT -= dt;
      if (st.beatT < -4.5) st.beatT = 0.9;
      if (st.beatT > 0) {
        const b = Math.sin(st.beatT * 28);
        aL = [-1.15 + b * 0.18, -0.85, -1.7]; aR = [-1.15 - b * 0.18, 0.85, -1.7]; tx = -0.08; mouth = 0.6;
        bob = Math.abs(b) * 0.02;
      }
    }

    // attack overlays
    if (s.attack >= 0) {
      const a = s.attack; const swing = a < 0.25 ? a / 0.25 : 1 - (a - 0.25) / 0.75;
      const near = s.face > 0 ? 'R' : 'L';
      const ang = lerp(0.7, -1.75, Math.min(1, a / 0.3)) + (a > 0.5 ? (a - 0.5) * 1.2 : 0);
      const arm = [ang, near === 'R' ? -0.15 : 0.15, -0.15];
      if (near === 'R') aR = arm; else aL = arm;
      tz = (near === 'R' ? 1 : -1) * 0.0; tx = Math.max(tx, 0.15 * swing);
      mouth = Math.max(mouth, 0.7);
    }
    if (s.throwing >= 0) {
      const a = s.throwing; aR = [lerp(-2.7, -0.9, Math.min(1, a * 2.2)), -0.2, lerp(-0.4, -0.1, a)]; mouth = Math.max(mouth, 0.5);
    }
    if (s.hurt > 0) {
      aL = [-1.3, 1.3, -0.3]; aR = [-1.3, -1.3, -0.3]; lL = [-0.4, 0.5]; lR = [0.3, 0.5]; tx = -0.3; headX = -0.35; mouth = 1; browAng = 0.5;
    }

    setArm(armL, aL[0], aL[1], aL[2]); setArm(armR, aR[0], aR[1], aR[2]);
    setLeg(legL, lL[0], lL[1]); setLeg(legR, lR[0], lR[1]);
    torso.rotation.x = damp(torso.rotation.x, tx, 24, dt);
    torso.rotation.z = damp(torso.rotation.z, tz, 24, dt);
    torso.position.y = 0.98 + bob;
    head.rotation.x = damp(head.rotation.x, headX, 20, dt);
    head.rotation.z = headZ;
    st.mouthOpen = damp(st.mouthOpen, mouth, 24, dt);
    mouth_scale(st.mouthOpen);
    browL.rotation.z = -browAng; browR.rotation.z = browAng;

    // blink
    st.nextBlink -= dt;
    if (st.nextBlink < 0) { st.blink = 0.12; st.nextBlink = 1.8 + Math.random() * 3; }
    st.blink = Math.max(0, st.blink - dt);
    for (const { e } of eyes) e.scale.y = st.blink > 0 ? 0.12 : 1;
    // pupils look toward travel direction
    for (const { pupil } of eyes) pupil.position.x = clamp(s.vx / 40, -0.05, 0.05) * s.face * -1 * 0;

    // squash & stretch
    if (s.landed) st.landT = 0.18;
    st.landT = Math.max(0, st.landT - dt);
    let sy = 1;
    if (!s.ground && s.mode !== 'climb') sy = 1 + clamp(Math.abs(s.vy) / 90, 0, 0.1);
    if (st.landT > 0) sy = 1 - 0.16 * Math.sin((st.landT / 0.18) * Math.PI * 0.5) ;
    root.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));

    // flash
    st.hurtFlash = Math.max(0, st.hurtFlash - dt);
    const f = st.hurtFlash > 0 ? 1 : 0;
    for (const m of mats) { m.emissive.setRGB(f, f * 0.1, f * 0.1); m.emissiveIntensity = f * 0.8; }
    void time;
  }

  function mouth_scale(o) { mouth.scale.set(1.35 - o * 0.35, 0.14 + o * 0.9, 0.5); mouth.position.y = -0.2 - o * 0.02; }

  return {
    root,
    update,
    flash(sec = 0.25) { st.hurtFlash = sec; },
    resetPose() { st.runPh = 0; },
  };
}
