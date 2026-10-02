// Headless reachability solver. Uses the REAL player physics (src/sim/physics.js) to explore what Kong can
// reach in a room with a given set of abilities. It does a BFS over "decision states" (standing, climbing,
// ball-in-tunnel, wall-cling) by simulating macro input sequences (run-up + jump variants, rolls, climbs,
// wall-jumps, pounds). Breakable tiles and switch gates are handled by a fixed-point loop.
import { Grid } from '../src/sim/grid.js';
import { createBody, stepBody, NEUTRAL, P } from '../src/sim/physics.js';
import { T, FLAGS, F_SOLID, F_CLIMB, F_ONEWAY } from '../src/sim/tiles.js';

const QX = 0.5;                 // x quantisation of decision states
const MAX_FLIGHT = 260;         // frames per macro
const inp = (o) => ({ ...NEUTRAL, ...o });

/** Grid view with a private overlay so one macro's tile breaks do not leak into the next macro. */
class SimWorld {
  constructor(base, broken) { this.base = base; this.broken = broken; this.over = new Map(); this.newBroken = []; }
  reset() { this.over.clear(); this.newBroken.length = 0; }
  tile(tx, ty) {
    const k = ty * 4096 + tx;
    const o = this.over.get(k);
    if (o !== undefined) return o;
    return this.base.tile(tx, ty);
  }
  set(tx, ty, t) { this.over.set(ty * 4096 + tx, t); }
  breakTile(tx, ty, kind) {
    this.set(tx, ty, T.EMPTY); this.newBroken.push([tx, ty]);
    if (kind === 'roll') for (const dir of [1, -1]) for (let y = ty + dir; this.tile(tx, y) === T.ROLL_BLOCK; y += dir) { this.set(tx, y, T.EMPTY); this.newBroken.push([tx, y]); }
  }
  crumble() {}
}

export function arrivalFor(def, ch) {
  const p = def.portals[ch];
  const cx = (p.x0 + p.x1) / 2 + 0.5;
  switch (p.side) {
    case 'left': return { x: 2.3, y: p.y0, face: 1, vy: 0 };
    case 'right': return { x: def.w - 2.3, y: p.y0, face: -1, vy: 0 };
    case 'top': return { x: cx, y: def.h - 3.2, face: 1, vy: 0 };
    default: return { x: cx, y: p.y1 + 0.6, face: 1, vy: 14 };
  }
}

function portalAtBody(def, b) {
  const tx = Math.floor(b.x), ty = Math.floor(b.y + 0.8);
  const cx = Math.max(0, Math.min(def.w - 1, tx)), cy = Math.max(0, Math.min(def.h - 1, ty));
  for (const [ch, p] of Object.entries(def.portals)) for (const c of p.cells) if (c.x === cx && c.y === cy) return ch;
  return null;
}

/**
 * @param def built room
 * @param opts { abil:{roll,pound,grip,boom}, starts:[{x,y,face,vy,label}], broken:Set<"x,y">, gates:{A,B}, maxStates }
 */
export function solveRoom(def, opts = {}) {
  const abil = { roll: false, pound: false, grip: false, boom: false, ...(opts.abil || {}) };
  const broken = new Set(opts.broken || []);
  const gates = { A: !!(opts.gates && opts.gates.A), B: !!(opts.gates && opts.gates.B) };
  const starts = opts.starts || [];
  const maxStates = opts.maxStates || 30000;
  const hasPound = (() => { for (let i = 0; i < def.tiles.length; i++) if (def.tiles[i] === T.POUND_BLOCK) return true; return false; })();
  const hasSlopeOneway = true; void hasSlopeOneway;

  for (let iter = 0; iter < 12; iter++) {
    const base = new Grid(def.w, def.h, def.tiles.slice(), def.open);
    for (const k of broken) { const [x, y] = k.split(',').map(Number); base.set(x, y, T.EMPTY); }
    if (gates.A || gates.B) for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) { const t = base.tiles[y * def.w + x]; if ((gates.A && t === T.GATE_A) || (gates.B && t === T.GATE_B)) base.set(x, y, T.EMPTY); }
    const res = bfs(def, base, abil, starts, broken, maxStates, hasPound);
    // switches: boomerang (or slap) from a reachable state opens gates
    let changed = false;
    for (const m of def.marks) {
      if (m.kind !== 'switchA' && m.kind !== 'switchB') continue;
      const gk = m.kind === 'switchA' ? 'A' : 'B';
      if (gates[gk]) continue;
      if (switchHit(def, base, res.states, m, abil, gk === 'A' ? def.props.slapA : def.props.slapB)) { gates[gk] = true; changed = true; }
    }
    for (const k of res.newBroken) if (!broken.has(k)) { broken.add(k); changed = true; }
    if (!changed) return { ...res, broken, gates, abil };
  }
  throw new Error('solver did not converge');
}

