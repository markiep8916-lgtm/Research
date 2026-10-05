// Humanoid rig: forward kinematics for posed pixel characters.
// Angle convention: dir(θ) = (sin θ, cos θ) in screen space, so θ=0 points down, θ=π/2 points
// forward (+x, the facing side), θ=π points up. Limb angles are relative to the body's down axis.

const dirX = th => Math.sin(th), dirY = th => Math.cos(th);

// Base pose: standing upright.
const POSE0 = {
  hx: 0, hy: -20, rot: 0, head: 0,
  fThigh: 0, fKnee: 0, bThigh: 0, bKnee: 0,       // front / back leg
  fUpper: 0.25, fElbow: 1.2, bUpper: -0.1, bElbow: 1.0, // front / back arm
};
function pose(over) { return Object.assign({}, POSE0, over); }
function lerpPose(a, b, k) {
  const o = {};
  for (const key in POSE0) o[key] = lerp(a[key] != null ? a[key] : POSE0[key], b[key] != null ? b[key] : POSE0[key], k);
  return o;
}

// Common animation poses (functions of frame time where useful).
const Poses = {
  idle(t, guard = 1) {
    const b = Math.sin(t * 0.08) * 0.6;
    return pose({ hy: -20 + b * 0.5, rot: 0.06, fThigh: 0.18, fKnee: -0.25, bThigh: -0.2, bKnee: -0.15,
      fUpper: 0.5 * guard, fElbow: 2.0 * guard + 0.3, bUpper: 0.25 * guard, bElbow: 2.2 * guard + 0.2, head: 0.05 });
  },
  walk(t, speed = 1) {
    const s = Math.sin(t * 0.2 * speed), c = Math.cos(t * 0.2 * speed);
    return pose({ hy: -20 + Math.abs(c) * -1, rot: 0.08, fThigh: s * 0.55, fKnee: -0.2 - Math.max(0, -s) * 0.7,
      bThigh: -s * 0.55, bKnee: -0.2 - Math.max(0, s) * 0.7,
      fUpper: 0.45 - s * 0.35, fElbow: 1.7, bUpper: 0.2 + s * 0.35, bElbow: 1.8 });
  },
  run(t) {
    const s = Math.sin(t * 0.32), c = Math.cos(t * 0.32);
    return pose({ hy: -19 - Math.abs(c) * 1.5, rot: 0.32, fThigh: s * 0.95 + 0.2, fKnee: -0.3 - Math.max(0, -s) * 1.3,
      bThigh: -s * 0.95 + 0.2, bKnee: -0.3 - Math.max(0, s) * 1.3,
      fUpper: -s * 0.9 + 0.3, fElbow: 1.6, bUpper: s * 0.9 + 0.3, bElbow: 1.6, head: -0.2 });
  },
  hurt(t) {
    const k = Math.min(1, t / 4);
    return pose({ hx: -1.5 * k, hy: -19, rot: -0.35 * k, head: -0.4 * k, fThigh: 0.25, fKnee: -0.3, bThigh: -0.3, bKnee: -0.2,
      fUpper: -0.6, fElbow: 0.6, bUpper: -1.0, bElbow: 0.5 });
  },
  // Airborne knockdown: tumble backwards.
  fall(t, vz) {
    const r = -0.6 - clamp(-vz * 0.18, -0.4, 0.9);
    return pose({ hy: -16, rot: r, head: -0.4, fThigh: 0.7, fKnee: -0.9, bThigh: 0.4, bKnee: -0.4,
      fUpper: -1.6, fElbow: 0.4, bUpper: -2.2, bElbow: 0.3 });
  },
  // Lying on the back, head behind.
  down() {
    return pose({ hx: 2, hy: -3, rot: -1.5, head: 0.2, fThigh: 0.15, fKnee: -0.2, bThigh: 0.05, bKnee: -0.1,
      fUpper: -0.4, fElbow: 0.2, bUpper: 0.3, bElbow: 0.3 });
  },
  getup(t) {
    const k = clamp(t / 16, 0, 1);
    return lerpPose(Poses.down(), pose({ hy: -14, rot: 0.5, fThigh: 1.2, fKnee: -1.9, bThigh: -0.3, bKnee: -1.4, fUpper: 0.6, fElbow: 0.4, bUpper: 0.1, bElbow: 0.3 }), easeOut(k));
  },
  jump(vz) {
    const up = vz > 0;
    return pose({ hy: -21, rot: 0.1, fThigh: up ? 0.9 : 0.5, fKnee: up ? -1.6 : -0.9, bThigh: up ? 0.2 : -0.1, bKnee: up ? -1.4 : -0.6,
      fUpper: up ? 2.4 : 1.2, fElbow: 0.4, bUpper: up ? -0.8 : -0.3, bElbow: 0.6 });
  },
  crouch() { // landing / jump squat
    return pose({ hy: -15, rot: 0.25, fThigh: 0.9, fKnee: -1.5, bThigh: -0.2, bKnee: -1.2, fUpper: 0.6, fElbow: 1.6, bUpper: 0.2, bElbow: 1.6 });
  },
  grabbed(t) {
    const s = Math.sin(t * 0.5) * 0.1;
    return pose({ hy: -19, rot: -0.25 + s, head: -0.3, fThigh: 0.2, fKnee: -0.4, bThigh: -0.2, bKnee: -0.3, fUpper: -0.9 + s, fElbow: 1.4, bUpper: -1.3, bElbow: 1.0 });
  },
  dead() { return Poses.down(); },
};

