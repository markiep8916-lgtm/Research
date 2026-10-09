#!/usr/bin/env node
// Expected fights on the critical path (G2 "Expected fights", 11.7; C-beta bar rule 2): walks each
// route leg of tests/routes/*.mjs over its map grid (shortest paths between the waypoints), splits
// the walking by encounter zone and simulates explore.js's rules: grace + Rayleigh hazard, the
// walked distance kept across zoneless and `puzzle` areas and reset on entering a different zone,
// after a fight (a scripted `{ fight }` point too) and between legs (a map change or a rest).
//
//   node tools/expected-fights.mjs [--chapter ch1] [--runs 20000]
//   RATES='{"shoals_tunnels":{"grace":6,"sigma":11}}' node tools/expected-fights.mjs   try rates
//
// export legStretches(leg) -> [{ zone, len } | { fight }]
// export expectedFights(legs, { rates, runs }) -> { random, scripted, byZone: { zone: { units, fights } }, byLeg: [...] }
// (both need the content registered: registerAllData() from src/content/data.js)

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT } from './browser.mjs';

const { registry, registerAllData } = await import(pathToFileURL(path.join(ROOT, 'src/content/data.js')).href);
const { ZONE_RATE_DEFAULT } = await import(pathToFileURL(path.join(ROOT, 'src/content/balance.js')).href);
const POC_RATE = { grace: 8, sigma: 13.5 };   // explore.js keeps the POC zones' pace
const POC_ZONES = new Set(['corridor', 'engineering']);
const STEP = 0.25;

const inRect = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];

/** Walkable cells for the path search: floors and doors (locked doors included: the route opens them). */
function openCell(map) {
  const rows = map.grid || map.cells;
  return (c, r) => {
    const ch = rows[r] && rows[r][c];
    const spec = ch != null && map.legend[ch];
    return !!spec && (spec.t === 'floor' || spec.t === 'door');
  };
}

/** Shortest 8-connected cell path from a to b (cell centres), or null. */
function cellPath(map, a, b) {
  const open = openCell(map);
  const W = map.w, H = map.h;
  const idx = (c, r) => r * W + c;
  const s = idx(Math.floor(a[0]), Math.floor(a[1])), g = idx(Math.floor(b[0]), Math.floor(b[1]));
  const dist = new Float64Array(W * H).fill(Infinity);
  const prev = new Int32Array(W * H).fill(-1);
  dist[s] = 0;
  const heap = [[0, s]];
  while (heap.length) {
    heap.sort((x, y) => x[0] - y[0]);
    const [d, i] = heap.shift();
    if (d > dist[i]) continue;
    if (i === g) break;
    const c = i % W, r = (i - c) / W;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (!open(nc, nr) || (dc && dr && (!open(c + dc, r) || !open(c, r + dr)))) continue;
      const nd = d + (dc && dr ? Math.SQRT2 : 1), j = idx(nc, nr);
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; heap.push([nd, j]); }
    }
  }
  if (g !== s && prev[g] < 0) return null;
  const out = [];
  for (let i = g; ; i = prev[i]) { const c = i % W; out.push([c + 0.5, (i - c) / W + 0.5]); if (i === s) break; }
  return out.reverse();
}

/** The zone the leader walks in at (x, z): null in gaps, zoneless and puzzle areas. */
function zoneAt(map, x, z, flags) {
  const area = map.areas.find((a) => inRect(a.rect, x, z));
  if (!area || area.puzzle) return null;
  const zone = area.zone;
  if (!Array.isArray(zone)) return zone || null;
  const hit = zone.find((e) => String(e.when || '').split('&').every((f) => !f.trim() || flags.has(f.trim())));
  return (hit && hit.zone) || null;
}

