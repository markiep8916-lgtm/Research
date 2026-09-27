'use strict';
// ---------------------------------------------------------------------------
// Game engine: state, rules, yields, combat and turn processing.
// Pure logic, no DOM. `G` is the whole serializable game state.
// ---------------------------------------------------------------------------

let G = null;
let UT = [];          // tile index -> units on that tile (rebuilt on load)
let CM = new Map();   // city id -> city
const Hooks = { log: () => {}, notify: () => {}, playerPrompt: () => {}, vis: () => {} };

const YKEYS = ['f', 'p', 'g', 's', 'c', 'fa'];
const zeroY = () => ({ f: 0, p: 0, g: 0, s: 0, c: 0, fa: 0 });
const addY = (a, b, m = 1) => { for (const k of YKEYS) a[k] += (b[k] || 0) * m; return a; };
const rnd = () => Math.random();
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------
function newGame(opts) {
  const size = MAP_SIZES[opts.size] || MAP_SIZES.standard;
  const seed = opts.seed || Math.floor(Math.random() * 1e9);
  G = {
    version: 1, seed, turn: 1, W: size.W, H: size.H, tiles: [], civs: [], cities: [], units: [], camps: [],
    nextId: 1, wonders: {}, religions: [], log: [], speed: opts.speed || 'quick', difficulty: opts.difficulty || 'prince',
    mul: SPEEDS[opts.speed || 'quick'].mul, maxTurns: SPEEDS[opts.speed || 'quick'].turns, winner: null, over: false, player: 0,
  };
  const rng = generateMap(size.W, size.H, seed);
  const n = Math.min(opts.numAI + 1, 12);
  const { picks } = pickStarts(n, rng);
  const pool = Object.keys(CIVS).filter(k => k !== opts.civ);
  shuffle(pool);
  const keys = [opts.civ].concat(pool.slice(0, picks.length - 1));
  keys.forEach((k, i) => G.civs.push(makeCiv(k, i, i === 0)));
  const barb = makeCiv(null, G.civs.length, false);
  G.civs.push(barb);
  G.barb = barb.id;
  rebuildIndex();
  keys.forEach((k, i) => {
    const s = picks[i];
    createUnit(i, 'settler', s.x, s.y);
    const adj = neighbors(s.x, s.y).filter(([x, y]) => passableLand(tileAt(x, y)));
    const a = adj[0] || [s.x, s.y], b = adj[1] || a;
    createUnit(i, unitTypeFor(G.civs[i], 'warrior'), a[0], a[1]);
    createUnit(i, unitTypeFor(G.civs[i], 'scout'), b[0], b[1]);
    if (G.civs[i].isPlayer === false && DIFFICULTIES[G.difficulty].ai >= 1.2) {
      createUnit(i, unitTypeFor(G.civs[i], 'warrior'), b[0], b[1]);
    }
  });
  for (let i = 0; i < n + 2; i++) spawnCamp(true);
  for (const c of G.civs) if (!c.isBarb) updateVisibility(c);
  log(`Turn 1. ${G.civs[0].leader} of ${G.civs[0].name} founds a new dynasty. Choose where to settle your capital.`, 0);
  return G;
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function makeCiv(key, id, isPlayer) {
  const d = key ? CIVS[key] : null;
  const c = {
    id, key, isPlayer, isBarb: !key, alive: true,
    name: d ? d.name : 'Barbarians', adj: d ? d.adj : 'Barbarian', leader: d ? d.leader : 'Barbarian Chieftain',
    color: d ? d.color : BARB_COLOR, text: d ? d.text : '#d9412e',
    techs: {}, civics: {}, techProg: {}, civicProg: {}, boosted: {}, researching: null, civicing: null,
    techGoal: null, sciBank: 0, cultBank: 0, gold: 10, faith: 0, gov: null, slots: [[], [], [], []],
    pantheon: null, religion: null, gaPts: 0, ga: 0, gaCount: 0, war: {}, met: {}, warTurns: {},
    explored: [], expCount: 0, kills: 0, barbKills: 0, wondersBuilt: 0, projects: {}, foundedAny: false,
    cityNameIdx: 0, happy: 0, lastYields: zeroY(), aiState: {}, peaceOffer: {},
  };
  if (d && d.mods.startTech) c.techs[d.mods.startTech] = true;
  return c;
}

function rebuildIndex() {
  UT = new Array(G.W * G.H);
  for (let i = 0; i < UT.length; i++) UT[i] = [];
  for (const u of G.units) UT[idx(u.x, u.y)].push(u);
  CM = new Map();
  for (const c of G.cities) CM.set(c.id, c);
  for (const c of G.civs) {
    if (!c.explored || c.explored.length !== G.W * G.H) { c.explored = new Array(G.W * G.H).fill(0); c.expCount = 0; }
  }
}

function log(msg, civId = -1, kind = 'info') {
  G.log.push({ t: G.turn, msg, civ: civId, kind });
  if (G.log.length > 400) G.log.splice(0, G.log.length - 400);
  if (civId === G.player || civId === -2) Hooks.log(msg, kind);
}

// ---------------------------------------------------------------------------
// basic queries
// ---------------------------------------------------------------------------
const civOf = id => G.civs[id];
const player = () => G.civs[G.player];
const hasTech = (c, t) => !t || !!c.techs[t];
const hasCivic = (c, t) => !t || !!c.civics[t];
const modsOf = c => (c.key ? CIVS[c.key].mods : {});
const cityById = id => CM.get(id);
const cityAtTile = t => (t && t.cc != null ? CM.get(t.cc) : null);
const cityAt = (x, y) => cityAtTile(tileAt(x, y));
const unitsAt = (x, y) => (inMap(x, y) ? UT[idx(x, y)] : []);
const isCivilian = u => UNITS[u.type].cls === 'civ';
const isMilitary = u => UNITS[u.type].cls !== 'civ';
const civCities = c => G.cities.filter(ct => ct.civ === c.id);
const civUnits = c => G.units.filter(u => u.civ === c.id);
const passableLand = t => t && !TERRAIN[t.t].water && !t.mtn;
const isCoastalCity = city => neighbors(city.x, city.y).some(([x, y]) => TERRAIN[tileAt(x, y).t].water);
const eraDiscount = e => [1, 1, 0.95, 0.8, 0.65, 0.55, 0.5, 0.5][e];
const techCost = t => Math.round(TECHS[t].cost * G.mul * eraDiscount(TECHS[t].era));
const civicCost = t => Math.round(CIVICS[t].cost * G.mul * eraDiscount(CIVICS[t].era));
const eraOf = c => { let e = 0; for (const t in c.techs) if (TECHS[t] && TECHS[t].era > e) e = TECHS[t].era; return e; };

function isAtWar(a, b) {
  if (a === b) return false;
  const A = G.civs[a], B = G.civs[b];
  if (A.isBarb || B.isBarb) return true;
  return !!A.war[b];
}

function canSeeRes(c, r) { return !RES[r].tech || hasTech(c, RES[r].tech); }

function unitTypeFor(c, base) {
  if (c.key) { const uu = CIVS[c.key].uu; if (uu && UNITS[uu].replaces === base) return uu; }
  return base;
}
function buildingFor(c, base) {
  if (c.key) { const ub = CIVS[c.key].ub; if (ub && BUILDINGS[ub].replaces === base) return ub; }
  return base;
}
const baseBuilding = b => BUILDINGS[b].replaces || b;
function cityHas(city, base) {
  for (const b in city.buildings) if (baseBuilding(b) === base) return true;
  return false;
}

function hasPolicy(c, p) { return c.slots.some(s => s.includes(p)); }

function slotCounts(c) {
  if (!c.gov) return [0, 0, 0, 0];
  const s = GOVERNMENTS[c.gov].slots.slice();
  s[3] += (modsOf(c).wildcard || 0);
  if (civCities(c).some(ct => ct.wonders.includes('forbiddenCity'))) s[3] += 1;
  return s;
}

function setGovernment(c, g) {
  c.gov = g;
  const counts = slotCounts(c);
  const all = c.slots.flat();
  c.slots = [[], [], [], []];
  for (const p of all) {
    const k = POLICIES[p].slot;
    if (k < 3 && c.slots[k].length < counts[k]) c.slots[k].push(p);
    else if (c.slots[3].length < counts[3]) c.slots[3].push(p);
  }
}

function policyUnlocked(c, p) { return hasCivic(c, POLICIES[p].civic); }

function strategicOwned(c) {
  const out = {};
  for (let i = 0; i < G.tiles.length; i++) {
    const t = G.tiles[i];
    if (t.owner !== c.id || !t.res) continue;
    const R = RES[t.res];
    if (R.type !== 'strategic' || !canSeeRes(c, t.res)) continue;
    if (t.imp === R.imp) out[t.res] = (out[t.res] || 0) + 1;
  }
  return out;
}

function luxuriesOwned(c) {
  const out = {};
  for (let i = 0; i < G.tiles.length; i++) {
    const t = G.tiles[i];
    if (t.owner !== c.id || !t.res) continue;
    const R = RES[t.res];
    if (R.type !== 'luxury') continue;
    if (R.water || t.imp === R.imp) out[t.res] = (out[t.res] || 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// yields
// ---------------------------------------------------------------------------
function tileYield(t, c) {
  const y = zeroY();
  if (t.mtn || t.dist) return y;
  const T = TERRAIN[t.t];
  y.f += T.f; y.p += T.p; y.g += T.g;
  if (t.hills) y.p += 1;
  if (t.feat) { const F = FEATURES[t.feat]; y.f += F.f || 0; y.p += F.p || 0; }
  const m = c ? modsOf(c) : {};
  if (t.res && (!c || canSeeRes(c, t.res))) {
    const R = RES[t.res];
    addY(y, R);
    if (t.imp && t.imp === R.imp) {
      if (R.type === 'luxury') y.g += 1;
      if (m.stratMine && t.imp === 'mine' && (t.res === 'iron' || t.res === 'coal')) y.p += m.stratMine;
    }
  }
  if (t.imp) {
    addY(y, IMPROVEMENTS[t.imp]);
    if (t.imp === 'farm' && m.farmFood) y.f += m.farmFood;
    if (t.imp === 'mine' && m.mineProd) y.p += m.mineProd;
    if (c && c.pantheon === 'goddessHunt' && t.imp === 'camp') { y.f += 1; y.fa += 1; }
    if (c && c.pantheon === 'stoneCircles' && t.imp === 'quarry') y.fa += 2;
  }
  if (c && c.pantheon === 'sacredGroves' && t.feat === 'forest') y.fa += 1;
  if (c && c.pantheon === 'godSea' && t.t === 'coast') y.p += 1;
  if (c && c.pantheon === 'danceAurora' && t.t === 'tundra') y.fa += 1;
  return y;
}

function cityTiles(city) {
  return tilesInRadius(city.x, city.y, 3).filter(([x, y]) => tileAt(x, y).city === city.id);
}

function cityHousing(city) {
  const c = G.civs[city.civ];
  let h = 4 + (isCoastalCity(city) ? 1 : 0);
  if (city.capital) h += 1;
  for (const b in city.buildings) h += BUILDINGS[b].housing || 0;
  if (city.districts.aqueduct && city.districts.aqueduct.built) h += 4;
  for (const [x, y] of cityTiles(city)) if (tileAt(x, y).imp === 'farm') h += 0.5;
  if (c.gov === 'monarchy') h += 2;
  if (hasPolicy(c, 'urbanHousing')) h += 3;
  return Math.floor(h);
}

function growthThreshold(pop) {
  return Math.floor((15 + 8 * (pop - 1) + Math.pow(pop - 1, 1.5)) * G.mul);
}

function countAdj(x, y, fn) { let n = 0; for (const [nx, ny] of neighbors(x, y)) if (fn(tileAt(nx, ny), nx, ny)) n++; return n; }
const isDistrictTile = t => !!t.dist || t.cc != null;

function adjacency(did, x, y, c, city) {
  const m = modsOf(c);
  const dw = m.districtAdj ? 1 : 0.5;
  const nd = countAdj(x, y, t => isDistrictTile(t));
  let v = 0;
  switch (did) {
    case 'campus':
      v = countAdj(x, y, t => t.mtn) + countAdj(x, y, t => t.feat === 'jungle') * 0.5 + nd * dw;
      if (hasPolicy(c, 'naturalPhilosophy')) v *= 2;
      break;
    case 'holy':
      v = countAdj(x, y, t => t.mtn) * (m.holyMountain || 1) + countAdj(x, y, t => t.feat === 'forest') * 0.5 + nd * dw;
      if (hasPolicy(c, 'scripture')) v *= 2;
      break;
    case 'commercial':
      v = countAdj(x, y, t => t.dist === 'harbor') * 2 + (countAdj(x, y, t => TERRAIN[t.t].water) ? 1 : 0) + nd * dw;
      if (m.commercialPasture) v += countAdj(x, y, t => t.imp === 'pasture') * m.commercialPasture;
      if (hasPolicy(c, 'townCharters')) v *= 2;
      break;
    case 'harbor':
      v = countAdj(x, y, t => t.cc != null) * 2 + countAdj(x, y, t => t.res && RES[t.res].water) + countAdj(x, y, t => !!t.dist) * dw;
      break;
    case 'industrial':
      v = countAdj(x, y, t => t.imp === 'mine' || t.imp === 'quarry') + countAdj(x, y, t => t.dist === 'aqueduct') * 2 + nd * dw;
      if (m.industrialAdj) v *= m.industrialAdj;
      if (hasPolicy(c, 'craftsmen')) v *= 2;
      break;
    case 'theater':
      v = (city ? city.wonders.length : 0) + countAdj(x, y, t => t.dist === 'entertainment') * 2 + nd * dw;
      break;
    default: v = 0;
  }
  return Math.floor(v);
}

function capitalOf(c) { return G.cities.find(ct => ct.civ === c.id && ct.capital); }

// Full yield breakdown for a city.
function cityYields(city) {
  const c = G.civs[city.civ];
  const m = modsOf(c);
  const y = zeroY();
  const ct = tileAt(city.x, city.y);
  const cy = tileYield(ct, c);
  cy.f = Math.max(cy.f, 2); cy.p = Math.max(cy.p, 1);
  addY(y, cy);
  for (const i of city.worked) addY(y, tileYield(G.tiles[i], c));
  y.s += city.pop * 0.5;
  y.c += city.pop * 0.3;
  for (const b in city.buildings) addY(y, BUILDINGS[b]);
  for (const w of city.wonders) addY(y, WONDERS[w]);
  if (city.capital) { y.p += 2; y.s += 2; y.c += 1; y.g += 5; }
  let nDist = 0;
  for (const d in city.districts) {
    const D = city.districts[d];
    if (!D.built) continue;
    nDist++;
    const k = DISTRICTS[d].yld;
    if (k) y[k] += adjacency(d, D.x, D.y, c, city);
    if (d === 'commercial' && m.commercialGold) y.g += m.commercialGold;
    if (d === 'holy' && c.religion && c.religion.follower === 'jesuit') y.s += 2;
  }
  if (hasPolicy(c, 'meritocracy')) y.c += nDist;
  if (c.religion) {
    const nRel = (cityHas(city, 'shrine') ? 1 : 0) + (cityHas(city, 'temple') ? 1 : 0);
    if (c.religion.follower === 'feedWorld') y.f += 2 * nRel;
    if (c.religion.follower === 'choralMusic') y.c += 2 * nRel;
    const fb = c.religion.founder;
    if (fb === 'tithe') y.g += Math.floor(city.pop / 4);
    if (fb === 'churchProp') y.g += 2;
    if (fb === 'worldChurch') y.c += 1;
    if (fb === 'pilgrimage') y.fa += 2;
  }
  if (hasPolicy(c, 'urbanPlanning')) y.p += 1;
  if (hasPolicy(c, 'caravansaries')) y.g += 2;
  if (hasPolicy(c, 'raj')) { y.g += 2; y.c += 1; }
  if (city.capital) {
    if (hasPolicy(c, 'godKing')) { y.fa += 1; y.g += 1; }
    if (hasPolicy(c, 'inspiration')) y.s += 2;
    if (hasPolicy(c, 'revelation')) y.fa += 2;
    if (hasPolicy(c, 'embassies')) { const met = Object.keys(c.met).length; y.s += met; y.c += met; }
    if (c.gov === 'autocracy') for (const k of YKEYS) y[k] += 2;
  }
  if (m.coastalGold && isCoastalCity(city)) { y.g += m.coastalGold; y.p += m.coastalProd || 0; }

  // percentage modifiers
  let pp = 0, gp = 0, sp = 0, cp = 0, fp = 0;
  if (c.ga > 0) { pp += 0.2; gp += 0.2; cp += 0.1; }
  if (c.gov === 'communism') pp += 0.15;
  if (c.gov === 'merchantRepublic') gp += 0.15;
  if (c.gov === 'democracy') { gp += 0.1; sp += 0.1; }
  if (c.gov === 'theocracy') fp += 0.15;
  if (hasPolicy(c, 'freeMarket')) gp += 0.15;
  if (hasPolicy(c, 'rationalism')) sp += 0.15;
  if (c.religion && c.religion.follower === 'workEthic') pp += 0.1;
  if (civCities(c).some(x => x.wonders.includes('bigBen'))) gp += 0.1;
  if (!c.isPlayer && !c.isBarb) {
    const b = DIFFICULTIES[G.difficulty].ai - 1;
    pp += b; sp += b; cp += b; gp += b;
  }
  y.p *= 1 + pp; y.g *= 1 + gp; y.s *= 1 + sp; y.c *= 1 + cp; y.fa *= 1 + fp;

  // food & growth
  let net = y.f - city.pop * 2;
  if (net > 0) {
    let gm = 1 + (m.growth || 0);
    if (c.pantheon === 'fertility') gm += 0.1;
    if (civCities(c).some(x => x.wonders.includes('hanging'))) gm += 0.15;
    const diff = cityHousing(city) - city.pop;
    const hf = diff >= 2 ? 1 : diff === 1 ? 0.5 : diff > -4 ? 0.25 : 0;
    const uh = c.happy < -10 ? 0 : c.happy < 0 ? 0.25 : 1;
    net = net * gm * hf * uh;
  }
  y.net = net;
  return y;
}

function citizenScore(y, focus, needFood) {
  const w = { f: needFood ? 4 : 1.4, p: 1.5, g: 0.9, s: 1.1, c: 1.0, fa: 0.8 };
  if (focus === 'food') w.f += 2;
  if (focus === 'production') w.p += 2;
  if (focus === 'gold') w.g += 2;
  if (focus === 'science') w.s += 2;
  if (focus === 'faith') w.fa += 2;
  let s = 0;
  for (const k of YKEYS) s += (y[k] || 0) * w[k];
  return s;
}

function assignWorkers(city) {
  const c = G.civs[city.civ];
  const cands = [];
  for (const [x, y] of cityTiles(city)) {
    if (x === city.x && y === city.y) continue;
    const t = tileAt(x, y);
    if (t.dist || t.mtn) continue;
    if (unitsAt(x, y).some(u => u.civ !== c.id && isAtWar(u.civ, c.id))) continue;
    cands.push({ i: idx(x, y), y: tileYield(t, c) });
  }
  city.worked = [];
  const ct = tileYield(tileAt(city.x, city.y), c);
  let food = Math.max(ct.f, 2);
  for (let n = 0; n < city.pop && cands.length; n++) {
    const needFood = food - (n + 1) * 2 < 2;
    let best = -1, bs = -1e9;
    for (let k = 0; k < cands.length; k++) {
      const s = citizenScore(cands[k].y, city.focus, needFood);
      if (s > bs) { bs = s; best = k; }
    }
    food += cands[best].y.f;
    city.worked.push(cands[best].i);
    cands.splice(best, 1);
  }
}

// ---------------------------------------------------------------------------
// happiness
// ---------------------------------------------------------------------------
function happinessBreakdown(c) {
  const cities = civCities(c);
  const rows = [];
  const add = (label, v) => { if (v) rows.push([label, v]); };
  add('Base', DIFFICULTIES[G.difficulty].happy);
  const lux = Object.keys(luxuriesOwned(c)).length;
  add(`Luxury resources (${lux} kinds)`, lux * (4 + (modsOf(c).luxHappy || 0)));
  let bld = 0, won = 0;
  for (const ct of cities) {
    for (const b in ct.buildings) bld += BUILDINGS[b].happy || 0;
    for (const w of ct.wonders) won += WONDERS[w].happy || 0;
  }
  add('Buildings', bld);
  add('Wonders', won);
  if (hasPolicy(c, 'charismatic')) add('Charismatic Leader', 3);
  if (c.gov === 'republic') add('Classical Republic', 3);
  if (c.religion && c.religion.follower === 'zen') add('Zen Meditation', cities.length);
  add('Number of cities', -3 * cities.length);
  const pop = cities.reduce((s, ct) => s + ct.pop, 0);
  add('Population', -Math.round(pop * 0.75));
  const total = rows.reduce((s, r) => s + r[1], 0);
  return { rows, total };
}

function updateHappiness(c) { c.happy = happinessBreakdown(c).total; return c.happy; }

// ---------------------------------------------------------------------------
// cities
// ---------------------------------------------------------------------------
function canFoundCity(c, x, y) {
  const t = tileAt(x, y);
  if (!passableLand(t)) return false;
  if (t.owner >= 0 && t.owner !== c.id) return false;
  if (t.camp) return false;
  for (const ct of G.cities) if (hexDist(ct.x, ct.y, x, y) < 4) return false;
  return true;
}

function nextCityName(c) {
  const list = CIVS[c.key].cities;
  const used = new Set(G.cities.map(x => x.name));
  for (let i = 0; i < list.length; i++) { if (!used.has(list[i])) return list[i]; }
  c.cityNameIdx++;
  return `New ${list[c.cityNameIdx % list.length]}`;
}

function foundCity(c, x, y) {
  const t = tileAt(x, y);
  const first = !civCities(c).length;
  const city = {
    id: G.nextId++, civ: c.id, name: nextCityName(c), x, y, pop: 1, food: 0, build: null, progress: {},
    buildings: {}, wonders: [], districts: {}, hp: 200, worked: [], focus: 'balanced', capital: first && !c.foundedAny,
    origCap: !c.foundedAny ? c.id : -1, founder: c.id, cult: 0, claims: 0, fired: false, overflow: 0, founded: G.turn,
  };
  c.foundedAny = true;
  t.cc = city.id; t.imp = null; if (t.feat === 'jungle' || t.feat === 'marsh') t.feat = null;
  if (t.camp) removeCamp(x, y);
  G.cities.push(city); CM.set(city.id, city);
  claimTile(city, x, y, true);
  for (const [nx, ny] of neighbors(x, y)) { const nt = tileAt(nx, ny); if (nt.owner < 0) claimTile(city, nx, ny, true); }
  if (modsOf(c).freeMonument) city.buildings.monument = true;
  if (!capitalOf(c)) city.capital = true;
  assignWorkers(city);
  updateHappiness(c);
  log(`${city.name} has been founded.`, c.id, 'good');
  return city;
}

function claimTile(city, x, y, free) {
  const t = tileAt(x, y);
  t.owner = city.civ; t.city = city.id;
  if (!free) city.claims++;
  if (t.camp) removeCamp(x, y);
}

function cultureNeeded(city) { return Math.floor((12 + 7 * city.claims + Math.pow(city.claims, 1.5)) * G.mul); }

function borderCandidates(city) {
  const out = [];
  for (const [x, y] of tilesInRadius(city.x, city.y, 3)) {
    const t = tileAt(x, y);
    if (t.owner >= 0) continue;
    if (!neighbors(x, y).some(([nx, ny]) => tileAt(nx, ny).city === city.id)) continue;
    out.push([x, y]);
  }
  return out;
}

function tileValue(t, c) {
  const y = tileYield(t, c);
  let s = y.f * 1.3 + y.p * 1.2 + y.g * 0.6 + y.s + y.c + y.fa * 0.6;
  if (t.res) s += RES[t.res].type === 'luxury' ? 4 : RES[t.res].type === 'strategic' ? 3 : 1.5;
  if (t.mtn) s += 0.5;
  return s;
}

function growBorders(city) {
  const cands = borderCandidates(city);
  if (!cands.length) return;
  const c = G.civs[city.civ];
  let best = null, bs = -1e9;
  for (const [x, y] of cands) {
    const s = tileValue(tileAt(x, y), c) - hexDist(city.x, city.y, x, y) * 0.8 + Math.random() * 0.3;
    if (s > bs) { bs = s; best = [x, y]; }
  }
  claimTile(city, best[0], best[1], false);
}

function tileBuyCost(city, x, y) {
  const c = G.civs[city.civ];
  let v = (35 + 10 * hexDist(city.x, city.y, x, y) + 4 * city.claims) * G.mul * 1.3;
  if (hasPolicy(c, 'landSurveyors')) v *= 0.7;
  return Math.round(v);
}

function buyTile(city, x, y) {
  const c = G.civs[city.civ];
  const cost = tileBuyCost(city, x, y);
  if (c.gold < cost) return false;
  c.gold -= cost;
  claimTile(city, x, y, false);
  assignWorkers(city);
  return true;
}

function districtCount(city) {
  let n = 0;
  for (const d in city.districts) if (!DISTRICTS[d].noCount) n++;
  return n;
}
function districtLimit(city) { return 1 + Math.floor((city.pop - 1) / 3); }

function canPlaceDistrict(city, did, x, y) {
  const t = tileAt(x, y);
  if (!t || t.city !== city.id || t.cc != null || t.dist || t.mtn) return false;
  if (t.res && RES[t.res].type !== 'bonus') return false;
  const D = DISTRICTS[did];
  if (D.water) { if (t.t !== 'coast') return false; }
  else if (TERRAIN[t.t].water) return false;
  if (D.adjCenter && hexDist(x, y, city.x, city.y) !== 1) return false;
  if (D.flatOnly && t.hills) return false;
  if (unitsAt(x, y).some(u => u.civ !== city.civ)) return false;
  return true;
}

function districtSpots(city, did) {
  return cityTiles(city).filter(([x, y]) => canPlaceDistrict(city, did, x, y));
}

function bestDistrictSpot(city, did) {
  const c = G.civs[city.civ];
  let best = null, bs = -1e9;
  for (const [x, y] of districtSpots(city, did)) {
    const t = tileAt(x, y);
    const s = adjacency(did, x, y, c, city) * 3 - tileValue(t, c) * 0.6 - (t.imp ? 2 : 0) + Math.random() * 0.2;
    if (s > bs) { bs = s; best = [x, y]; }
  }
  return best;
}

function totalProgress(c) {
  const nt = Object.keys(TECHS).length + Object.keys(CIVICS).length;
  return (Object.keys(c.techs).length + Object.keys(c.civics).length) / nt;
}

function itemCost(city, key) {
  const [k, id] = key.split(':');
  const c = G.civs[city.civ];
  let base;
  if (k === 'u') base = UNITS[id].cost;
  else if (k === 'b') base = BUILDINGS[id].cost;
  else if (k === 'w') base = WONDERS[id].cost;
  else if (k === 'p') base = PROJECTS[id].cost;
  else if (k === 'd') {
    base = 55 + 330 * totalProgress(c);
    if (id === 'harbor' && modsOf(c).harborCheap) base *= 0.5;
    if (id === 'aqueduct') base *= 0.8;
  }
  if (k === 'u' && id === 'settler') base += 15 * Math.max(0, civCities(c).length - 1);
  return Math.max(10, Math.round(base * G.mul));
}

function prodMultiplier(city, key) {
  const [k, id] = key.split(':');
  const c = G.civs[city.civ];
  const m = modsOf(c);
  let v = 1;
  if (k === 'u') {
    const cls = UNITS[id].cls;
    if (id === 'settler' && hasPolicy(c, 'colonization')) v += 0.5;
    if (id === 'builder' && hasPolicy(c, 'ilkum')) v += 0.3;
    if (['melee', 'ranged', 'anticav'].includes(cls) && hasPolicy(c, 'agoge')) v += 0.5;
    if (['lightcav', 'heavycav'].includes(cls) && hasPolicy(c, 'maneuver')) v += 0.5;
    if (cls !== 'civ' && c.pantheon === 'godForge') v += 0.25;
    if (cls === 'siege' && m.siegeProd) v += m.siegeProd;
  } else if (k === 'b') {
    if (baseBuilding(id) === 'walls' && hasPolicy(c, 'limes')) v += 1;
  } else if (k === 'd') {
    if (m.districtProd) v += m.districtProd;
    if (hasPolicy(c, 'publicWorks')) v += 0.3;
    if (c.pantheon === 'cityPatron' && Object.keys(city.districts).length === 0) v += 0.25;
  } else if (k === 'w') {
    if (m.wonderProd) v += m.wonderProd;
    if (c.pantheon === 'monumentGods') v += 0.15;
  }
  return v;
}

function unitObsolete(c, id) {
  const U = UNITS[id];
  if (!U.upg) return false;
  const nxt = unitTypeFor(c, U.upg);
  return hasTech(c, UNITS[nxt].tech) && (!UNITS[nxt].res || strategicOwned(c)[UNITS[nxt].res]);
}

function canTrain(city, id, strat) {
  const c = G.civs[city.civ];
  const U = UNITS[id];
  if (U.unique && U.unique !== c.key) return false;
  if (!U.unique && unitTypeFor(c, id) !== id) return false;
  if (!hasTech(c, U.tech)) return false;
  if (U.res && !(strat || strategicOwned(c))[U.res]) return false;
  if (id === 'settler' && (city.pop < 2 || c.happy <= -10)) return false;
  if (unitObsolete(c, id)) return false;
  return true;
}

function canBuildBuilding(city, id) {
  const c = G.civs[city.civ];
  const B = BUILDINGS[id];
  if (B.unique && B.unique !== c.key) return false;
  if (!B.unique && buildingFor(c, id) !== id) return false;
  if (city.buildings[id]) return false;
  if (!hasTech(c, B.tech) || !hasCivic(c, B.civic)) return false;
  if (B.district && !(city.districts[B.district] && city.districts[B.district].built)) return false;
  if (B.req && !cityHas(city, B.req)) return false;
  return true;
}

function canBuildDistrict(city, id) {
  const c = G.civs[city.civ];
  const D = DISTRICTS[id];
  if (city.districts[id]) return false;
  if (!hasTech(c, D.tech) || !hasCivic(c, D.civic)) return false;
  if (!D.noCount && districtCount(city) >= districtLimit(city)) return false;
  return districtSpots(city, id).length > 0;
}

function wonderInProgressElsewhere(c, w, city) {
  return G.cities.some(ct => ct.civ === c.id && ct.id !== city.id && ct.build === 'w:' + w);
}

function canBuildWonder(city, id) {
  const c = G.civs[city.civ];
  const W = WONDERS[id];
  if (G.wonders[id] != null) return false;
  if (!hasTech(c, W.tech) || !hasCivic(c, W.civic)) return false;
  if (W.coastal && !isCoastalCity(city)) return false;
  if (wonderInProgressElsewhere(c, id, city)) return false;
  return true;
}

function canBuildProject(city, id) {
  const c = G.civs[city.civ];
  const P = PROJECTS[id];
  if (c.projects[id]) return false;
  if (!hasTech(c, P.tech)) return false;
  if (P.req && !c.projects[P.req]) return false;
  if (!(city.districts.spaceport && city.districts.spaceport.built)) return false;
  if (G.cities.some(ct => ct.civ === c.id && ct.id !== city.id && ct.build === 'p:' + id)) return false;
  return true;
}

function canBuildKey(city, key, strat) {
  const [k, id] = key.split(':');
  if (k === 'u') return canTrain(city, id, strat);
  if (k === 'b') return canBuildBuilding(city, id);
  if (k === 'd') return !!city.districts[id] && !city.districts[id].built ? true : canBuildDistrict(city, id);
  if (k === 'w') return canBuildWonder(city, id);
  if (k === 'p') return canBuildProject(city, id);
  return false;
}

function availableItems(city) {
  const strat = strategicOwned(G.civs[city.civ]);
  const out = [];
  for (const id in DISTRICTS) {
    const D = city.districts[id];
    if ((D && !D.built) || (!D && canBuildDistrict(city, id))) out.push({ key: 'd:' + id, kind: 'District', name: DISTRICTS[id].name, desc: DISTRICTS[id].desc });
  }
  for (const id in BUILDINGS) if (canBuildBuilding(city, id)) out.push({ key: 'b:' + id, kind: 'Building', name: BUILDINGS[id].name, desc: BUILDINGS[id].desc });
  for (const id in UNITS) if (canTrain(city, id, strat)) out.push({ key: 'u:' + id, kind: 'Unit', name: UNITS[id].name, desc: unitDesc(id) });
  for (const id in WONDERS) if (canBuildWonder(city, id)) out.push({ key: 'w:' + id, kind: 'Wonder', name: WONDERS[id].name, desc: WONDERS[id].desc });
  for (const id in PROJECTS) if (canBuildProject(city, id)) out.push({ key: 'p:' + id, kind: 'Project', name: PROJECTS[id].name, desc: PROJECTS[id].desc });
  for (const it of out) it.cost = itemCost(city, it.key);
  return out;
}

function unitDesc(id) {
  const U = UNITS[id];
  if (U.cls === 'civ') return id === 'settler' ? 'Founds a new city. Costs 1 population.' : 'Builds improvements. Has limited charges.';
  let s = `Strength ${U.str}`;
  if (U.rs) s += `, Ranged ${U.rs} (range ${U.range})`;
  s += `, ${U.moves} moves`;
  if (U.res) s += `. Needs ${RES[U.res].name}`;
  if (U.unique) s += `. Unique to ${CIVS[U.unique].name}`;
  return s;
}

function setBuild(city, key, spot) {
  const [k, id] = key.split(':');
  if (k === 'd' && !city.districts[id]) {
    const s = spot || bestDistrictSpot(city, id);
    if (!s) return false;
    const t = tileAt(s[0], s[1]);
    t.dist = id; t.distCity = city.id; t.imp = null; t.feat = null;
    city.districts[id] = { x: s[0], y: s[1], built: false };
    assignWorkers(city);
  }
  city.build = key;
  if (city.overflow) { city.progress[key] = (city.progress[key] || 0) + city.overflow; city.overflow = 0; }
  return true;
}

function goldCost(city, key) {
  const [k] = key.split(':');
  if (k !== 'u' && k !== 'b') return null;
  const rem = Math.max(0, itemCost(city, key) - (city.progress[key] || 0));
  return Math.ceil(rem * (k === 'u' ? 3 : 2.5) + 10);
}

function faithCost(city, key) {
  const [k, id] = key.split(':');
  const c = G.civs[city.civ];
  const rem = Math.max(0, itemCost(city, key) - (city.progress[key] || 0));
  if (k === 'b' && (baseBuilding(id) === 'shrine' || baseBuilding(id) === 'temple')) return Math.ceil(rem * 2);
  if (k === 'u' && c.gov === 'theocracy' && UNITS[id].cls !== 'civ') return Math.ceil(rem * 2);
  return null;
}

function purchase(city, key, currency) {
  const c = G.civs[city.civ];
  const cost = currency === 'faith' ? faithCost(city, key) : goldCost(city, key);
  if (cost == null) return false;
  if ((currency === 'faith' ? c.faith : c.gold) < cost) return false;
  const [k, id] = key.split(':');
  if (k === 'u' && !spawnSpot(city, id)) return false;
  if (currency === 'faith') c.faith -= cost; else c.gold -= cost;
  delete city.progress[key];
  completeItem(city, key);
  if (city.build === key) city.build = null;
  return true;
}

function spawnSpot(city, type) {
  const civl = UNITS[type].cls === 'civ';
  const free = (x, y) => passableLand(tileAt(x, y)) && !unitsAt(x, y).some(u => isCivilian(u) === civl || u.civ !== city.civ);
  if (free(city.x, city.y)) return [city.x, city.y];
  for (const [x, y] of neighbors(city.x, city.y)) if (free(x, y)) return [x, y];
  return null;
}

function completeItem(city, key) {
  const [k, id] = key.split(':');
  const c = G.civs[city.civ];
  if (k === 'u') {
    const s = spawnSpot(city, id);
    if (!s) return false;
    const u = createUnit(c.id, id, s[0], s[1]);
    if (id === 'settler') { city.pop = Math.max(1, city.pop - 1); assignWorkers(city); }
    if (UNITS[id].cls !== 'civ') {
      let xp = 0;
      if (cityHas(city, 'barracks')) xp += 15;
      if (cityHas(city, 'armory')) xp += 30;
      if (xp) { u.xp = xp; checkPromotion(u, true); }
    }
    log(`${city.name} trained a ${UNITS[id].name}.`, c.id);
  } else if (k === 'b') {
    city.buildings[id] = true;
    if (BUILDINGS[id].hp) city.hp += BUILDINGS[id].hp;
    log(`${city.name} built a ${BUILDINGS[id].name}.`, c.id);
  } else if (k === 'd') {
    city.districts[id].built = true;
    log(`${city.name} completed a ${DISTRICTS[id].name}.`, c.id);
  } else if (k === 'w') {
    if (G.wonders[id] != null) {
      const refund = Math.round(itemCost(city, key) * 0.5);
      c.gold += refund;
      log(`${WONDERS[id].name} was already built elsewhere. ${city.name} recovers ${refund} gold.`, c.id, 'bad');
      return true;
    }
    G.wonders[id] = c.id; city.wonders.push(id); c.wondersBuilt++;
    tileAt(city.x, city.y).wonder = id;
    log(`${c.name} completed the ${WONDERS[id].name} in ${city.name}!`, -2, c.isPlayer ? 'good' : 'info');
    wonderEffect(c, id);
    // other civs lose progress on it
    for (const o of G.cities) if (o.id !== city.id && o.build === key) { o.overflow += Math.floor((o.progress[key] || 0) * 0.5); delete o.progress[key]; o.build = null; }
  } else if (k === 'p') {
    c.projects[id] = true;
    log(`${c.name} completed ${PROJECTS[id].name}!`, -2, c.isPlayer ? 'good' : 'bad');
  }
  updateHappiness(c);
  return true;
}

function wonderEffect(c, id) {
  if (id === 'greatLibrary') {
    for (const t in TECHS) if (TECHS[t].era <= 1 && !c.techs[t] && !c.boosted[t] && TECHS[t].boost) applyBoost(c, 'tech', t, true);
  } else if (id === 'terracotta') {
    for (const u of civUnits(c)) if (isMilitary(u)) { u.lvl++; u.hp = 100; }
  } else if (id === 'oxford') {
    for (let i = 0; i < 2; i++) {
      const av = availableTechs(c);
      if (av.length) completeTech(c, av.sort((a, b) => techCost(a) - techCost(b))[0]);
    }
  } else if (id === 'forbiddenCity') setGovernment(c, c.gov || 'chiefdom');
}

// ---------------------------------------------------------------------------
// research & civics
// ---------------------------------------------------------------------------
function availableTechs(c) { return Object.keys(TECHS).filter(t => !c.techs[t] && TECHS[t].req.every(r => c.techs[r])); }
function availableCivics(c) { return Object.keys(CIVICS).filter(t => !c.civics[t] && CIVICS[t].req.every(r => c.civics[r])); }

function pathTo(c, target, table, known) {
  const out = [];
  const visit = t => {
    if (known[t] || out.includes(t)) return;
    for (const r of table[t].req) visit(r);
    out.push(t);
  };
  visit(target);
  return out;
}

function setResearch(c, t) {
  if (c.techs[t]) return;
  if (TECHS[t].req.every(r => c.techs[r])) { c.researching = t; c.techGoal = null; }
  else { c.techGoal = t; c.researching = pathTo(c, t, TECHS, c.techs)[0]; }
  if (c.sciBank) { c.techProg[c.researching] = (c.techProg[c.researching] || 0) + c.sciBank; c.sciBank = 0; }
}

function setCivic(c, t) {
  if (c.civics[t]) return;
  if (CIVICS[t].req.every(r => c.civics[r])) { c.civicing = t; c.civicGoal = null; }
  else { c.civicGoal = t; c.civicing = pathTo(c, t, CIVICS, c.civics)[0]; }
  if (c.cultBank) { c.civicProg[c.civicing] = (c.civicProg[c.civicing] || 0) + c.cultBank; c.cultBank = 0; }
}

function completeTech(c, t) {
  c.techs[t] = true;
  const over = Math.max(0, (c.techProg[t] || 0) - techCost(t));
  delete c.techProg[t];
  if (c.researching === t) {
    c.researching = null;
    if (c.techGoal && !c.techs[c.techGoal]) c.researching = pathTo(c, c.techGoal, TECHS, c.techs)[0];
    else c.techGoal = null;
    if (c.researching) c.techProg[c.researching] = (c.techProg[c.researching] || 0) + over;
    else c.sciBank += over;
  }
  log(`Researched ${TECHS[t].name}.`, c.id, 'good');
  if (c.isPlayer) Hooks.notify('tech', t);
}

function completeCivic(c, t) {
  c.civics[t] = true;
  const over = Math.max(0, (c.civicProg[t] || 0) - civicCost(t));
  delete c.civicProg[t];
  if (c.civicing === t) {
    c.civicing = null;
    if (c.civicGoal && !c.civics[c.civicGoal]) c.civicing = pathTo(c, c.civicGoal, CIVICS, c.civics)[0];
    else c.civicGoal = null;
    if (c.civicing) c.civicProg[c.civicing] = (c.civicProg[c.civicing] || 0) + over;
    else c.cultBank += over;
  }
  if (t === 'codeOfLaws' && !c.gov) setGovernment(c, 'chiefdom');
  log(`Completed the civic ${CIVICS[t].name}.`, c.id, 'good');
  if (c.isPlayer) Hooks.notify('civic', t);
}

function applyBoost(c, kind, t, silent) {
  const key = kind + ':' + t;
  if (c.boosted[key]) return;
  c.boosted[key] = true;
  const pct = modsOf(c).boostPct || 0.4;
  if (kind === 'tech') {
    if (c.techs[t]) return;
    c.techProg[t] = (c.techProg[t] || 0) + techCost(t) * pct;
    if (!silent) log(`Eureka! ${TECHS[t].boost.d} boosted ${TECHS[t].name}.`, c.id, 'good');
    if (c.techProg[t] >= techCost(t) && TECHS[t].req.every(r => c.techs[r])) completeTech(c, t);
  } else {
    if (c.civics[t]) return;
    c.civicProg[t] = (c.civicProg[t] || 0) + civicCost(t) * pct;
    if (!silent) log(`Inspiration! ${CIVICS[t].boost.d} boosted ${CIVICS[t].name}.`, c.id, 'good');
    if (c.civicProg[t] >= civicCost(t) && CIVICS[t].req.every(r => c.civics[r])) completeCivic(c, t);
  }
}

function civStats(c) {
  const s = { imp: {}, impAll: 0, impRes: {}, dist: {}, distAll: 0, bld: {}, bldAll: 0, cls: {}, units: 0, pop: 0, cities: 0, coastal: 0 };
  for (const t of G.tiles) {
    if (t.owner !== c.id || !t.imp) continue;
    s.imp[t.imp] = (s.imp[t.imp] || 0) + 1; s.impAll++;
    if (t.res && RES[t.res].imp === t.imp) s.impRes[t.res] = (s.impRes[t.res] || 0) + 1;
  }
  for (const ct of civCities(c)) {
    s.cities++; s.pop += ct.pop;
    if (isCoastalCity(ct)) s.coastal++;
    for (const d in ct.districts) if (ct.districts[d].built) { s.dist[d] = (s.dist[d] || 0) + 1; s.distAll++; }
    for (const b in ct.buildings) { const bb = baseBuilding(b); s.bld[bb] = (s.bld[bb] || 0) + 1; s.bldAll++; }
  }
  for (const u of civUnits(c)) { const cls = UNITS[u.type].cls; s.cls[cls] = (s.cls[cls] || 0) + 1; if (cls !== 'civ') s.units++; }
  s.lux = Object.keys(luxuriesOwned(c)).length;
  return s;
}

function boostMet(c, b, s) {
  switch (b.k) {
    case 'imp': return (b.v === '*' ? s.impAll : (s.imp[b.v] || 0)) >= b.n;
    case 'impRes': return (s.impRes[b.v] || 0) >= b.n;
    case 'kills': return c.kills >= b.n;
    case 'barbKills': return c.barbKills >= b.n;
    case 'meet': return Object.keys(c.met).length >= b.n;
    case 'explored': return c.expCount >= b.n;
    case 'lux': return s.lux >= b.n;
    case 'districts': return s.distAll >= b.n;
    case 'district': return (s.dist[b.v] || 0) >= b.n;
    case 'building': return (s.bld[b.v] || 0) >= b.n;
    case 'buildings': return s.bldAll >= b.n;
    case 'unitCls': return (s.cls[b.v] || 0) >= b.n;
    case 'units': return s.units >= b.n;
    case 'civic': return !!c.civics[b.v];
    case 'tech': return !!c.techs[b.v];
    case 'pop': return s.pop >= b.n;
    case 'cities': return s.cities >= b.n;
    case 'coastal': return s.coastal >= b.n;
    case 'pantheon': return !!c.pantheon;
    case 'wonders': return c.wondersBuilt >= b.n;
    case 'project': return !!c.projects[b.v];
  }
  return false;
}

function checkBoosts(c) {
  const s = civStats(c);
  for (const t in TECHS) {
    const b = TECHS[t].boost;
    if (b && !c.techs[t] && !c.boosted['tech:' + t] && boostMet(c, b, s)) applyBoost(c, 'tech', t);
  }
  for (const t in CIVICS) {
    const b = CIVICS[t].boost;
    if (b && !c.civics[t] && !c.boosted['civic:' + t] && boostMet(c, b, s)) applyBoost(c, 'civic', t);
  }
}

// ---------------------------------------------------------------------------
// religion
// ---------------------------------------------------------------------------
const pantheonCost = () => Math.round(25 * G.mul);
const religionCost = () => Math.round(200 * G.mul);
function takenPantheons() { return new Set(G.civs.map(c => c.pantheon).filter(Boolean)); }
function canFoundPantheon(c) { return !c.pantheon && c.faith >= pantheonCost(); }
function foundPantheon(c, p) {
  if (!canFoundPantheon(c) || takenPantheons().has(p)) return false;
  c.faith -= pantheonCost(); c.pantheon = p;
  log(`${c.name} adopts the pantheon ${PANTHEONS[p].name}.`, c.isPlayer ? c.id : -1, 'good');
  return true;
}
function maxReligions() { return Math.floor((G.civs.length - 1) / 2) + 1; }
function canFoundReligion(c) {
  return c.pantheon && !c.religion && c.faith >= religionCost() && G.religions.length < maxReligions()
    && civCities(c).some(ct => ct.districts.holy && ct.districts.holy.built);
}
function takenBeliefs() { const s = new Set(); for (const c of G.civs) if (c.religion) { s.add(c.religion.founder); s.add(c.religion.follower); } return s; }
function foundReligion(c, name, founder, follower) {
  if (!canFoundReligion(c)) return false;
  c.faith -= religionCost();
  c.religion = { name, founder, follower };
  G.religions.push({ name, civ: c.id });
  log(`${c.name} founded ${name}!`, -2, 'info');
  return true;
}

// ---------------------------------------------------------------------------
// units
// ---------------------------------------------------------------------------
function maxMoves(u) {
  const U = UNITS[u.type];
  const c = G.civs[u.civ];
  let m = U.moves;
  if ((U.cls === 'lightcav' || U.cls === 'heavycav') && modsOf(c).cavMoves) m += modsOf(c).cavMoves;
  return m;
}

function createUnit(civId, type, x, y) {
  const U = UNITS[type];
  const c = G.civs[civId];
  const u = { id: G.nextId++, civ: civId, type, x, y, hp: 100, moves: 0, xp: 0, lvl: 0, fort: 0, fortify: false, path: null, acted: true, sleep: false, skip: false };
  if (type === 'builder') {
    u.charges = 3 + (modsOf(c).builderCharges || 0) + (hasPolicy(c, 'serfdom') ? 2 : 0)
      + (civCities(c).some(ct => ct.wonders.includes('pyramids')) ? 1 : 0);
  }
  u.moves = maxMoves(u);
  G.units.push(u);
  UT[idx(x, y)].push(u);
  return u;
}

function removeUnit(u) {
  const a = UT[idx(u.x, u.y)];
  const k = a.indexOf(u); if (k >= 0) a.splice(k, 1);
  const j = G.units.indexOf(u); if (j >= 0) G.units.splice(j, 1);
  u.dead = true;
}

function placeUnit(u, x, y) {
  const a = UT[idx(u.x, u.y)];
  const k = a.indexOf(u); if (k >= 0) a.splice(k, 1);
  u.x = x; u.y = y;
  UT[idx(x, y)].push(u);
}

function moveCost(u, t) {
  if (!t || t.mtn || TERRAIN[t.t].water) return Infinity;
  const U = UNITS[u.type];
  if (U.ignoreTerrain) return 1;
  let c = 1;
  if (t.hills && !modsOf(G.civs[u.civ]).hillsFree) c = 2;
  if (t.feat) c = 2;
  return c;
}

// What stops unit u from standing on (x,y)?  'ok' | 'blocked' | 'enemy'
function tileStatus(u, x, y) {
  const t = tileAt(x, y);
  if (!t || moveCost(u, t) === Infinity) return 'blocked';
  const ct = cityAtTile(t);
  if (ct && ct.civ !== u.civ) return isAtWar(u.civ, ct.civ) ? 'enemy' : 'blocked';
  const here = UT[idx(x, y)];
  const civl = isCivilian(u);
  for (const o of here) {
    if (o.civ === u.civ) { if (isCivilian(o) === civl) return 'blocked'; continue; }
    if (!isAtWar(u.civ, o.civ)) return 'blocked';
    if (isMilitary(o)) return 'enemy';
    if (civl) return 'blocked';
    return 'capture';
  }
  if (t.camp && civl) return 'blocked';
  return 'ok';
}

function enemyZOC(u, x, y) {
  if (isCivilian(u)) return false;
  for (const [nx, ny] of neighbors(x, y)) {
    for (const o of UT[idx(nx, ny)]) if (o.civ !== u.civ && isMilitary(o) && isAtWar(u.civ, o.civ)) return true;
    const ct = cityAt(nx, ny);
    if (ct && ct.civ !== u.civ && isAtWar(u.civ, ct.civ)) return true;
  }
  return false;
}

// Tiles reachable this turn: Map idx -> moves left.
function reachable(u) {
  const out = new Map();
  if (u.moves <= 0) return out;
  const start = idx(u.x, u.y);
  out.set(start, u.moves);
  const q = [[u.x, u.y, u.moves]];
  while (q.length) {
    q.sort((a, b) => b[2] - a[2]);
    const [x, y, m] = q.shift();
    if (m <= 0) continue;
    const zocHere = enemyZOC(u, x, y);
    for (const [nx, ny] of neighbors(x, y)) {
      const st = tileStatus(u, nx, ny);
      if (st === 'blocked' || st === 'enemy') continue;
      const t = tileAt(nx, ny);
      let rem = Math.max(0, m - moveCost(u, t));
      if (zocHere && enemyZOC(u, nx, ny)) rem = 0;
      if (st === 'capture') rem = 0;
      const k = idx(nx, ny);
      if (!out.has(k) || out.get(k) < rem) { out.set(k, rem); q.push([nx, ny, rem]); }
    }
  }
  return out;
}

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length; k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i;
        let mk = lk;
        if (l < n && k[l] < mk) { m = l; mk = k[l]; }
        if (r < n && k[r] < mk) { m = r; }
        if (m === i) break;
        k[i] = k[m]; v[i] = v[m]; i = m;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

// A* path ignoring turn boundaries. Friendly units block only the destination tile.
function findPath(u, tx, ty, opts = {}) {
  const goal = idx(tx, ty);
  const start = idx(u.x, u.y);
  if (goal === start) return [];
  const maxN = opts.maxNodes || 4000;
  const gS = new Map([[start, 0]]);
  const came = new Map();
  const open = new MinHeap();
  open.push(hexDist(u.x, u.y, tx, ty), start);
  const civl = isCivilian(u);
  let n = 0;
  while (open.size && n++ < maxN) {
    const cur = open.pop();
    if (cur === goal) break;
    const [x, y] = xyOf(cur);
    for (const [nx, ny] of neighbors(x, y)) {
      const k = idx(nx, ny);
      const t = G.tiles[k];
      const mc = moveCost(u, t);
      if (mc === Infinity) continue;
      const ct = cityAtTile(t);
      if (ct && ct.civ !== u.civ && k !== goal) continue;
      let extra = 0;
      const here = UT[k];
      let blocked = false;
      for (const o of here) {
        if (o.civ === u.civ) { if (isCivilian(o) === civl) extra += 1.5; }
        else if (!isAtWar(u.civ, o.civ) || isMilitary(o) || civl) { if (k !== goal) blocked = true; }
      }
      if (blocked) continue;
      const g = gS.get(cur) + mc + extra;
      if (!gS.has(k) || g < gS.get(k)) {
        gS.set(k, g); came.set(k, cur);
        open.push(g + hexDist(nx, ny, tx, ty), k);
      }
    }
  }
  if (!came.has(goal)) return null;
  const path = [];
  let c = goal;
  while (c !== start) { path.push(xyOf(c)); c = came.get(c); }
  return path.reverse();
}

function stepUnit(u, x, y) {
  const st = tileStatus(u, x, y);
  if (st === 'blocked' || st === 'enemy') return false;
  const zoc = enemyZOC(u, u.x, u.y) && enemyZOC(u, x, y);
  const cost = moveCost(u, tileAt(x, y));
  if (st === 'capture') {
    for (const o of UT[idx(x, y)].slice()) {
      if (o.civ !== u.civ && isCivilian(o)) {
        if (G.civs[u.civ].isBarb) { log(`Barbarians captured and destroyed a ${UNITS[o.type].name}.`, o.civ, 'bad'); removeUnit(o); }
        else {
          const nt = o.type === 'settler' ? 'builder' : o.type;
          log(`${G.civs[u.civ].name} captured a ${UNITS[o.type].name}.`, o.civ, 'bad');
          if (u.civ === G.player) log(`You captured a ${UNITS[o.type].name}.`, u.civ, 'good');
          removeUnit(o);
          const nu = createUnit(u.civ, nt, x, y); nu.moves = 0; if (nt === 'builder') nu.charges = Math.min(nu.charges, 1);
        }
      }
    }
  }
  placeUnit(u, x, y);
  u.moves = Math.max(0, u.moves - cost);
  if (zoc || st === 'capture') u.moves = 0;
  u.acted = true; u.fortify = false; u.fort = 0; u.sleep = false;
  const t = tileAt(x, y);
  if (t.camp && isMilitary(u) && !G.civs[u.civ].isBarb) {
    removeCamp(x, y);
    const c = G.civs[u.civ];
    const g = Math.round(40 + 15 * eraOf(c));
    c.gold += g;
    log(`Barbarian camp destroyed. +${g} gold.`, u.civ, 'good');
  }
  revealAround(u);
  return true;
}

function moveAlongPath(u) {
  let guard = 0;
  while (u.path && u.path.length && u.moves > 0 && guard++ < 50) {
    const [nx, ny] = u.path[0];
    const st = tileStatus(u, nx, ny);
    if (st !== 'ok' && st !== 'capture') {
      // recompute once around the obstacle
      const dest = u.path[u.path.length - 1];
      if (u.path.length > 1) {
        const np = findPath(u, dest[0], dest[1]);
        if (np && np.length && tileStatus(u, np[0][0], np[0][1]) === 'ok') { u.path = np; continue; }
      }
      u.path = null; break;
    }
    stepUnit(u, nx, ny);
    u.path.shift();
  }
  if (u.path && !u.path.length) u.path = null;
}

function sightOf(u) { return UNITS[u.type].sight || 2; }

function revealAround(u) {
  const c = G.civs[u.civ];
  if (c.isBarb) return;
  for (const [x, y] of tilesInRadius(u.x, u.y, sightOf(u))) {
    const k = idx(x, y);
    if (!c.explored[k]) { c.explored[k] = 1; c.expCount++; }
  }
  if (c.isPlayer) Hooks.vis();
}

// Player visibility (current), plus exploration for every civ.
function updateVisibility(c) {
  const vis = new Uint8Array(G.W * G.H);
  const mark = (x, y, r) => {
    for (const [nx, ny] of tilesInRadius(x, y, r)) {
      const k = idx(nx, ny); vis[k] = 1;
      if (!c.explored[k]) { c.explored[k] = 1; c.expCount++; }
    }
  };
  for (const u of G.units) if (u.civ === c.id) mark(u.x, u.y, sightOf(u));
  for (const ct of G.cities) if (ct.civ === c.id) mark(ct.x, ct.y, 3);
  for (let i = 0; i < G.tiles.length; i++) if (G.tiles[i].owner === c.id && !vis[i]) {
    vis[i] = 1; if (!c.explored[i]) { c.explored[i] = 1; c.expCount++; }
  }
  c.vis = vis;
  return vis;
}

function checkPromotion(u, silent) {
  const need = l => [15, 45, 90, 150, 230, 330][Math.min(l, 5)] + Math.max(0, l - 5) * 120;
  while (u.xp >= need(u.lvl)) {
    u.lvl++;
    u.hp = Math.min(100, u.hp + 50);
    if (!silent && u.civ === G.player) log(`Your ${UNITS[u.type].name} was promoted to level ${u.lvl + 1}.`, u.civ, 'good');
  }
}

function upgradeTarget(u) {
  const U = UNITS[u.type];
  if (!U.upg) return null;
  const c = G.civs[u.civ];
  const nt = unitTypeFor(c, U.upg);
  if (!hasTech(c, UNITS[nt].tech)) return null;
  if (UNITS[nt].res && !strategicOwned(c)[UNITS[nt].res]) return null;
  return nt;
}
function upgradeCost(u, nt) {
  const c = G.civs[u.civ];
  let v = Math.max(15, (UNITS[nt].cost - UNITS[u.type].cost) * 1.5) * G.mul;
  if (hasPolicy(c, 'professionalArmy')) v *= 0.5;
  return Math.round(v);
}
function canUpgrade(u) {
  const nt = upgradeTarget(u);
  if (!nt || u.moves <= 0) return false;
  if (tileAt(u.x, u.y).owner !== u.civ) return false;
  return G.civs[u.civ].gold >= upgradeCost(u, nt);
}
function upgradeUnit(u) {
  if (!canUpgrade(u)) return false;
  const nt = upgradeTarget(u);
  G.civs[u.civ].gold -= upgradeCost(u, nt);
  u.type = nt; u.moves = 0; u.acted = true;
  return true;
}

// ---------------------------------------------------------------------------
// builders
// ---------------------------------------------------------------------------
function validImprovements(u) {
  const t = tileAt(u.x, u.y);
  const c = G.civs[u.civ];
  const out = [];
  if (t.owner !== c.id || t.cc != null || t.dist || t.mtn || TERRAIN[t.t].water) return out;
  if (t.res && canSeeRes(c, t.res) && RES[t.res].imp) {
    const imp = RES[t.res].imp;
    if (t.imp !== imp && hasTech(c, IMPROVEMENTS[imp].tech)) out.push(imp);
    return out;
  }
  if (!t.feat && ['grass', 'plains', 'tundra', 'desert'].includes(t.t) && t.t !== 'desert' && t.imp !== 'farm') out.push('farm');
  if (t.hills && !t.feat && t.imp !== 'mine' && hasTech(c, 'mining')) out.push('mine');
  return out;
}

function canHarvest(u) {
  const t = tileAt(u.x, u.y);
  const c = G.civs[u.civ];
  if (t.owner !== c.id || !t.feat) return false;
  if (t.feat === 'forest') return hasTech(c, 'mining');
  if (t.feat === 'jungle') return hasTech(c, 'bronze');
  return false;
}

function useCharge(u) {
  u.charges--; u.moves = 0; u.acted = true;
  if (u.charges <= 0) { removeUnit(u); return true; }
  return false;
}

function buildImprovement(u, imp) {
  if (!validImprovements(u).includes(imp)) return false;
  const t = tileAt(u.x, u.y);
  t.imp = imp;
  const ct = cityById(t.city);
  useCharge(u);
  if (ct) assignWorkers(ct);
  updateHappiness(G.civs[u.civ]);
  return true;
}

function harvest(u) {
  if (!canHarvest(u)) return false;
  const t = tileAt(u.x, u.y);
  const ct = cityById(t.city);
  const amt = Math.round((t.feat === 'forest' ? 30 : 20) * (1 + eraOf(G.civs[u.civ]) * 0.5) * G.mul);
  t.feat = null;
  if (ct) {
    if (ct.build) ct.progress[ct.build] = (ct.progress[ct.build] || 0) + amt; else ct.overflow += amt;
    log(`Harvest adds ${amt} production to ${ct.name}.`, u.civ, 'good');
    assignWorkers(ct);
  }
  useCharge(u);
  return true;
}

// ---------------------------------------------------------------------------
// combat
// ---------------------------------------------------------------------------
function unitStrength(u, mode, opp) {
  const U = UNITS[u.type];
  const c = G.civs[u.civ];
  const m = modsOf(c);
  let s = mode === 'ranged' ? U.rs : U.str;
  s += u.lvl * 4;
  if (!U.noDmgPenalty) s -= Math.floor((100 - u.hp) / 10);
  const cav = U.cls === 'lightcav' || U.cls === 'heavycav';
  if (mode === 'def') {
    const t = tileAt(u.x, u.y);
    if (t.hills) s += 3;
    if (t.feat) s += FEATURES[t.feat].def;
    if (u.fort >= 2) s += 6; else if (u.fort >= 1) s += 3;
  }
  const ou = opp && opp.type ? UNITS[opp.type] : null;
  if (ou && U.cls === 'anticav' && (ou.cls === 'lightcav' || ou.cls === 'heavycav')) s += 10;
  if (c.gov === 'oligarchy' && (U.cls === 'melee' || U.cls === 'anticav')) s += 4;
  if (c.gov === 'fascism') s += 5;
  if (hasPolicy(c, 'leveeEnMasse')) s += 3;
  if (cav && m.cavStr) s += m.cavStr;
  if (opp && G.civs[opp.civ].isBarb && hasPolicy(c, 'discipline')) s += 5;
  if (U.homeBonus && tileAt(u.x, u.y).owner === u.civ) s += U.homeBonus;
  if (!c.isBarb && c.happy <= -10) s -= 5;
  if (mode === 'melee' && opp && opp.type) {
    for (const [nx, ny] of neighbors(opp.x, opp.y)) {
      for (const o of UT[idx(nx, ny)]) if (o !== u && o.civ === u.civ && isMilitary(o)) s += 2;
    }
  }
  if (mode === 'ranged' && opp) {
    const isCity = !opp.type;
    if (isCity && U.cls !== 'siege') s -= 12;
    if (!isCity && U.cls === 'siege') s -= 10;
  }
  return Math.max(1, s);
}

function bestMeleeStr(c) {
  let best = 20;
  for (const id in UNITS) {
    const U = UNITS[id];
    if ((U.cls === 'melee' || U.cls === 'anticav') && !U.unique && hasTech(c, U.tech)) best = Math.max(best, U.str);
  }
  return best;
}

function cityMaxHP(city) {
  let h = 200;
  for (const b in city.buildings) h += BUILDINGS[b].hp || 0;
  return h;
}

function cityStrength(city) {
  const c = G.civs[city.civ];
  let s = Math.max(15, bestMeleeStr(c) - 6) + Math.floor(city.pop * 0.6);
  for (const b in city.buildings) s += BUILDINGS[b].def || 0;
  if (city.capital) s += 3;
  if (hasPolicy(c, 'bastions')) s += 6;
  if (civCities(c).some(x => x.wonders.includes('greatWall'))) s += 4;
  const g = UT[idx(city.x, city.y)].find(u => isMilitary(u) && u.civ === city.civ);
  if (g) s += Math.floor(UNITS[g.type].str * 0.2);
  s -= Math.floor((cityMaxHP(city) - city.hp) / 40);
  return Math.max(8, s);
}

const dmgFormula = (a, d) => 30 * Math.exp((a - d) / 25);
const roll = v => Math.round(v * (0.8 + Math.random() * 0.4));

function unitAttackTargets(u) {
  // returns list of {x,y,kind:'unit'|'city', target}
  const out = [];
  const U = UNITS[u.type];
  if (U.cls === 'civ' || u.moves <= 0 || u.attacked) return out;
  const r = U.rs ? U.range : 1;
  for (const [x, y] of tilesInRadius(u.x, u.y, r)) {
    if (x === u.x && y === u.y) continue;
    const ct = cityAt(x, y);
    if (ct && ct.civ !== u.civ && isAtWar(u.civ, ct.civ)) { out.push({ x, y, kind: 'city', target: ct }); continue; }
    const en = UT[idx(x, y)].filter(o => o.civ !== u.civ && isAtWar(u.civ, o.civ));
    if (!en.length) continue;
    const mil = en.find(isMilitary);
    if (mil) out.push({ x, y, kind: 'unit', target: mil });
  }
  // melee only attacks adjacent tiles it could move into
  if (!U.rs) return out.filter(o => hexDist(u.x, u.y, o.x, o.y) === 1 && moveCost(u, tileAt(o.x, o.y)) !== Infinity);
  return out;
}

// Preview expected damage without randomness.
function combatPreview(u, tgt) {
  const U = UNITS[u.type];
  const ranged = !!U.rs;
  if (tgt.kind === 'city') {
    const ct = tgt.target;
    const a = unitStrength(u, ranged ? 'ranged' : 'melee', ct), d = cityStrength(ct);
    return { a, d, toDef: Math.min(ct.hp, Math.round(dmgFormula(a, d))), toAtt: ranged ? 0 : Math.min(u.hp, Math.round(dmgFormula(d, a))), defHP: ct.hp, attHP: u.hp };
  }
  const o = tgt.target;
  const a = unitStrength(u, ranged ? 'ranged' : 'melee', o);
  const d = unitStrength(o, 'def', u);
  return { a, d, toDef: Math.min(o.hp, Math.round(dmgFormula(a, d))), toAtt: ranged ? 0 : Math.min(u.hp, Math.round(dmgFormula(d, a))), defHP: o.hp, attHP: u.hp };
}

function unitKilled(victim, killerCiv) {
  const k = G.civs[killerCiv];
  if (!k.isBarb) {
    k.kills++;
    if (G.civs[victim.civ].isBarb) k.barbKills++;
    if (k.pantheon === 'godWar') k.faith += UNITS[victim.type].str;
  }
  // civilians stacked on the tile get captured / destroyed
  for (const o of UT[idx(victim.x, victim.y)].slice()) if (o !== victim && isCivilian(o)) removeUnit(o);
  removeUnit(victim);
}

function attack(u, tgt) {
  const U = UNITS[u.type];
  const ranged = !!U.rs;
  const ac = G.civs[u.civ];
  u.acted = true; u.attacked = true; u.fortify = false; u.fort = 0; u.sleep = false; u.path = null;
  const res = { killed: false, died: false, captured: false };
  if (tgt.kind === 'city') {
    const ct = tgt.target;
    const a = unitStrength(u, ranged ? 'ranged' : 'melee', ct), d = cityStrength(ct);
    const toCity = roll(dmgFormula(a, d));
    ct.hp -= toCity; ct.lastHit = G.turn;
    if (!ranged) {
      u.hp -= roll(dmgFormula(d, a));
      u.xp += 5;
    } else u.xp += 3;
    if (ranged || ac.isBarb) ct.hp = Math.max(1, ct.hp);
    res.toDef = toCity;
    if (u.hp <= 0) { res.died = true; unitKilled(u, ct.civ); }
    else if (!ranged && ct.hp <= 0) { captureCity(ct, u); res.captured = true; }
    else if (!ranged && ac.isBarb && ct.hp <= 1) {
      const vic = G.civs[ct.civ]; const loot = Math.min(vic.gold, 30); vic.gold -= loot;
      log(`Barbarians sacked ${ct.name} and stole ${loot} gold.`, ct.civ, 'bad');
    }
    if (!res.died) { u.moves = 0; checkPromotion(u); }
    return res;
  }
  const o = tgt.target;
  const a = unitStrength(u, ranged ? 'ranged' : 'melee', o);
  const d = unitStrength(o, 'def', u);
  const toDef = roll(dmgFormula(a, d));
  o.hp -= toDef; res.toDef = toDef;
  if (!ranged) { const toAtt = roll(dmgFormula(d, a)); u.hp -= toAtt; res.toAtt = toAtt; }
  u.xp += ranged ? 3 : 5; o.xp += 3;
  if (o.hp <= 0) {
    res.killed = true;
    const ox = o.x, oy = o.y;
    unitKilled(o, u.civ);
    if (!ranged && u.hp > 0 && tileStatus(u, ox, oy) !== 'blocked' && tileStatus(u, ox, oy) !== 'enemy') { placeUnit(u, ox, oy); revealAround(u); const t = tileAt(ox, oy); if (t.camp && !ac.isBarb) removeCamp(ox, oy); }
  } else checkPromotion(o);
  if (u.hp <= 0) { res.died = true; unitKilled(u, o.civ); }
  else { u.moves = 0; checkPromotion(u); }
  if (G.civs[o.civ].isPlayer && !res.killed) log(`Your ${UNITS[o.type].name} was attacked by ${ac.adj} ${UNITS[u.type].name} (-${toDef} HP).`, o.civ, 'bad');
  if (G.civs[o.civ].isPlayer && res.killed) log(`Your ${UNITS[o.type].name} was destroyed by ${ac.adj} ${UNITS[u.type].name}.`, o.civ, 'bad');
  return res;
}

function cityTargets(city) {
  const out = [];
  if (city.fired) return out;
  for (const [x, y] of tilesInRadius(city.x, city.y, 2)) {
    const en = UT[idx(x, y)].find(o => o.civ !== city.civ && isMilitary(o) && isAtWar(city.civ, o.civ));
    if (en) out.push({ x, y, kind: 'unit', target: en });
  }
  return out;
}

function cityAttack(city, o) {
  const a = cityStrength(city), d = unitStrength(o, 'def', null);
  const dmg = roll(dmgFormula(a, d));
  o.hp -= dmg; city.fired = true;
  if (o.hp <= 0) unitKilled(o, city.civ);
  else if (G.civs[o.civ].isPlayer) log(`${city.name} bombarded your ${UNITS[o.type].name} (-${dmg} HP).`, o.civ, 'bad');
  return dmg;
}

function captureCity(ct, u) {
  const oldC = G.civs[ct.civ], newC = G.civs[u.civ];
  for (const o of UT[idx(ct.x, ct.y)].slice()) removeUnit(o);
  ct.civ = newC.id;
  const wasCap = ct.capital;
  ct.capital = false;
  ct.pop = Math.max(1, ct.pop - 1);
  ct.hp = Math.round(cityMaxHP(ct) * 0.25);
  ct.build = null; ct.progress = {}; ct.overflow = 0;
  for (const t of G.tiles) if (t.city === ct.id) t.owner = newC.id;
  placeUnit(u, ct.x, ct.y);
  u.moves = 0;
  log(`${newC.name} captured ${ct.name} from ${oldC.name}!`, -2, newC.isPlayer ? 'good' : oldC.isPlayer ? 'bad' : 'info');
  if (modsOf(newC).captureBonus) {
    const amt = Math.round((40 + 30 * eraOf(newC)) * G.mul);
    if (newC.researching) newC.techProg[newC.researching] = (newC.techProg[newC.researching] || 0) + amt; else newC.sciBank += amt;
    if (newC.civicing) newC.civicProg[newC.civicing] = (newC.civicProg[newC.civicing] || 0) + amt; else newC.cultBank += amt;
    log(`Conqueror of Samarkand: +${amt} Science and Culture.`, newC.id, 'good');
  }
  if (civCities(oldC).length === 0) eliminate(oldC, newC);
  else if (wasCap) {
    const nc = civCities(oldC).sort((a, b) => b.pop - a.pop)[0];
    nc.capital = true;
    log(`${oldC.name} moved its capital to ${nc.name}.`, oldC.id);
  }
  assignWorkers(ct);
  updateHappiness(newC); updateHappiness(oldC);
  checkVictory();
}

function eliminate(c, by) {
  c.alive = false;
  for (const u of civUnits(c)) removeUnit(u);
  for (const o of G.civs) { delete o.war[c.id]; }
  log(`${c.name} has been eliminated${by ? ' by ' + by.name : ''}.`, -2, c.isPlayer ? 'bad' : 'info');
  if (c.isPlayer) { G.over = true; G.winner = { civ: by ? by.id : -1, type: 'Defeat' }; }
}

// ---------------------------------------------------------------------------
// diplomacy
// ---------------------------------------------------------------------------
function meet(a, b) {
  if (a.id === b.id || a.isBarb || b.isBarb || a.met[b.id]) return;
  a.met[b.id] = true; b.met[a.id] = true;
  if (a.isPlayer) log(`You met ${b.leader} of ${b.name}.`, a.id, 'info');
  if (b.isPlayer) log(`You met ${a.leader} of ${a.name}.`, b.id, 'info');
}

function checkMeetings() {
  const alive = G.civs.filter(c => c.alive && !c.isBarb);
  const pts = alive.map(c => {
    const p = [];
    for (const u of G.units) if (u.civ === c.id) p.push([u.x, u.y]);
    for (const ct of G.cities) if (ct.civ === c.id) p.push([ct.x, ct.y]);
    return p;
  });
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    if (alive[i].met[alive[j].id]) continue;
    let hit = false;
    for (const a of pts[i]) { for (const b of pts[j]) if (hexDist(a[0], a[1], b[0], b[1]) <= 3) { hit = true; break; } if (hit) break; }
    if (hit) meet(alive[i], alive[j]);
  }
}

function declareWar(a, b) {
  if (a.war[b.id]) return;
  a.war[b.id] = true; b.war[a.id] = true;
  a.warTurns[b.id] = 0; b.warTurns[a.id] = 0;
  meet(a, b);
  log(`${a.name} declared war on ${b.name}!`, -2, b.isPlayer ? 'bad' : 'info');
}

function makePeace(a, b) {
  delete a.war[b.id]; delete b.war[a.id];
  a.peaceTurn = a.peaceTurn || {}; b.peaceTurn = b.peaceTurn || {};
  a.peaceTurn[b.id] = G.turn; b.peaceTurn[a.id] = G.turn;
  delete a.peaceOffer[b.id]; delete b.peaceOffer[a.id];
  log(`${a.name} and ${b.name} made peace.`, -2, 'info');
  // push units out of the other side's cities' tiles is unnecessary: cities are never shared.
}

function militaryPower(c) {
  let p = 0;
  for (const u of G.units) if (u.civ === c.id && isMilitary(u)) p += (UNITS[u.type].rs || UNITS[u.type].str) * (u.hp / 100) * (1 + u.lvl * 0.1);
  return p;
}

// ---------------------------------------------------------------------------
// barbarians
// ---------------------------------------------------------------------------
function spawnCamp(initial) {
  const cands = [];
  for (let i = 0; i < G.tiles.length; i++) {
    const t = G.tiles[i];
    if (!passableLand(t) || t.owner >= 0 || t.camp || t.t === 'snow') continue;
    const [x, y] = xyOf(i);
    if (G.cities.some(ct => hexDist(ct.x, ct.y, x, y) < 5)) continue;
    if (G.units.some(u => !G.civs[u.civ].isBarb && hexDist(u.x, u.y, x, y) < (initial ? 6 : 3))) continue;
    if (G.camps.some(cp => hexDist(cp.x, cp.y, x, y) < 6)) continue;
    const pc = player();
    if (!initial && pc.vis && pc.vis[i]) continue;
    cands.push([x, y]);
  }
  if (!cands.length) return;
  const [x, y] = pick(cands);
  tileAt(x, y).camp = true;
  G.camps.push({ x, y, timer: 4 + Math.floor(Math.random() * 4) });
  if (!initial) createUnit(G.barb, barbUnitType(), x, y);
}

function removeCamp(x, y) {
  tileAt(x, y).camp = false;
  G.camps = G.camps.filter(c => c.x !== x || c.y !== y);
}

function barbUnitType() {
  let era = 0;
  for (const c of G.civs) if (!c.isBarb && c.alive) era = Math.max(era, eraOf(c));
  const r = Math.random();
  const opts = [
    ['warrior', 'slinger', 'warrior'],
    ['spearman', 'archer', 'horseman'],
    ['swordsman', 'archer', 'horseman'],
    ['pikeman', 'crossbow', 'knight'],
    ['musketman', 'crossbow', 'knight'],
    ['musketman', 'fieldcannon', 'cavalry'],
    ['infantry', 'machinegun', 'cavalry'],
    ['infantry', 'machinegun', 'tank'],
  ][Math.min(era, 7)];
  return opts[r < 0.5 ? 0 : r < 0.8 ? 1 : 2];
}

// ---------------------------------------------------------------------------
// turn processing
// ---------------------------------------------------------------------------
function unitUpkeep(c) {
  const mil = G.units.filter(u => u.civ === c.id && isMilitary(u)).length;
  const free = 2 + civCities(c).length + (hasPolicy(c, 'conscription') ? 4 : 0);
  return Math.max(0, mil - free);
}
function districtUpkeep(c) {
  let n = 0;
  for (const ct of civCities(c)) for (const d in ct.districts) if (ct.districts[d].built) n++;
  return n;
}

function civYields(c) {
  const tot = zeroY();
  for (const ct of civCities(c)) addY(tot, cityYields(ct));
  tot.gNet = tot.g - unitUpkeep(c) - districtUpkeep(c);
  return tot;
}

function gaNeeded(c) { return Math.round((300 + 150 * c.gaCount) * G.mul); }

function processCity(city, y) {
  const c = G.civs[city.civ];
  // growth
  city.food += y.net;
  if (city.food < 0) {
    if (city.pop > 1) { city.pop--; log(`${city.name} is starving and lost a citizen.`, c.id, 'bad'); }
    city.food = 0;
  }
  const need = growthThreshold(city.pop);
  if (city.food >= need) {
    city.food -= need;
    city.pop++;
    if (c.isPlayer) log(`${city.name} has grown to size ${city.pop}.`, c.id);
  }
  // production
  if (city.build) {
    if (!canBuildKey(city, city.build)) {
      city.overflow += city.progress[city.build] || 0;
      delete city.progress[city.build];
      if (c.isPlayer) log(`${city.name} can no longer build that item.`, c.id, 'bad');
      city.build = null;
    }
  }
  if (city.build) {
    const key = city.build;
    city.progress[key] = (city.progress[key] || 0) + y.p * prodMultiplier(city, key);
    const cost = itemCost(city, key);
    if (city.progress[key] >= cost) {
      const over = city.progress[key] - cost;
      if (completeItem(city, key)) {
        delete city.progress[key];
        city.overflow = Math.min(over, cost);
        city.build = null;
        const k = key.split(':')[0];
        if (k === 'u' && c.isPlayer && city.repeat) setBuild(city, key);
      } else city.progress[key] = cost;
    }
  } else city.overflow = Math.min(city.overflow + y.p * 0.5, 200);
  // borders
  city.cult += y.c * (c.pantheon === 'religiousSettlements' ? 1.15 : 1);
  if (city.cult >= cultureNeeded(city)) { city.cult -= cultureNeeded(city); growBorders(city); }
  // healing
  const mx = cityMaxHP(city);
  if (city.lastHit !== G.turn) city.hp = Math.min(mx, city.hp + 20);
  city.hp = Math.min(city.hp, mx);
  city.fired = false;
  assignWorkers(city);
}

function processCiv(c) {
  if (!c.alive || c.isBarb) return;
  updateHappiness(c);
  const tot = zeroY();
  for (const ct of civCities(c)) {
    const y = cityYields(ct);
    addY(tot, y);
    processCity(ct, y);
  }
  c.lastYields = tot;
  // gold
  const net = tot.g - unitUpkeep(c) - districtUpkeep(c);
  c.gold += net;
  c.lastGoldNet = net;
  if (c.gold < 0) {
    const mil = civUnits(c).filter(isMilitary).sort((a, b) => UNITS[a.type].cost - UNITS[b.type].cost);
    if (mil.length) { log(`Bankrupt! A ${UNITS[mil[0].type].name} was disbanded.`, c.id, 'bad'); removeUnit(mil[0]); }
    c.gold = 0;
  }
  // faith
  c.faith += tot.fa;
  // science
  if (c.researching) {
    c.techProg[c.researching] = (c.techProg[c.researching] || 0) + tot.s;
    if (c.techProg[c.researching] >= techCost(c.researching)) completeTech(c, c.researching);
  } else c.sciBank += tot.s;
  // culture
  if (c.civicing) {
    c.civicProg[c.civicing] = (c.civicProg[c.civicing] || 0) + tot.c;
    if (c.civicProg[c.civicing] >= civicCost(c.civicing)) completeCivic(c, c.civicing);
  } else c.cultBank += tot.c;
  // golden age
  if (c.ga > 0) {
    c.ga--;
    if (c.ga === 0) log('The Golden Age has ended.', c.id);
  } else if (c.happy > 0) {
    c.gaPts += c.happy * (hasPolicy(c, 'goldenAgeFest') ? 1.5 : 1);
    if (c.gaPts >= gaNeeded(c)) {
      c.gaPts = 0; c.gaCount++; c.ga = Math.round(10 * Math.max(0.7, G.mul));
      log(`${c.name} enters a Golden Age! +20% Production and Gold.`, c.isPlayer ? c.id : -1, 'good');
    }
  }
  for (const k in c.war) c.warTurns[k] = (c.warTurns[k] || 0) + 1;
  checkBoosts(c);
  updateHappiness(c);
}

function resetUnits() {
  for (const u of G.units) {
    if (!u.acted) {
      const t = tileAt(u.x, u.y);
      const ct = cityAtTile(t);
      const heal = ct && ct.civ === u.civ ? 20 : t.owner === u.civ ? 15 : 10;
      u.hp = Math.min(100, u.hp + heal);
    }
    if (u.fortify) u.fort = Math.min(2, u.fort + 1);
    u.moves = maxMoves(u);
    u.acted = false; u.attacked = false; u.skip = false;
  }
}

function barbCampTick() {
  for (const cp of G.camps) {
    cp.timer--;
    if (cp.timer <= 0) {
      cp.timer = 6 + Math.floor(Math.random() * 5);
      const near = G.units.filter(u => u.civ === G.barb && hexDist(u.x, u.y, cp.x, cp.y) <= 4).length;
      if (near < 3) {
        const spots = [[cp.x, cp.y]].concat(neighbors(cp.x, cp.y)).filter(([x, y]) => passableLand(tileAt(x, y)) && !UT[idx(x, y)].length && !cityAt(x, y));
        if (spots.length) createUnit(G.barb, barbUnitType(), spots[0][0], spots[0][1]);
      }
    }
  }
  const interval = Math.round(12 * G.mul);
  if (G.turn % interval === 0 && G.camps.length < G.civs.length + 3) spawnCamp(false);
}

function score(c) {
  if (!c.alive) return 0;
  const cities = civCities(c);
  return cities.reduce((s, ct) => s + ct.pop * 3 + 10 + Object.keys(ct.districts).length * 2, 0)
    + Object.keys(c.techs).length * 4 + Object.keys(c.civics).length * 3 + c.wondersBuilt * 20
    + Object.keys(c.projects).length * 50 + (c.religion ? 20 : 0);
}

function checkVictory() {
  if (G.winner) return;
  const alive = G.civs.filter(c => c.alive && !c.isBarb);
  for (const c of alive) {
    if (c.projects.mars) { G.winner = { civ: c.id, type: 'Science' }; break; }
  }
  if (!G.winner) {
    const caps = G.cities.filter(ct => ct.origCap >= 0);
    const orig = G.civs.filter(c => !c.isBarb && c.foundedAny).length;
    if (orig > 1 && caps.length >= orig) {
      const owners = new Set(caps.map(ct => ct.civ));
      if (owners.size === 1) G.winner = { civ: caps[0].civ, type: 'Domination' };
    }
    if (!G.winner && alive.length === 1 && G.turn > 5) G.winner = { civ: alive[0].id, type: 'Domination' };
  }
  if (!G.winner && G.turn > G.maxTurns) {
    const best = alive.slice().sort((a, b) => score(b) - score(a))[0];
    G.winner = { civ: best.id, type: 'Score' };
  }
  if (G.winner) {
    G.over = true;
    const w = G.civs[G.winner.civ];
    if (G.winner.type !== 'Defeat') log(`${w ? w.name : 'Nobody'} wins a ${G.winner.type} Victory!`, -2, w && w.isPlayer ? 'good' : 'bad');
  }
}

// Runs everything between the player pressing End Turn and their next turn.
function endTurn() {
  if (G.over) return;
  for (const c of G.civs) {
    if (!c.alive || c.isPlayer) continue;
    if (c.isBarb) barbTurn(c); else aiTurn(c);
  }
  for (const c of G.civs) processCiv(c);
  // eliminate civs that never founded a city and lost all settlers
  for (const c of G.civs) {
    if (!c.alive || c.isBarb) continue;
    if (!civCities(c).length && !civUnits(c).some(u => u.type === 'settler')) eliminate(c, null);
  }
  barbCampTick();
  G.turn++;
  resetUnits();
  checkMeetings();
  for (const c of G.civs) if (c.alive && !c.isBarb) updateVisibility(c);
  checkVictory();
  // continue player go-to orders
  for (const u of G.units.slice()) if (u.civ === G.player && u.path && !u.dead) moveAlongPath(u);
  for (const u of G.units) if (u.civ === G.player && u.sleep && enemyNear(u, 3)) u.sleep = false;
  updateVisibility(player());
}

function enemyNear(u, r) {
  for (const [x, y] of tilesInRadius(u.x, u.y, r)) for (const o of UT[idx(x, y)]) if (o.civ !== u.civ && isMilitary(o) && isAtWar(u.civ, o.civ)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// save / load
// ---------------------------------------------------------------------------
function serialize() {
  return JSON.stringify(G, (k, v) => (k === 'vis' || k === 'dead' ? undefined : v));
}
function deserialize(s) {
  G = JSON.parse(s);
  rebuildIndex();
  for (const c of G.civs) if (c.alive && !c.isBarb) updateVisibility(c);
  return G;
}