function switchHit(def, base, states, m, abil, slapOk) {
  const sx = m.x + 0.5, sy = m.y + 0.65;
  for (const s of states.values()) {
    if (s.mode === 'ball') continue;
    if (abil.boom && Math.abs(s.y + 1.15 - sy) < 0.95 && Math.abs(sx - s.x) <= 8.2) {
      const row = Math.floor(s.y + 1.15), x0 = Math.floor(s.x), x1 = Math.floor(sx);
      let clear = true;
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (FLAGS[base.tile(x, row)] & F_SOLID) { clear = false; break; }
      if (clear) return true;
    }
    if (slapOk && Math.abs(sx - s.x) < 1.9 && Math.abs(sy - (s.y + 1)) < 1.3) return true;
  }
  return false;
}

function bfs(def, base, abil, starts, brokenIn, maxStates, hasPound) {
  const W = new SimWorld(base, brokenIn);
  const states = new Map();            // key -> state
  const queue = [];
  const reach = { portals: new Set(), marks: new Set() };
  const newBroken = new Set();
  const marks = def.marks.map((m, i) => ({ i, m, l: m.x, r: m.x + 1, b: m.y, t: m.y + (m.kind === 'relic' ? 2 : 1.4) }));
  const interesting = marks.filter((o) => ['relic', 'heart', 'banana', 'save', 'goal', 'boss', 'switchA', 'switchB', 'sign', 'start'].includes(o.m.kind));

  const hasClimb = (() => { for (let i = 0; i < def.tiles.length; i++) if (FLAGS[def.tiles[i]] & F_CLIMB) return true; return false; })();
  const keyOf = (s) => `${Math.round(s.x / QX)},${Math.round(s.y * 4)},${s.mode}${s.dir || ''}`;
  const addState = (s) => {
    const k = keyOf(s);
    if (states.has(k)) return false;
    if (states.size >= maxStates) return false;
    states.set(k, s); queue.push(s); return true;
  };

  function mkBody(s, extra = {}) {
    const b = createBody(s.x, s.y);
    b.abil = { ...abil };
    b.face = s.face || 1;
    if (s.mode === 'ball') { b.mode = 'roll'; b.hw = P.rollHw; b.h = P.rollH; b.rollT = 0; b.ground = true; }
    if (s.mode === 'climb') { b.mode = 'climb'; b.x = Math.floor(s.x) + 0.5; }
    if (s.mode === 'wall') { b.vy = -1; b.sliding = s.dir; b.wallDir = s.dir; b.wallCoyote = 0.1; }
    Object.assign(b, extra);
    return b;
  }

  /** Run one macro. script(frame, body) -> input. Decision states are only recorded from frame `minF` on;
   *  with recordGround the macro keeps going and records every standing state it passes. */
  function sim(s, script, { maxF = MAX_FLIGHT, recordGround = false, minF = 2 } = {}) {
    W.reset();
    const b = mkBody(s, s.vy ? { vy: s.vy } : {});
    let last = null, edgeDone = false;
    const flush = () => { for (const [x, y] of W.newBroken) newBroken.add(x + ',' + y); };
    for (let f = 0; f < maxF; f++) {
      const o = script(f, b);
      stepBody(b, o, W);
      for (const ev of b.events) if (ev.type === 'hazard') return;
      if (b.y < -1.5) return;
      const bl = b.x - b.hw, br = b.x + b.hw, bb = b.y, bt = b.y + b.h;
      for (const o2 of interesting) if (br > o2.l && bl < o2.r && bt > o2.b && bb < o2.t) reach.marks.add(o2.i);
      const pch = portalAtBody(def, b);
      if (pch) { reach.portals.add(pch); flush(); return; }
      if (f < minF) continue;
      if (b.mode === 'climb') { rec(b, 'climb'); if (!o.keepClimb) { flush(); return; } continue; }
      if (b.sliding !== 0 && abil.grip && !b.ground && b.mode === 'move') { rec(b, 'wall'); flush(); return; }
      if (b.ground && b.mode === 'move' && Math.abs(b.vy) < 0.01) {
        if (!recordGround) { rec(b, 'stand'); flush(); return; }
        rec(b, 'stand'); last = { x: b.x, y: b.y, face: b.face }; edgeDone = false;
      } else if (recordGround && last && !edgeDone && !b.ground) {
        // walked off a ledge: remember the very last standing spot so maximum-range jumps are explored
        addState({ x: last.x, y: last.y, mode: 'stand', face: last.face, dir: 'e' }); edgeDone = true;
      }
      if (b.ground && b.mode === 'roll' && b.h < P.h && b.rollT <= 0) rec(b, 'ball');
    }
    flush();
  }

  function rec(b, mode) {
    const s = { x: b.x, y: b.y, mode: mode === 'stand' ? 'stand' : mode, face: b.face };
    if (mode === 'wall') s.dir = b.sliding;
    // snap climbing states and quantise y of ground states (always integer)
    addState(s);
  }

  // ---------------------------------------------------------------- start states
  for (const st of starts) {
    const s0 = { x: st.x, y: st.y, mode: 'start', face: st.face || 1, vy: st.vy || 0 };
    sim(s0, () => inp({}), { minF: 1 });
    // also allow stepping into a ladder immediately
    sim(s0, () => inp({ dy: 1 }), { minF: 1 });
  }

  // ---------------------------------------------------------------- expansion
  const JUMP_HOLD = [5, 11, 60];
  const RUNUP = [0, 8, 22];
  while (queue.length) {
    const s = queue.shift();
    if (s.mode === 'stand') expandStand(s);
    else if (s.mode === 'climb') expandClimb(s);
    else if (s.mode === 'ball') expandBall(s);
    else if (s.mode === 'wall') expandWall(s);
  }

  function walkMacro(s, dir) {
    sim(s, () => inp({ dx: dir }), { maxF: 150, recordGround: true, minF: 1 });
  }


  function expandStand(s) {
    for (const dir of [-1, 1]) walkMacro(s, dir);
    const runsFor = (dir) => (dir === 0 ? [0] : s.dir === 'e' ? [0, 3, 6] : RUNUP);
    for (const dir of [-1, 0, 1]) {
      for (const run of runsFor(dir)) for (const hold of JUMP_HOLD) for (const ac of dir === 0 ? ['hold', 'delay'] : ['hold', 'release', 'delay']) for (const up of hasClimb ? [false, true] : [false]) {
        if (up && dir === 0 && hold < 60) continue;
        sim(s, (f) => {
          const air = f - run;
          if (f < run) return inp({ dx: dir });
          if (air === 0) return inp({ dx: dir, jump: true, jumpP: true, dy: up ? 1 : 0 });
          let dx = dir;
          if (ac === 'release' && air > 12) dx = 0;
          if (ac === 'delay' && air < 12) dx = 0;
          return inp({ dx, jump: air < hold, dy: up ? 1 : 0 });
        }, { minF: run + 2 });
      }
    }
    // ground-pound variants (only when there are slabs to break)
    if (abil.pound && hasPound) {
      for (const dir of [-1, 0, 1]) for (const pf of [8, 16, 26]) {
        sim(s, (f) => {
          if (f === 0) return inp({ dx: dir, jump: true, jumpP: true });
          if (f === pf) return inp({ dx: 0, dy: -1, jump: true, poundP: true });
          return inp({ dx: f < pf ? dir : 0, jump: f < 40 });
        }, { minF: 3 });
      }
    }
    // roll variants
    if (abil.roll) {
      for (const dir of [-1, 1]) {
        sim(s, (f) => (f === 0 ? inp({ dx: dir, rollP: true }) : inp({ dx: dir })), { maxF: 200, recordGround: true, minF: 1 });
        for (const jf of [0, 5, 12, 22, 30]) {
          sim(s, (f) => {
            if (f === 0) return inp({ dx: dir, rollP: true });
            if (f === jf + 1) return inp({ dx: dir, jump: true, jumpP: true });
            return inp({ dx: dir, jump: f > jf && f < jf + 61 });
          }, { minF: jf + 3 });
        }
      }
    }
    // ladders / vines and one-way platforms
    sim(s, () => inp({ dy: 1 }), { maxF: 6, minF: 1 });
    if (FLAGS[base.tile(Math.floor(s.x), Math.floor(s.y - 0.05))] & F_ONEWAY) {
      sim(s, () => inp({ dy: -1 }), { maxF: 6, minF: 1 });
      for (const dir of [-1, 0, 1]) sim(s, (f) => (f === 0 ? inp({ dx: dir, dy: -1, jump: true, jumpP: true }) : inp({ dx: dir })), { minF: 4 });
    }
  }

  function expandClimb(s) {
    const climbMacro = (dy, frames) => sim(s, () => ({ ...inp({ dy }), keepClimb: true }), { maxF: frames, minF: 0, recordGround: true });
    // climbing up/down: record every quantised climbing state on the way
    climbMacro(1, 220); climbMacro(-1, 220);
    for (const dir of [-1, 0, 1]) for (const hold of [8, 60]) for (const dy of [0, 1]) {
      sim(s, (f) => {
        if (f === 0) return inp({ dx: dir, dy: dir === 0 ? 0 : 0, jump: true, jumpP: true });
        return inp({ dx: dir, dy, jump: f < hold });
      }, { minF: 3 });
    }
    sim(s, (f) => (f === 0 ? inp({ dx: 0, dy: -1, jump: true, jumpP: true }) : inp({ dy: 0 })), { minF: 3 });
  }

  function expandBall(s) {
    for (const dir of [-1, 1]) sim(s, () => inp({ dx: dir }), { maxF: 160, recordGround: true, minF: 1 });
    for (const dir of [-1, 0, 1]) for (const hold of [6, 60]) sim(s, (f) => (f === 0 ? inp({ dx: dir, jump: true, jumpP: true }) : inp({ dx: dir, jump: f < hold })), { minF: 3 });
  }

  function expandWall(s) {
    const away = -s.dir;
    for (const hold of [6, 12, 60]) for (const steer of ['away', 'toward', 'away-then-toward', 'none']) {
      sim(s, (f) => {
        if (f === 0) return inp({ dx: s.dir, jump: true, jumpP: true });
        let dx = away;
        if (steer === 'toward') dx = s.dir;
        if (steer === 'none') dx = 0;
        if (steer === 'away-then-toward') dx = f < 14 ? away : s.dir;
        if (f < 2) dx = s.dir;
        return inp({ dx, jump: f < hold });
      }, { minF: 4 });
    }
    // slide down while holding toward the wall (records states along the wall), or let go
    sim(s, () => inp({ dx: s.dir }), { maxF: 200, minF: 1, recordGround: true });
    sim(s, () => inp({ dx: 0 }), { minF: 3 });
  }

  return { states, reach, newBroken: [...newBroken] };
}

