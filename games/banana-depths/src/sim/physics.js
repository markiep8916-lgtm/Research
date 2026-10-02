// Player movement physics. Pure functions over a plain body object + a grid-like world `W`
// (W.tile(tx,ty), W.breakTile(tx,ty,kind), W.crumble(tx,ty)). No DOM / Three.js: the very same code
// drives the game and the headless reachability solver (tools/).
//
// Units: 1 tile = 1 world unit. Body (x, y) = bottom-centre of the hitbox. Fixed step DT = 1/60.
import { T, FLAGS, F_SOLID, F_ONEWAY, F_CLIMB } from './tiles.js';

export const DT = 1 / 60;
const EPS = 1e-4;

export const P = ({
  hw: 0.5, h: 1.7, rollHw: 0.42, rollH: 0.9,
  runV: 7.4, accel: 62, decel: 72, skid: 95, airAccel: 44, airDecel: 12, overDecelGround: 30,
  gravity: 58, fallMul: 1.12, apexMul: 0.62, apexV: 2.6, maxFall: 26,
  jumpV: 19.5, jumpCutV: 7.0, coyote: 0.1, jumpBuf: 0.13,
  rollV: 11.5, rollT: 0.55, rollEaseT: 0.14, tunnelV: 6.0, rollJumpV: 18.8, rollJumpT: 0.74, rollCd: 0.1,
  wallSlideV: 3.8, wallJumpVx: 9.2, wallJumpVy: 18.6, wallLockT: 0.17, wallCoyote: 0.11, wallProbe: 0.07,
  climbUp: 4.8, climbDown: 6.2, climbJumpV: 14.5, climbJumpVx: 7.0, climbCd: 0.18,
  poundWind: 0.22, poundV: 34, poundLand: 0.16,
  springV: 27, springBoostV: 33, springCd: 0.12,
  stepUp: 0.34, corner: 0.32, dropT: 0.2,
});

export const NEUTRAL = Object.freeze({ dx: 0, dy: 0, jump: false, jumpP: false, rollP: false, poundP: false });

export function createBody(x = 0, y = 0) {
  return {
    x, y, vx: 0, vy: 0, face: 1, hw: P.hw, h: P.h,
    ground: false, mode: 'move', // 'move' | 'roll' | 'climb' | 'pound'
    coyote: 0, jumpBuf: 0, rollT: 0, rollCd: 0, poundT: 0, poundPhase: 0,
    wallDir: 0, wallCoyote: 0, wallLock: 0, dropT: 0, stun: 0, landLock: 0, climbCd: 0, springCd: 0,
    jumping: false, sliding: 0, supportTile: 0, airTime: 0,
    abil: { roll: false, pound: false, grip: false, boom: false },
    events: [],
  };
}

export function cloneBody(b) {
  const c = { ...b, abil: { ...b.abil }, events: [] };
  return c;
}

const approach = (v, target, delta) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

export function overlapsSolid(W, x, y, hw, h) {
  const l = Math.floor(x - hw + EPS), r = Math.floor(x + hw - EPS);
  const bot = Math.floor(y + EPS), top = Math.floor(y + h - EPS);
  for (let ty = bot; ty <= top; ty++) for (let tx = l; tx <= r; tx++) if (FLAGS[W.tile(tx, ty)] & F_SOLID) return true;
  return false;
}

/** Best supporting tile just under the feet (0 if none). Priority: spring > crumble > solid > one-way.
 *  Also snaps the feet flush onto the surface so nothing hovers a hair above the floor. */
export function groundTile(b, W) {
  const row = Math.floor(b.y - 0.03);
  const l = Math.floor(b.x - b.hw + EPS), r = Math.floor(b.x + b.hw - EPS);
  let best = 0, bestP = 0;
  for (let tx = l; tx <= r; tx++) {
    const t = W.tile(tx, row);
    const f = FLAGS[t];
    let pr = 0;
    if (f & F_SOLID) pr = t === T.SPRING ? 4 : t === T.CRUMBLE ? 3 : 2;
    else if ((f & F_ONEWAY) && b.dropT <= 0 && b.y >= row + 1 - 0.03) pr = 1;
    if (pr > bestP) { bestP = pr; best = t; }
  }
  if (best) b.y = row + 1;
  return best;
}

