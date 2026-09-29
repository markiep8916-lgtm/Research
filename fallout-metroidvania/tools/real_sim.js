// Headless replica of the REAL player controller: instantiates CD.Player (src/game/player.js) in the solver's sandbox, feeds it scripted key frames exactly
// the way tests/harness.js does (one poll per 1/60 s frame, two 1/120 s update steps, 'pressed' visible to the first step only) and reports where it lands.
// tools/reach.js --certify uses it to accept a jump / fall edge only if the game's own controller reproduces it.
'use strict';

module.exports = function makeRealSim(CD, world) {
  const G = CD.G, K = CD.PLAYER_K, T = CD.T, H = world.H;
  const held = {}, pressed = {}, NAMES = ['left', 'right', 'up', 'down', 'jump', 'dash'];
  CD.input = { held: (n) => !!held[n], pressed: (n) => !!pressed[n], aimMode: 'keys', mouse: { moved: 0, x: 0, y: 0, edge: false }, padAxes: { lx: 0, ly: 0, rx: 0, ry: 0 } };
  CD.Rig = Object.assign(CD.Rig || {}, { get: () => ({}), muzzle: () => [0, 0], weaponSprite: () => null });
  CD.audio = { play() {}, ready: false };
  G.fx = new Proxy({}, { get: () => () => {} });
  let hits = 0;
  Object.assign(G, { state: 'play', controlsLocked: () => false, maxAP: () => 100, apRegen: () => 0, special: () => 5, cheats: {}, hurtPlayer: () => { hits++; return false; }, addRad() {}, world, platforms: [] });
  G.st = { hp: 100, maxHp: 100, ap: 100, abilities: {}, perks: {}, buffs: {}, weapons: ['wrench'], wi: 0, mag: {}, ammo: {}, aid: {}, flags: {}, keys: {} };

  function makePlayer(cx, row, face) {
    const p = new CD.Player((cx + 0.5) * T, row * T);
    p.face = face || 1;
    // only movement is under test: combat, aiming and pose building are cosmetic here
    p.finishFrame = function () { this.platform = null; if (this.hitTimer <= 0) this.checkHazards(); };
    return p;
  }
  function frame(p, keys, prev) {
    for (const n of NAMES) { held[n] = !!keys[n]; pressed[n] = !!keys[n] && !prev[n]; }
    p.update(1 / 120);
    for (const n of NAMES) pressed[n] = false;
    p.update(1 / 120);
  }
  const cell = (p) => [Math.floor((p.x + p.w / 2) / T), Math.round((p.y + p.h) / T)];

  // plan: {walk} | {fall: dir} | {drop} | {dir, hold, dj, dash, wj:[t..], wjMode}   (same fields as tools/reach.js simulate)
  function run(cx, row, plan, has, opts) {
    opts = opts || {};
    G.st.abilities = {}; for (const a in has) if (has[a]) G.st.abilities[a] = 1;
    hits = 0;
    const p = makePlayer(cx, row, plan.dir || plan.fall || 1); p.x += opts.dx || 0;
    let prev = {}; const none = {};
    for (let i = 0; i < 6; i++) { frame(p, none, prev); prev = none; }
    if (!p.onGround) return { err: 'not standing' };
    const maxF = Math.round((opts.maxT || 2.6) * 60), trace = opts.trace ? [] : null;
    const dir = plan.dir || plan.fall || 0; let curDir = dir;
    const hold = plan.hold === undefined ? 1 : plan.hold, dj = plan.dj === undefined ? null : plan.dj, dash = plan.dash === undefined ? null : plan.dash;
    const djF = dj === null ? -1 : Math.max(1, Math.ceil(dj * 60 - 1e-6)), dashF = dash === null ? -1 : Math.max(1, Math.ceil(dash * 60 - 1e-6));
    const wj = plan.wj || null, jumping = !plan.fall && !plan.drop;
    let wjIdx = 0, prevSpace = false, airborne = false, kicks = 0, landed = null, f = 0;
    for (; f < maxF; f++) {
      const t = f / 60, k = {}; let space = false;
      if (curDir < 0) k.left = true; if (curDir > 0) k.right = true;
      if (plan.drop) { k.down = true; space = f === 0; }                                    // down + jump drops through a one-way plank
      else if (jumping) {
        if (f === 0) space = true;                                                            // take-off (edge)
        else if (djF > 0 && f === djF - 1) space = false;                                     // let go one frame so the double jump is a fresh press
        else if (djF > 0 && f === djF) space = true;
        else space = t <= hold + 1e-6;                                                        // variable jump height: keep it held until `hold`
        if (wj && p.wallCling && !p.onGround && wjIdx < wj.length && t >= wj[wjIdx]) {        // wall kick: needs a fresh press
          if (prevSpace) space = false; else { space = true; wjIdx++; kicks++; if (plan.wjMode !== 'same') curDir = -p.wallDir; }
        }
        if (dashF > 0 && f === dashF) k.dash = true;
      }
      if (space) k.jump = true;
      frame(p, k, { jump: prevSpace, dash: false }); prevSpace = space;
      if (trace) trace.push({ t: +((f + 1) / 60).toFixed(3), x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), cl: p.wallCling ? p.wallDir : 0, g: p.onGround });
      if (!p.onGround) airborne = true;
      if (hits > 0) return { err: 'spikes', t: (f + 1) / 60, trace };
      if (p.y > H * T + 100) return { err: 'fell out of the world', trace };
      if (p.inWater && !has.hazmat) return { err: 'water', trace };
      if (p.onGround && (airborne || !jumping) && f >= 3) { landed = cell(p); break; }
      if (p.onGround && !airborne && jumping && f > 20) break;                                  // never left the ground
    }
    return { landed, t: (f + 1) / 60, kicks, trace };
  }

  // Does the real controller reproduce the solver's edge (from -> to) with `plan` within a few frames of timing slack?
  function verify(cx, row, plan, tx, tr, has) {
    const variants = [plan], J = [1, -1, 2, -2, 3, -3];
    const clone = (o) => JSON.parse(JSON.stringify(o));
    if (plan.dj !== null && plan.dj !== undefined) for (const j of J) { const v = clone(plan); v.dj = plan.dj + j / 60; variants.push(v); }
    if (plan.dash !== null && plan.dash !== undefined) for (const j of J) { const v = clone(plan); v.dash = Math.max(0.02, plan.dash + j / 60); variants.push(v); }
    if (plan.hold !== undefined && plan.hold < 1) for (const j of [1, -1, 2]) { const v = clone(plan); v.hold = Math.max(0.03, plan.hold + j / 60); variants.push(v); }
    if (plan.wj) for (const j of [1, 2, 4, -1, -2]) { const v = clone(plan); v.wj = plan.wj.map((x) => x + j / 60); variants.push(v); }
    for (let i = 0; i < variants.length; i++) {
      const o = run(cx, row, variants[i], has);
      if (o.landed && Math.abs(o.landed[0] - tx) <= 1 && o.landed[1] === tr) return { ok: true, variant: i, landed: o.landed };
    }
    return { ok: false };
  }
  // How forgiving is the edge? Fraction of perturbed executions (start offset +-12 px, hold and double-jump / dash / kick timing +-2 frames) that still land on the target.
  function robust(cx, row, plan, tx, tr, has) {
    let ok = 0, n = 0; const clone = (o) => JSON.parse(JSON.stringify(o));
    for (const dx of [-12, 0, 12]) for (const jt of [-2, 0, 2]) for (const hj of [-2, 0]) {
      const v = clone(plan);
      if (v.dj !== null && v.dj !== undefined) v.dj = Math.max(0.03, v.dj + jt / 60);
      if (v.dash !== null && v.dash !== undefined) v.dash = Math.max(0.02, v.dash + jt / 60);
      if (v.wj) v.wj = v.wj.map((x) => x + jt / 60);
      if (v.hold !== undefined && v.hold < 1) v.hold = Math.max(0.03, v.hold + hj / 60);
      n++; const o = run(cx, row, v, has, { dx });
      if (o.landed && Math.abs(o.landed[0] - tx) <= 1 && o.landed[1] === tr) ok++;
    }
    return ok / n;
  }
  return { run, verify, robust };
};
