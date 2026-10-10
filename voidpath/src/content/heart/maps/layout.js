// heart: the cathedral's floor plan (PURE). Shared by the MapDef (maps/heart.js rasterises it into
// cells) and the prop builders (props.js draws the smooth platforms, rims and bridges over them).
// 1 cell = 1 world unit, +Z = south (toward the camera); angles in degrees: 0 = east, 90 = south,
// 180 = west, 270 = north.
//
// Four tiers climb the Heart, each a ring gallery round its own stretch of the reactor column (the
// shaft of gold light that falls through the whole cathedral), joined by lifts whose pads hang out
// over the abyss on long hard-light spans. The tiers sit in the four quadrants of the map, so no two
// share a frame, and each tier's climb walks most of its ring:
//   T1 the Dock (south-west)          the Moth's pier and the causeway onto the west arc; the pylon at
//                                     the arc's south end lights the chord across the shaft north of
//                                     the column; the east arc south to the lift (introduce)
//   T2 the Second Tier (south-east)   up the east arc, over the north chord; the pylon at the west
//                                     arc's south end lights the span back north to the lift pad (twist)
//   T3 the Third Tier (north-east)    one long arc: both pylons, at its far ends, open the processional
//                                     west to the Sanctum (combine); the Bellwarden's alcove by the lift
//   The Crown (north-west)            a wide disc round the oculus where the column ends
// Walkable cells lie fully inside their platform's smooth outline, so the drawn rims, rails and
// undersides always cover the cells the World draws.

export const W = 72;
export const H = 56;

// ring galleries: centre, inner and outer radius, the arcs that exist (degree ranges, a1 may pass 360)
export const RINGS = [
  { id: 't1', cx: 22, cz: 42.5, rIn: 8, rOut: 13, arcs: [[110, 250], [290, 430]], ch: 'o' },
  { id: 't2', cx: 55.5, cz: 42.5, rIn: 8, rOut: 13, arcs: [[110, 250], [290, 430]], ch: 'o' },
  { id: 't3', cx: 56.5, cz: 13, rIn: 8, rOut: 12.5, arcs: [[290, 610]], ch: 'o' },
  // the Crown: a disc round the oculus (the column's end, open to the light below)
  { id: 'crown', cx: 11.5, cz: 11.5, rIn: 3.0, rOut: 10.5, arcs: [[0, 360]], ch: 'c' },
];

// round pads (lifts): centre and radius; `ring` names the gallery the pad hangs from and `at` the
// angle its span leaves the gallery (gated when `gate` names a legend char)
export const PADS = [
  { id: 'lift_t1', cx: 37.6, cz: 53.4, r: 2.5, ch: 'p', ring: 't1', at: 52 },
  { id: 'lift_t2_in', cx: 67.4, cz: 53.0, r: 2.5, ch: 'p', ring: 't2', at: 44 },
  { id: 'lift_t2', cx: 44.4, cz: 27.0, r: 2.4, ch: 'p', ring: 't2', at: 236, gate: 'b' },
  { id: 'lift_t3_in', cx: 68.9, cz: 4.3, r: 2.5, ch: 'p', ring: 't3', at: 326 },
  { id: 'lift_crown', cx: 34.0, cz: 4.6, r: 2.5, ch: 'p', ring: null },
  { id: 'lift_crown_in', cx: 18.0, cz: 22.6, r: 2.4, ch: 'p', ring: 'crown' },
];

// straight platforms: cell rect [c0, r0, c1, r1] inclusive, chamfer depth `cut`; a `runner` is a strip
// of hard light down the slab (axis, centre line, width, optional from/to; `back` points it toward -x
// or -z) that leads the eye on
export const SLABS = [
  { id: 'pier', rect: [1, 37, 7, 49], ch: ',', cut: 2, runner: { axis: 'x', at: 42.6, w: 2.2 } },   // the Moth's berth
  { id: 'causeway', rect: [8, 40, 9, 45], ch: '.', cut: 0, runner: { axis: 'x', at: 42.6, w: 2.2, to: 9 } },   // to the ring
  { id: 'sanctum', rect: [30, 7, 37, 18], ch: ',', cut: 2, runner: { axis: 'z', at: 34.0, w: 2.4, back: true } }, // to the lift
];