function wallSolid(b, W, dir) {
  const x = b.x + dir * (b.hw + P.wallProbe);
  const tx = Math.floor(x);
  const r0 = Math.floor(b.y + 0.4), r1 = Math.floor(b.y + b.h - 0.4);
  for (let ty = r0; ty <= r1; ty++) if (FLAGS[W.tile(tx, ty)] & F_SOLID) return true;
  return false;
}

export function moveX(b, W, dx, o = {}) {
  if (dx === 0) return 0;
  b.x += dx;
  const dir = dx > 0 ? 1 : -1;
  const edge = dir > 0 ? b.x + b.hw : b.x - b.hw;
  const col = Math.floor(edge);
  const bot = Math.floor(b.y + EPS), top = Math.floor(b.y + b.h - EPS);
  let blocked = false, maxTop = -Infinity;
  for (let ty = bot; ty <= top; ty++) {
    const t = W.tile(col, ty);
    if (!(FLAGS[t] & F_SOLID)) continue;
    if (o.breakRoll && t === T.ROLL_BLOCK) {
      W.breakTile(col, ty, 'roll');
      b.events.push({ type: 'break', tx: col, ty, kind: 'roll' });
      o.broke = true;
      continue;
    }
    blocked = true;
    if (ty + 1 > maxTop) maxTop = ty + 1;
  }
  if (!blocked) return 0;
  const rise = maxTop - b.y;
  if (rise > 0 && rise <= P.stepUp && !overlapsSolid(W, b.x, maxTop, b.hw, b.h)) {
    b.y = maxTop; // forgiving ledge pop
    return 0;
  }
  b.x = dir > 0 ? col - b.hw - EPS : col + 1 + b.hw + EPS;
  return dir;
}

export function moveY(b, W, dy, o = {}) {
  const res = { landed: false, bumped: false, broke: 0 };
  if (dy === 0) return res;
  const oldBottom = b.y;
  b.y += dy;
  const l = Math.floor(b.x - b.hw + EPS), r = Math.floor(b.x + b.hw - EPS);
  if (dy < 0) {
    const row = Math.floor(b.y);
    let land = false;
    for (let tx = l; tx <= r; tx++) {
      const t = W.tile(tx, row);
      const f = FLAGS[t];
      if (f & F_SOLID) {
        if (o.pound && t === T.POUND_BLOCK) {
          W.breakTile(tx, row, 'pound');
          b.events.push({ type: 'break', tx, ty: row, kind: 'pound' });
          res.broke++;
          continue;
        }
        if (oldBottom >= row + 1 - 1e-3) land = true;
      } else if ((f & F_ONEWAY) && !o.ignoreOneway && b.dropT <= 0 && oldBottom >= row + 1 - 1e-3) {
        land = true;
      }
    }
    if (land) { b.y = row + 1; res.landed = true; }
  } else {
    const row = Math.floor(b.y + b.h);
    let hitL = false, hitR = false, hit = false;
    for (let tx = l; tx <= r; tx++) {
      if (FLAGS[W.tile(tx, row)] & F_SOLID) { hit = true; if (tx === l) hitL = true; if (tx === r) hitR = true; }
    }
    if (hit) {
      let fixed = false;
      if (l !== r && hitL !== hitR) {
        // clipped a ceiling corner: nudge sideways instead of bonking
        const ov = hitL ? (l + 1) - (b.x - b.hw) : (b.x + b.hw) - r;
        if (ov <= P.corner) {
          const nx = b.x + (hitL ? ov + EPS : -(ov + EPS));
          if (!overlapsSolid(W, nx, b.y, b.hw, b.h)) { b.x = nx; fixed = true; }
        }
      }
      if (!fixed) { b.y = row - b.h - EPS; res.bumped = true; }
    }
  }
  return res;
}

function unstick(b, W) {
  for (let i = 1; i <= 12; i++) {
    if (!overlapsSolid(W, b.x, b.y + i * 0.25, b.hw, b.h)) { b.y += i * 0.25; b.vy = Math.max(b.vy, 0); return; }
  }
}