// Solve joint positions for a pose at scale s.
function solveRig(p, s, dims) {
  const L = dims;
  const H = { x: p.hx * s, y: p.hy * s };
  const tTh = Math.PI - p.rot;
  const S = { x: H.x + dirX(tTh) * L.torso * s, y: H.y + dirY(tTh) * L.torso * s };
  const hd = tTh + p.head;
  const Hd = { x: S.x + dirX(hd) * L.neck * s, y: S.y + dirY(hd) * L.neck * s };
  const down = -p.rot;
  const leg = (th, kn) => {
    const a = down + th, b = a + kn;
    const K = { x: H.x + dirX(a) * L.thigh * s, y: H.y + dirY(a) * L.thigh * s };
    const F = { x: K.x + dirX(b) * L.shin * s, y: K.y + dirY(b) * L.shin * s };
    return { K, F, a, b };
  };
  const arm = (up, el) => {
    const a = down + up, b = a + el;
    const E = { x: S.x + dirX(a) * L.upper * s, y: S.y + dirY(a) * L.upper * s };
    const Hn = { x: E.x + dirX(b) * L.fore * s, y: E.y + dirY(b) * L.fore * s };
    return { E, H: Hn, a, b };
  };
  return { H, S, Hd, tTh, fl: leg(p.fThigh, p.fKnee), bl: leg(p.bThigh, p.bKnee), fa: arm(p.fUpper, p.fElbow), ba: arm(p.bUpper, p.bElbow) };
}

const DIMS_HUMAN = { thigh: 10, shin: 10, torso: 15, neck: 7, upper: 8, fore: 8 };

// Draw a humanoid from a style:
// style = { s, dims, skin, hair, top, top2, pants, boots, belt, hipW, shW, limbW, head(fn), torso(fn), hand(fn) }
function drawHumanoid(p, st) {
  const s = st.s || 1;
  const R = solveRig(p, s, st.dims || DIMS_HUMAN);
  const lw = (st.limbW || 5) * s;
  const back = c => shade(c, -0.32);
  // back arm
  Px.limb(R.S.x, R.S.y, R.ba.E.x, R.ba.E.y, lw * 0.9, lw * 0.8, back(st.sleeve || st.top));
  Px.limb(R.ba.E.x, R.ba.E.y, R.ba.H.x, R.ba.H.y, lw * 0.8, lw * 0.7, back(st.arm || st.skin));
  if (st.backHand) st.backHand(R.ba.H, R.ba.b, s, R); else Px.disc(R.ba.H.x, R.ba.H.y, 1.8 * s, back(st.glove || st.skin));
  // back leg
  Px.limb(R.H.x, R.H.y, R.bl.K.x, R.bl.K.y, lw * 1.2, lw, back(st.pants));
  Px.limb(R.bl.K.x, R.bl.K.y, R.bl.F.x, R.bl.F.y, lw, lw * 0.9, back(st.shin || st.pants));
  drawBoot(R.bl.F, R.bl.b, s, back(st.boots));
  // torso
  Px.quad(R.H.x, R.H.y, R.S.x, R.S.y, (st.hipW || 9) * s, (st.shW || 12) * s, st.top);
  if (st.torso) st.torso(R, s);
  if (st.belt) {
    const bx = lerp(R.H.x, R.S.x, 0.1), by = lerp(R.H.y, R.S.y, 0.1);
    Px.quad(bx - dirX(R.tTh) * s, by - dirY(R.tTh) * s, bx + dirX(R.tTh) * s * 1.5, by + dirY(R.tTh) * s * 1.5, (st.hipW || 9) * s + 1, (st.hipW || 9) * s + 1, st.belt);
  }
  // front leg
  Px.limb(R.H.x, R.H.y, R.fl.K.x, R.fl.K.y, lw * 1.2, lw, st.pants);
  Px.limb(R.fl.K.x, R.fl.K.y, R.fl.F.x, R.fl.F.y, lw, lw * 0.9, st.shin || st.pants);
  drawBoot(R.fl.F, R.fl.b, s, st.boots);
  // head
  if (st.head) st.head(R.Hd, R.tTh + p.head, s, R); else Px.disc(R.Hd.x, R.Hd.y, 5 * s, st.skin);
  // front arm
  Px.limb(R.S.x, R.S.y, R.fa.E.x, R.fa.E.y, lw * 0.9, lw * 0.8, st.sleeve || st.top);
  Px.limb(R.fa.E.x, R.fa.E.y, R.fa.H.x, R.fa.H.y, lw * 0.8, lw * 0.7, st.arm || st.skin);
  if (st.hand) st.hand(R.fa.H, R.fa.b, s, R); else Px.disc(R.fa.H.x, R.fa.H.y, 2 * s, st.glove || st.skin);
  if (st.after) st.after(R, s);
  return R;
}
function drawBoot(F, ang, s, c) {
  // boot points forward relative to the shin
  const fx = F.x + dirX(ang + Math.PI / 2) * 3 * s, fy = F.y + dirY(ang + Math.PI / 2) * 3 * s;
  Px.limb(F.x - dirX(ang + Math.PI / 2) * 1 * s, F.y - dirY(ang + Math.PI / 2) * 1 * s, fx, fy, 3.5 * s, 3 * s, c);
}