/** Convenience: which marks (by kind) are reachable. */
export function summarize(def, res) {
  const out = { portals: [...res.reach.portals].sort(), relics: [], hearts: [], bananas: [0, 0], saves: [], switches: [], goal: false, boss: false };
  def.marks.forEach((m, i) => {
    const hit = res.reach.marks.has(i);
    if (m.kind === 'relic') out.relics.push({ ability: def.props.relic, x: m.x, y: m.y, ok: hit });
    else if (m.kind === 'heart') out.hearts.push({ x: m.x, y: m.y, ok: hit });
    else if (m.kind === 'banana') { out.bananas[1]++; if (hit) out.bananas[0]++; }
    else if (m.kind === 'save') out.saves.push({ x: m.x, y: m.y, ok: hit });
    else if (m.kind === 'goal') out.goal = hit;
    else if (m.kind === 'boss') out.boss = hit;
  });
  return out;
}

/** Temporarily weaken the movement physics by factor k (tools only). Returns a restore function. */
export function nerfPhysics(k) {
  const saved = { ...P };
  for (const key of ['runV', 'jumpV', 'rollV', 'rollJumpV', 'wallJumpVx', 'wallJumpVy', 'springV', 'springBoostV', 'climbUp']) P[key] = saved[key] * k;
  return () => Object.assign(P, saved);
}