function hazardCheck(b, W) {
  const l = Math.floor(b.x - b.hw), r = Math.floor(b.x + b.hw);
  const bot = Math.floor(b.y), top = Math.floor(b.y + b.h);
  const bl = b.x - b.hw + 0.12, br = b.x + b.hw - 0.12, bb = b.y + 0.05, bt = b.y + b.h - 0.05;
  for (let ty = bot; ty <= top; ty++) {
    for (let tx = l; tx <= r; tx++) {
      const t = W.tile(tx, ty);
      if (t === T.SPIKE_UP) {
        if (br > tx + 0.1 && bl < tx + 0.9 && bb < ty + 0.55 && bt > ty) return { kind: 'spike', tx, ty };
      } else if (t === T.SPIKE_DOWN) {
        if (br > tx + 0.1 && bl < tx + 0.9 && bt > ty + 0.45 && bb < ty + 1) return { kind: 'spike', tx, ty };
      } else if (t === T.LAVA) {
        if (bb < ty + 0.85 && bt > ty) return { kind: 'lava', tx, ty };
      } else if (t === T.WATER) {
        if (bb < ty + 0.8 && bt > ty) return { kind: 'water', tx, ty };
      }
    }
  }
  return null;
}

function startRoll(b) {
  b.mode = 'roll';
  b.hw = P.rollHw;
  b.h = P.rollH;
  b.rollT = P.rollT;
  b.vx = b.face * P.rollV;
  b.events.push({ type: 'roll' });
}

function endRoll(b) {
  b.mode = 'move';
  b.hw = P.hw;
  b.h = P.h;
  b.rollT = 0;
  b.rollCd = P.rollCd;
  b.events.push({ type: 'rollEnd' });
}

function enterClimb(b, W) {
  const cx = Math.floor(b.x) + 0.5;
  b.mode = 'climb';
  b.vx = 0;
  b.vy = 0;
  b.ground = false;
  b.jumping = false;
  if (!overlapsSolid(W, cx, b.y, b.hw, b.h)) b.x = cx;
  b.events.push({ type: 'climb' });
}

const climbable = (W, x, y) => (FLAGS[W.tile(Math.floor(x), Math.floor(y))] & F_CLIMB) !== 0;

function stepClimb(b, inp, W) {
  const tx = Math.floor(b.x) + 0.5;
  b.x += (tx - b.x) * 0.5;
  if (Math.abs(tx - b.x) < 0.01) b.x = tx;

  if (inp.jumpP) {
    b.mode = 'move';
    b.climbCd = P.climbCd;
    b.vx = inp.dx * P.climbJumpVx;
    b.vy = inp.dy < 0 ? -2 : P.climbJumpV;
    b.jumping = inp.dy >= 0;
    if (inp.dx) b.face = inp.dx;
    b.events.push({ type: 'jump', climb: true });
    return;
  }
  const vy = inp.dy > 0 ? P.climbUp : inp.dy < 0 ? -P.climbDown : 0;
  b.vx = 0;
  b.vy = vy;
  const res = moveY(b, W, vy * DT, { ignoreOneway: true });
  if (res.landed) {
    b.mode = 'move'; b.ground = true; b.vy = 0;
    b.events.push({ type: 'land', speed: 0 });
    return;
  }
  const on = climbable(W, b.x, b.y + 0.3) || climbable(W, b.x, b.y + 1.0);
  if (!on) {
    if (vy > 0) {
      b.y = Math.floor(b.y + 0.3) ; // pop up onto the top of the ladder
      b.mode = 'move'; b.vy = 0; b.climbCd = P.climbCd;
    } else {
      b.mode = 'move'; b.vy = -1; b.climbCd = P.climbCd;
    }
  }
}

function stepPound(b, inp, W) {
  b.vx = 0;
  if (b.poundPhase === 0) {
    b.vy = 0;
    b.poundT -= DT;
    if (b.poundT <= 0) {
      b.poundPhase = 1;
      b.vy = -P.poundV;
      b.events.push({ type: 'poundSlam' });
    }
    return;
  }
  const res = moveY(b, W, b.vy * DT, { pound: true });
  if (res.landed) {
    b.mode = 'move'; b.ground = true; b.vy = 0; b.landLock = P.poundLand; b.poundPhase = 0;
    b.events.push({ type: 'poundImpact', x: b.x, y: b.y, broke: res.broke });
  }
}