// bridges: a straight span from [x, z] to [x, z], `w` wide; '=' is permanent, a letter a gated light
// bridge (its gate in maps/heart.js); the light draws itself out from the `a` end
export const BRIDGES = [
  { id: 'br_t1', a: [14.0, 38.5], b: [30.0, 38.5], w: 2, ch: 'a' },        // T1 chord, north of the column
  { id: 'br_t2_n', a: [63.5, 38.5], b: [47.5, 38.5], w: 2, ch: '=' },      // T2 north chord
  { id: 'br_t3', a: [44.6, 13.0], b: [37.6, 13.0], w: 3, ch: 'f' },        // T3 -> the processional (two pylons)
  { id: 'br_crown', a: [34.0, 7.8], b: [34.0, 6.0], w: 2.4, ch: '=' },     // the Sanctum -> the crown lift pad
  // the spans that join pads to their galleries, from inside the gallery's outer edge to the pad's
  // centre (the light draws out from the gallery)
  ...PADS.filter((p) => p.ring).map((p) => {
    const ring = RINGS.find((g) => g.id === p.ring);
    const a = p.at ?? angleOf(ring.cx, ring.cz, p.cx, p.cz);
    return { id: `br_${p.id}`, a: ringPoint(ring, a, ring.rOut - 1.4), b: [p.cx, p.cz], w: 2.4, ch: p.gate || '=', pad: p.id };
  }),
];

/** Degrees in [0, 360) of (x, z) round (cx, cz). */
function angleOf(cx, cz, x, z) {
  const a = (Math.atan2(z - cz, x - cx) * 180) / Math.PI;
  return (a + 360) % 360;
}

/** True when angle `a` lies on arc [a0, a1] (a1 may pass 360). */
function onArc(a, [a0, a1]) {
  const d = (((a - a0) % 360) + 360) % 360;
  return d <= a1 - a0;
}

/** A point on a ring at angle `a` (degrees) and radius `r`. */
export function ringPoint(ring, a, r = (ring.rIn + ring.rOut) / 2) {
  const t = (a * Math.PI) / 180;
  return [ring.cx + Math.cos(t) * r, ring.cz + Math.sin(t) * r];
}

const CORNERS = (c, r) => [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]];

/** True when cell (c, r) lies fully inside the ring (all four corners within its radii) on an arc. */
function cellInRing(ring, c, r) {
  for (const [x, z] of CORNERS(c, r)) {
    const d = Math.hypot(x - ring.cx, z - ring.cz);
    if (d < ring.rIn || d > ring.rOut) return false;
  }
  const a = angleOf(ring.cx, ring.cz, c + 0.5, r + 0.5);
  return ring.arcs.some((arc) => onArc(a, arc));
}

/** True when cell (c, r) lies fully inside the round pad. */
function cellInPad(pad, c, r) {
  return CORNERS(c, r).every(([x, z]) => Math.hypot(x - pad.cx, z - pad.cz) <= pad.r);
}

/** Distance from (x, z) to the segment a-b. */
function segDist(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az;
  const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (ax + dx * k), z - (az + dz * k));
}

/** True when the centre of cell (c, r) lies within the bridge's span. */
function cellOnBridge(b, c, r) {
  return segDist(c + 0.5, r + 0.5, b.a, b.b) <= b.w / 2 - 0.05;
}

/** The grid rows: rings, pads and slabs, then bridges into whatever is still void. */
export function buildGrid() {
  const rows = Array.from({ length: H }, () => Array(W).fill(' '));
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      for (const ring of RINGS) if (cellInRing(ring, c, r)) rows[r][c] = ring.ch;
      for (const pad of PADS) if (cellInPad(pad, c, r)) rows[r][c] = pad.ch;
    }
  }
  for (const s of SLABS) {
    const [c0, r0, c1, r1] = s.rect;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const dx = Math.min(c - c0, c1 - c), dz = Math.min(r - r0, r1 - r);
        if (dx + dz >= s.cut) rows[r][c] = s.ch;
      }
    }
  }
  for (const b of BRIDGES) {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (rows[r][c] === ' ' && cellOnBridge(b, c, r)) rows[r][c] = b.ch;
  }
  return rows.map((row) => row.join(''));
}

/** The cells a bridge occupies in the grid (its span minus the platforms it joins). */
export function bridgeCells(grid, id) {
  const b = BRIDGES.find((x) => x.id === id);
  const cells = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (grid[r][c] === b.ch && cellOnBridge(b, c, r)) cells.push([c, r]);
  return cells;
}