/** A leg -> its zone stretches in order (W-1: a zoneless room does not break a stretch) and fight points. */
export function legStretches(leg) {
  const map = registry.getMap(leg.map);
  if (!map) throw new Error(`expected-fights: unknown map "${leg.map}" (${leg.label})`);
  const flags = new Set(leg.flags || []);
  const out = [];
  let cur = null, at = null;
  for (const p of leg.points) {
    if (!Array.isArray(p)) { out.push({ fight: p.fight }); cur = null; continue; }
    if (at) {
      const cells = cellPath(map, at, p);
      if (!cells) throw new Error(`expected-fights: no path on ${leg.map} from ${at} to ${p} (${leg.label})`);
      for (let i = 0; i + 1 < cells.length; i++) {
        const zone = zoneAt(map, cells[i][0], cells[i][1], flags);
        if (!zone) continue;
        if (!cur || cur.zone !== zone) { cur = { zone, len: 0 }; out.push(cur); }
        cur.len += Math.hypot(cells[i + 1][0] - cells[i][0], cells[i + 1][1] - cells[i][1]);
      }
    }
    at = p;
  }
  return out;
}

function rateOf(zone, rates) {
  return (rates && rates[zone]) || registry.REG.zoneRates[zone] || (POC_ZONES.has(zone) ? POC_RATE : ZONE_RATE_DEFAULT);
}

/** Mean random fights over `runs` simulated walks of every leg (each leg starts fresh). */
export function expectedFights(legs, { rates = null, runs = 20000 } = {}) {
  const byZone = {};
  const byLeg = [];
  let random = 0, scripted = 0;
  for (const leg of legs) {
    const st = legStretches(leg);
    let legFights = 0;
    for (const s of st) {
      if (s.fight) { scripted++; continue; }
      const z = (byZone[s.zone] ||= { units: 0, fights: 0 });
      z.units += s.len;
    }
    for (let n = 0; n < runs; n++) {
      for (const s of st) {
        if (s.fight) continue;
        const { grace, sigma } = rateOf(s.zone, rates);
        const h = (v) => (v * v) / (2 * sigma * sigma);
        let walked = 0;
        for (let t = 0; t < s.len; t += STEP) {
          const s0 = Math.max(0, walked - grace);
          walked += Math.min(STEP, s.len - t);
          const s1 = Math.max(0, walked - grace);
          if (s1 > s0 && Math.random() < 1 - Math.exp(-(h(s1) - h(s0)))) {
            byZone[s.zone].fights += 1 / runs;
            legFights += 1 / runs;
            walked = 0;
          }
        }
      }
    }
    random += legFights;
    byLeg.push({ chapter: leg.chapter, label: leg.label, stretches: st, fights: legFights });
  }
  return { random, scripted, byZone, byLeg };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { loadRoutes } = await import('./human-pace-report.mjs');
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  registerAllData();
  const routes = await loadRoutes();
  const only = opt('--chapter', null);
  const rates = process.env.RATES ? JSON.parse(process.env.RATES) : null;
  const legs = routes.legs.filter((l) => !only || l.chapter === only);
  const chapters = [...new Set(legs.map((l) => l.chapter))];
  for (const ch of chapters) {
    const r = expectedFights(legs.filter((l) => l.chapter === ch), { rates, runs: Number(opt('--runs', 20000)) });
    console.log(`\n${ch}: expected random fights ${r.random.toFixed(2)}, scripted on the legs ${r.scripted}`);
    for (const l of r.byLeg) {
      console.log(`  ${l.label}: ${l.stretches.map((s) => (s.fight ? `[${s.fight}]` : `${s.zone} ${s.len.toFixed(0)}`)).join(', ')} | ${l.fights.toFixed(2)} fights`);
    }
    for (const [zone, z] of Object.entries(r.byZone)) {
      const rate = rateOf(zone, rates);
      console.log(`  zone ${zone.padEnd(20)} ${z.units.toFixed(0).padStart(4)} units  grace ${rate.grace} sigma ${rate.sigma}  ${z.fights.toFixed(2)} fights`);
    }
  }
}