function stepMove(b, inp, W) {
  const vyPre = b.vy;
  // ---- ground state
  b.supportTile = b.vy <= 0 ? groundTile(b, W) : 0;
  b.ground = b.supportTile !== 0;
  if (b.ground) { b.coyote = P.coyote; b.wallCoyote = 0; b.jumping = false; b.airTime = 0; } else b.airTime += DT;
  if (inp.jumpP) b.jumpBuf = P.jumpBuf;

  // springs: bounce as soon as we stand on one
  if (b.ground && b.supportTile === T.SPRING && b.springCd <= 0) {
    b.vy = inp.jump ? P.springBoostV : P.springV;
    b.ground = false; b.supportTile = 0; b.springCd = P.springCd; b.jumping = false; b.coyote = 0;
    b.events.push({ type: 'spring' });
  }
  if (b.ground && b.supportTile === T.CRUMBLE) {
    const row = Math.floor(b.y - 0.03);
    for (let tx = Math.floor(b.x - b.hw + EPS); tx <= Math.floor(b.x + b.hw - EPS); tx++) if (W.tile(tx, row) === T.CRUMBLE) W.crumble(tx, row);
  }

  // drop through one-way floors
  if (b.ground && inp.dy < 0 && inp.jumpP && !(FLAGS[b.supportTile] & F_SOLID)) {
    b.dropT = P.dropT; b.ground = false; b.supportTile = 0; b.coyote = 0; b.jumpBuf = 0; b.vy = -2;
    b.events.push({ type: 'drop' });
  }

  // ---- abilities
  if (inp.rollP && b.abil.roll && b.mode === 'move' && b.ground && b.rollCd <= 0 && b.landLock <= 0) startRoll(b);
  if (inp.poundP && b.abil.pound && b.mode === 'move' && !b.ground && b.landLock <= 0) {
    b.mode = 'pound'; b.poundPhase = 0; b.poundT = P.poundWind; b.vx = 0; b.vy = 0;
    b.events.push({ type: 'poundStart' });
    return;
  }

  // ---- roll upkeep
  if (b.mode === 'roll') {
    b.rollT -= DT;
    if (b.rollT > 0) {
      const k = Math.min(1, b.rollT / P.rollEaseT);
      b.vx = b.face * (P.runV + (P.rollV - P.runV) * k);
    } else if (!overlapsSolid(W, b.x, b.y, P.hw, P.h)) {
      endRoll(b);
    } else {
      // stuck in a tunnel: stay a ball and roll about under direct control
      b.vx = approach(b.vx, inp.dx * P.tunnelV, 90 * DT);
      if (inp.dx) b.face = inp.dx;
    }
  }

  // ---- horizontal control
  let dx = inp.dx;
  if (b.wallLock > 0 && dx === b.wallDir) dx = 0;
  if (b.landLock > 0) dx = 0;
  if (b.mode === 'move') {
    const target = dx * P.runV;
    const sg = sign(b.vx);
    if (Math.abs(b.vx) > P.runV + 0.01 && dx === sg) {
      if (b.ground) b.vx = approach(b.vx, target, P.overDecelGround * DT);
    } else {
      let a;
      if (b.ground) a = dx === 0 ? P.decel : (sg !== 0 && dx !== sg && Math.abs(b.vx) > 1 ? P.skid : P.accel);
      else a = dx === 0 ? P.airDecel : (sg !== 0 && dx !== sg ? P.airAccel * 1.4 : P.airAccel);
      b.vx = approach(b.vx, target, a * DT);
    }
    if (dx) b.face = dx;
  }

  // ---- jumping
  if (b.jumpBuf > 0) {
    if (b.coyote > 0) {
      const rolling = b.mode === 'roll';
      b.vy = rolling ? P.rollJumpV : P.jumpV;
      b.jumping = true; b.ground = false; b.supportTile = 0; b.coyote = 0; b.jumpBuf = 0;
      if (rolling) b.rollT = Math.max(b.rollT, P.rollJumpT);
      b.events.push({ type: 'jump', roll: rolling });
    } else if (b.abil.grip && b.wallCoyote > 0 && b.mode === 'move') {
      b.vx = -b.wallDir * P.wallJumpVx;
      b.vy = P.wallJumpVy;
      b.face = -b.wallDir;
      b.wallLock = P.wallLockT; b.wallCoyote = 0; b.jumpBuf = 0; b.jumping = true; b.sliding = 0;
      b.events.push({ type: 'walljump', dir: b.face });
    }
  }

  // ---- gravity
  if (!b.ground) {
    let g = P.gravity;
    if (b.vy < 0) g *= P.fallMul;
    else if (inp.jump && Math.abs(b.vy) < P.apexV) g *= P.apexMul;
    b.vy -= g * DT;
    if (b.vy < -P.maxFall) b.vy = -P.maxFall;
    if (b.sliding !== 0 && b.vy < -P.wallSlideV) b.vy = -P.wallSlideV;
    if (b.jumping && !inp.jump && b.vy > P.jumpCutV) b.vy = P.jumpCutV;
    if (b.vy <= 0) b.jumping = false;
  } else if (b.vy < 0) b.vy = 0;

  // ---- integrate
  const o = { breakRoll: b.mode === 'roll' && Math.abs(b.vx) > 6 };
  const hitX = moveX(b, W, b.vx * DT, o);
  if (hitX) {
    if (b.mode === 'roll' && b.rollT > 0) b.rollT = 0; // a wall ends the roll
    b.vx = 0;
  } else if (o.broke) b.vx *= 0.92;

  b.sliding = 0;
  if (!b.ground) {
    const res = moveY(b, W, b.vy * DT, {});
    if (res.landed) {
      b.events.push({ type: 'land', speed: -b.vy });
      b.vy = 0; b.ground = true; b.supportTile = groundTile(b, W);
      b.coyote = P.coyote; b.jumping = false;
    } else if (res.bumped && b.vy > 0) b.vy = 0;
  }

  // ---- wall cling (needs the Gorilla Grip)
  if (b.abil.grip && !b.ground && b.mode === 'move' && b.vy <= 0.5 && dx !== 0 && wallSolid(b, W, dx)) {
    b.sliding = dx; b.wallDir = dx; b.wallCoyote = P.wallCoyote;
  }

  // ---- climbing entry
  if (b.mode === 'move' && b.climbCd <= 0) {
    const cx = Math.floor(b.x);
    if (inp.dy > 0 && (climbable(W, cx, b.y + 0.3) || climbable(W, cx, b.y + 1.0))) enterClimb(b, W);
    else if (inp.dy < 0 && b.ground && W.tile(cx, Math.floor(b.y - 0.05)) === T.LADDER_TOP) {
      enterClimb(b, W);
      b.y -= 0.45;
    }
  }

  // ---- uncurl in mid-air as soon as the roll ends handled above; also keep roll hitbox flush on ground
  void vyPre;
}

