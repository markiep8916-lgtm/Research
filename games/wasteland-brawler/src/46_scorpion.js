// Scorpion rig: segmented carapace, 8 legs, two pincers and a curling tail with a stinger.
// Local coordinates: origin on the ground under the body centre, facing right (+x = head).
//
// drawScorpion(o) options (all optional except colours):
//   s          scale (1 = ~40px long)            shell, plate, hi, belly, leg, sting, eye  colours
//   legPhase   leg cycle (radians)               clawOpen 0..1      clawRaise 0..1 (lifts the claws)
//   tailCurl   0..1 (1 = coiled tight)           tailThrust 0..1 (straightens the tail forward over the head)
//   tailSegs   number of tail segments (5)       tailDrop 0..1 (tail lying on the ground, stuck)
//   bodyDip    px the body sinks                 onBack (flipped, legs wiggling)
//   stingGlow  0..1 glow at the tip              eggs [{x, r}] egg sacs on the back
//   tailLen    segment length multiplier         noTail (tail torn off)
// Returns { tip: {x, y}, head: {x, y}, claw: {x, y} } in local coordinates.

function drawScorpion(o) {
  const s = o.s || 1;
  const g = Sprite.cur.ga;
  const shell = o.shell, plate = o.plate || shade(o.shell, -0.25), hi = o.hi || shade(o.shell, 0.3);
  const leg = o.leg || shade(o.shell, -0.4), legDk = shade(leg, -0.3);
  const belly = o.belly || shade(o.shell, 0.4);
  const ph = o.legPhase || 0;
  const by = -(8 + (o.bodyDip ? -o.bodyDip : 0)) * s;    // body centre height
  const out = {};
  if (o.onBack) { g.save(); g.translate(0, by); g.scale(1, -1); g.translate(0, -by + 4 * s); }

  // ---- far legs and claw (darker, behind body) ----
  const legsX = [7, 2, -3, -8];
  const drawLeg = (i, far) => {
    const hx = legsX[i] * s, hy = by + 2 * s;
    const sw = Math.sin(ph + i * Math.PI / 2 + (far ? Math.PI : 0));
    const lift = Math.max(0, Math.cos(ph + i * Math.PI / 2 + (far ? Math.PI : 0))) * 2 * s;
    const spread = (1.5 - i) * 4 * s;
    const kx = hx + spread * 0.5 + sw * 1.5 * s + (far ? -1 : 1) * s, ky = by - 5 * s - lift;
    const fx = hx + spread * 1.6 + sw * 3 * s + (far ? -2 : 2) * s, fy = o.onBack ? by - 10 * s - Math.abs(sw) * 4 * s : -lift * 0.5;
    const c = far ? legDk : leg;
    Px.line(hx, hy, kx, ky, Math.max(1, Math.round(2 * s)), c);
    Px.line(kx, ky, fx, fy, Math.max(1, Math.round(1.5 * s)), c);
  };
  for (let i = 0; i < 4; i++) drawLeg(i, true);
  const drawClaw = (far) => {
    const open = o.clawOpen || 0, raise = (o.clawRaise || 0) * 6 * s;
    const sx = 12 * s, sy = by + (far ? -1 : 1) * s;
    const ex = 17 * s, ey = by - 3 * s - raise * 0.5 + (far ? -2 * s : 0);
    const hx = 23 * s, hy = by - 2 * s - raise + (far ? -2 * s : 0);
    const c = far ? plate : shell;
    Px.line(sx, sy, ex, ey, Math.max(2, Math.round(3 * s)), c);
    Px.line(ex, ey, hx, hy, Math.max(2, Math.round(3 * s)), c);
    // pincer: two fingers opening around the hand point
    const a = open * 0.7;
    const L = 7 * s;
    Px.poly([hx, hy - 2 * s, hx + Math.cos(-0.3 - a) * L, hy + Math.sin(-0.3 - a) * L, hx + 2 * s, hy], far ? plate : hi);
    Px.poly([hx, hy + 1 * s, hx + Math.cos(0.4 + a) * L * 0.8, hy + Math.sin(0.4 + a) * L * 0.8, hx + 2 * s, hy - 1 * s], c);
    Px.disc(hx, hy, 2.6 * s, c);
    if (!far) out.claw = { x: hx + 5 * s, y: hy };
  };
  drawClaw(true);

  // ---- body: cephalothorax + abdomen segments ----
  const segs = [[-16, 3.6, 3.4], [-11, 4.6, 4.2], [-5, 5.6, 4.8], [2, 6.2, 5.2]];
  for (const [x, rx, ry] of segs) {
    Px.oval(x * s, by, rx * s, ry * s, shell);
    Px.oval(x * s, by - ry * s * 0.45, rx * s * 0.75, ry * s * 0.35, hi);
    Px.rect(x * s - rx * s * 0.2, by - ry * s, 1, ry * s * 2, plate);
  }
  Px.oval(9 * s, by + 0.5 * s, 6.5 * s, 5 * s, shell);          // head
  Px.oval(9 * s, by - 1.5 * s, 4.5 * s, 1.6 * s, hi);
  Px.oval(4 * s, by + 3 * s, 10 * s, 1.4 * s, belly);           // underbelly
  // eyes: cluster of dots
  const eye = o.eye || '#ff3030';
  Px.dot(12 * s, by - 2 * s, eye); Px.dot(13 * s, by - 1 * s, eye);
  if (s > 1.2) { Px.dot(11 * s, by - 3 * s, eye); Px.dot(14 * s, by - 2 * s, eye); }
  out.head = { x: 12 * s, y: by - 2 * s };
  // egg sacs
  if (o.eggs) for (const e of o.eggs) { Px.disc(e.x * s, by - 4 * s - e.r * s * 0.6, e.r * s, '#f2e0c0'); Px.disc(e.x * s - e.r * s * 0.3, by - 4 * s - e.r * s * 0.9, e.r * s * 0.35, '#ffffff'); }

  // ---- tail ----
  if (!o.noTail) {
    const n = o.tailSegs || 5;
    const curl = o.tailCurl != null ? o.tailCurl : 0.5;
    const thrust = o.tailThrust || 0;
    const drop = o.tailDrop || 0;
    let x = -18 * s, y = by - 1 * s;
    let ang = -2.0;                                   // radians in screen space (0 = +x); -pi/2 = up
    const segLen = 6 * s * (o.tailLen || 1);
    const pts = [];
    for (let i = 0; i < n; i++) {
      // coiled: rotate forward each segment; thrust: aim forward; drop: lie along the ground forward
      let target = ang + 0.25 + curl * 0.25;
      if (thrust) target = lerp(target, -0.15 + i * 0.03, thrust);
      if (drop) target = lerp(target, i === 0 ? -0.6 : 0.1, drop);
      ang = target;
      const r = lerp(4.2, 2.6, i / (n - 1)) * s;
      x += Math.cos(ang) * segLen; y += Math.sin(ang) * segLen;
      if (drop) y = Math.min(y, -r * 0.6);
      pts.push({ x, y, r });
    }
    let px = -18 * s, py = by - 1 * s;
    pts.forEach((p, i) => {
      Px.line(px, py, p.x, p.y, Math.max(2, Math.round(p.r * 1.4)), i % 2 ? plate : shell);
      Px.disc(p.x, p.y, p.r, i % 2 ? shell : plate);
      Px.dot(p.x - p.r * 0.3, p.y - p.r * 0.5, hi);
      px = p.x; py = p.y;
    });
    // stinger: hooked polygon continuing the last direction, curling down
    const tip = pts[pts.length - 1];
    const a2 = ang + 0.9;
    const L = 7 * s;
    const sx2 = tip.x + Math.cos(ang) * 2 * s, sy2 = tip.y + Math.sin(ang) * 2 * s;
    const ex2 = sx2 + Math.cos(a2) * L, ey2 = sy2 + Math.sin(a2) * L;
    Px.poly([sx2 - Math.sin(ang) * 2 * s, sy2 + Math.cos(ang) * 2 * s, ex2, ey2, sx2 + Math.sin(ang) * 2 * s, sy2 - Math.cos(ang) * 2 * s], o.sting || '#f2e9c9');
    if (o.stingGlow) {
      g.globalAlpha = 0.4 * o.stingGlow;
      Px.disc(ex2, ey2, (2 + 4 * o.stingGlow) * s * 0.7, '#ff3030');
      g.globalAlpha = 1;
      Px.disc(ex2, ey2, 1.2 * s, '#ff3030');
    }
    out.tip = { x: ex2, y: ey2 };
    out.tail = pts;
  }

  // ---- near legs and claw ----
  for (let i = 0; i < 4; i++) drawLeg(i, false);
  drawClaw(false);
  if (o.onBack) g.restore();
  return out;
}