/** Abort roll / climb / pound (used when Kong gets hurt). A roll only ends if there is headroom to stand. */
export function cancelState(b, W) {
  if (b.mode === 'roll') {
    b.rollT = 0;
    if (!overlapsSolid(W, b.x, b.y, P.hw, P.h)) { b.mode = 'move'; b.hw = P.hw; b.h = P.h; b.rollCd = P.rollCd; }
  } else if (b.mode === 'climb' || b.mode === 'pound') {
    b.mode = 'move'; b.poundPhase = 0; b.climbCd = P.climbCd;
  }
}

export function stepBody(b, inp, W) {
  b.events.length = 0;
  if (b.stun > 0) { b.stun -= DT; inp = NEUTRAL; }
  b.coyote = Math.max(0, b.coyote - DT);
  b.jumpBuf = Math.max(0, b.jumpBuf - DT);
  b.rollCd = Math.max(0, b.rollCd - DT);
  b.wallCoyote = Math.max(0, b.wallCoyote - DT);
  b.wallLock = Math.max(0, b.wallLock - DT);
  b.dropT = Math.max(0, b.dropT - DT);
  b.landLock = Math.max(0, b.landLock - DT);
  b.climbCd = Math.max(0, b.climbCd - DT);
  b.springCd = Math.max(0, b.springCd - DT);

  if (b.mode !== 'climb' && overlapsSolid(W, b.x, b.y, b.hw, b.h)) unstick(b, W);

  if (b.mode === 'climb') stepClimb(b, inp, W);
  else if (b.mode === 'pound') stepPound(b, inp, W);
  else stepMove(b, inp, W);

  const hz = hazardCheck(b, W);
  if (hz) b.events.push({ type: 'hazard', ...hz });
  return b;
}
