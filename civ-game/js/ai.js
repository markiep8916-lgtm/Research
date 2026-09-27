'use strict';
// ---------------------------------------------------------------------------
// AI for rival civilizations and barbarians.
// ---------------------------------------------------------------------------

function aiTurn(c) {
  const st = c.aiState;
  if (!st.targetCities) st.targetCities = 5 + Math.floor(Math.random() * 4) + (G.W > 60 ? 2 : 0);
  if (!st.garrison) st.garrison = {};
  if (!c.researching) aiPickTech(c);
  if (!c.civicing) aiPickCivic(c);
  aiGovernment(c);
  aiReligion(c);
  aiDiplomacy(c);
  for (const ct of civCities(c)) if (!ct.build) aiChooseBuild(ct);
  aiSpend(c);
  const units = civUnits(c).slice();
  for (const u of units) { if (!u.dead) { try { aiUnit(c, u); } catch (e) { u.path = null; if (typeof console !== "undefined") console.error(e); } } }
  for (const ct of civCities(c)) {
    const tg = cityTargets(ct);
    if (tg.length) cityAttack(ct, tg.sort((a, b) => a.target.hp - b.target.hp)[0].target);
  }
}

function aiPickTech(c) {
  const av = availableTechs(c);
  if (!av.length) return;
  const atWar = Object.keys(c.war).length > 0;
  const milTech = t => Object.values(UNITS).some(U => U.tech === t && U.cls !== 'civ' && !U.unique);
  let best = null, bs = Infinity;
  for (const t of av) {
    let v = techCost(t) - (c.techProg[t] || 0);
    if (atWar && milTech(t)) v *= 0.6;
    if (['writing', 'currency', 'education', 'rocketry', 'satellites', 'spaceExploration', 'computers'].includes(t)) v *= 0.7;
    v *= 0.85 + Math.random() * 0.3;
    if (v < bs) { bs = v; best = t; }
  }
  setResearch(c, best);
}

function aiPickCivic(c) {
  const av = availableCivics(c);
  if (!av.length) return;
  let best = null, bs = Infinity;
  for (const t of av) {
    let v = civicCost(t) - (c.civicProg[t] || 0);
    if (Object.values(GOVERNMENTS).some(g => g.civic === t)) v *= 0.7;
    v *= 0.85 + Math.random() * 0.3;
    if (v < bs) { bs = v; best = t; }
  }
  setCivic(c, best);
}

const AI_POLICY_PREF = ['urbanPlanning', 'godKing', 'colonization', 'naturalPhilosophy', 'caravansaries', 'rationalism', 'freeMarket',
  'publicWorks', 'townCharters', 'craftsmen', 'meritocracy', 'urbanHousing', 'ilkum', 'serfdom', 'scripture', 'landSurveyors',
  'agoge', 'leveeEnMasse', 'conscription', 'bastions', 'discipline', 'maneuver', 'professionalArmy', 'limes',
  'charismatic', 'raj', 'embassies', 'inspiration', 'revelation', 'goldenAgeFest'];

function aiGovernment(c) {
  let best = c.gov, bt = c.gov ? GOVERNMENTS[c.gov].tier : -1;
  for (const g in GOVERNMENTS) {
    const G2 = GOVERNMENTS[g];
    if (!hasCivic(c, G2.civic)) continue;
    const pref = (c.key && CIVS[c.key].aggr > 0.6) ? ['oligarchy', 'monarchy', 'fascism'] : ['republic', 'merchantRepublic', 'democracy', 'autocracy', 'theocracy', 'communism'];
    const score = G2.tier + (pref.includes(g) ? 0.5 : 0);
    if (score > bt + (best && pref.includes(best) ? 0.5 : 0)) { bt = score; best = g; }
  }
  if (best && best !== c.gov) setGovernment(c, best);
  if (!c.gov) return;
  // refill policies every few turns
  if (G.turn % 5 !== c.id % 5 && c.slots.flat().length) return;
  const counts = slotCounts(c);
  const atWar = Object.keys(c.war).length > 0;
  let pref = AI_POLICY_PREF.filter(p => policyUnlocked(c, p));
  if (atWar) pref = pref.filter(p => POLICIES[p].slot === 0).concat(pref.filter(p => POLICIES[p].slot !== 0));
  c.slots = [[], [], [], []];
  const used = new Set();
  for (let k = 0; k < 3; k++) {
    for (const p of pref) { if (c.slots[k].length >= counts[k]) break; if (POLICIES[p].slot === k && !used.has(p)) { c.slots[k].push(p); used.add(p); } }
  }
  for (const p of pref) { if (c.slots[3].length >= counts[3]) break; if (!used.has(p)) { c.slots[3].push(p); used.add(p); } }
}

function aiReligion(c) {
  if (canFoundPantheon(c)) {
    const taken = takenPantheons();
    const free = Object.keys(PANTHEONS).filter(p => !taken.has(p));
    if (free.length) foundPantheon(c, pick(free));
  }
  if (canFoundReligion(c)) {
    const tb = takenBeliefs();
    const used = new Set(G.religions.map(r => r.name));
    const fnd = Object.keys(FOUNDER_BELIEFS).filter(b => !tb.has(b));
    const fol = Object.keys(FOLLOWER_BELIEFS).filter(b => !tb.has(b));
    const pref = { tibet: 'Bön', majapahit: 'Kejawen', zimbabwe: 'Mwari', mongolia: 'Tengrism', greece: 'Hellenism', japan: 'Shinto', china: 'Taoism' }[c.key];
    const name = pref && !used.has(pref) ? pref : RELIGION_NAMES.find(n => !used.has(n));
    if (fnd.length && fol.length && name) foundReligion(c, name, pick(fnd), pick(fol));
  }
}

function capitalDist(a, b) {
  const ca = capitalOf(a), cb = capitalOf(b);
  if (!ca || !cb) return 99;
  return hexDist(ca.x, ca.y, cb.x, cb.y);
}

function aiDiplomacy(c) {
  const aggr = CIVS[c.key].aggr;
  const myP = militaryPower(c) + 1;
  const wars = Object.keys(c.war).map(Number).filter(k => G.civs[k].alive);
  for (const k of wars) {
    const o = G.civs[k];
    const theirP = militaryPower(o) + 1;
    if ((c.warTurns[k] || 0) < 10) continue;
    const want = myP < theirP * 0.8 || Math.random() < 0.04 + (1 - aggr) * 0.03;
    if (!want) continue;
    if (o.isPlayer) { if (!c.peaceOffer[o.id]) { c.peaceOffer[o.id] = G.turn; log(`${c.leader} of ${c.name} proposes peace. Open Diplomacy to answer.`, o.id, 'info'); } }
    else makePeace(c, o);
  }
  if (wars.length || G.turn < Math.round(35 * G.mul)) return;
  for (const k in c.met) {
    const o = G.civs[k];
    if (!o.alive || c.war[k]) continue;
    if (c.peaceTurn && c.peaceTurn[k] && G.turn - c.peaceTurn[k] < 20) continue;
    const theirP = militaryPower(o) + 1;
    const near = capitalDist(c, o) < Math.max(18, G.W * 0.4);
    const bias = o.isPlayer ? 1.0 : 0.8;
    if (near && myP > theirP * 1.4 && Math.random() < aggr * 0.025 * bias) { declareWar(c, o); break; }
  }
}

function aiAcceptsPeace(c, o) {
  if ((c.warTurns[o.id] || 0) < 6) return false;
  const myP = militaryPower(c) + 1, theirP = militaryPower(o) + 1;
  return myP < theirP * 1.15 || Math.random() < 0.15;
}

function bestMilitaryItem(items, c, prefer) {
  const mil = items.filter(i => i.key.startsWith('u:') && UNITS[i.key.slice(2)].cls !== 'civ' && UNITS[i.key.slice(2)].cls !== 'recon');
  if (!mil.length) return null;
  const counts = {};
  for (const u of civUnits(c)) counts[UNITS[u.type].cls] = (counts[UNITS[u.type].cls] || 0) + 1;
  let best = null, bs = -1;
  for (const it of mil) {
    const U = UNITS[it.key.slice(2)];
    let s = (U.rs || U.str) / Math.sqrt(it.cost);
    if (prefer && prefer.includes(U.cls)) s *= 1.4;
    s /= 1 + (counts[U.cls] || 0) * 0.25;
    s *= 0.9 + Math.random() * 0.2;
    if (s > bs) { bs = s; best = it; }
  }
  return best;
}

function aiChooseBuild(ct) {
  const c = G.civs[ct.civ];
  const st = c.aiState;
  const items = availableItems(ct);
  const has = k => items.find(i => i.key === k);
  const cities = civCities(c).length;
  const units = civUnits(c);
  const mil = units.filter(isMilitary).length;
  const atWar = Object.keys(c.war).some(k => G.civs[k].alive);
  const building = k => G.cities.filter(x => x.civ === c.id && x.build === k).length;
  const settlers = units.filter(u => u.type === 'settler').length + building('u:settler');
  const builders = units.filter(u => u.type === 'builder').length + building('u:builder');
  const choose = it => { if (it) { setBuild(ct, it.key); return true; } return false; };

  const minMil = atWar ? cities * 2 + 2 : Math.max(2, Math.ceil(cities * 1.2));
  if (mil < minMil && (atWar || mil < 2 || Math.random() < 0.6)) {
    if (choose(bestMilitaryItem(items, c, atWar ? ['siege', 'melee', 'heavycav'] : ['melee', 'ranged']))) return;
  }
  if (cities < st.targetCities && settlers < 1 + Math.floor(cities / 4) && ct.pop >= 2 && c.happy >= 0 && has('u:settler') && !atWar) {
    if (choose(has('u:settler'))) return;
  }
  if (builders < Math.ceil(cities * 0.7) && has('u:builder') && aiHasWork(c)) { if (choose(has('u:builder'))) return; }
  if (ct.pop <= 3 && has('b:monument') && Math.random() < 0.7) { if (choose(has('b:monument'))) return; }
  if (atWar && has('b:walls') ) { if (choose(has('b:' + buildingFor(c, 'walls')))) return; }
  if (c.happy < 2 && has('d:entertainment')) { if (choose(has('d:entertainment'))) return; }
  if (c.happy < 2 && has('b:arena')) { if (choose(has('b:arena'))) return; }
  if (c.happy < 0 && has('b:' + buildingFor(c, 'temple'))) { if (choose(has('b:' + buildingFor(c, 'temple')))) return; }
  if (ct.pop >= cityHousing(ct) - 1 && has('d:aqueduct')) { if (choose(has('d:aqueduct'))) return; }
  if (ct.pop >= cityHousing(ct) - 1 && has('b:' + buildingFor(c, 'granary'))) { if (choose(has('b:' + buildingFor(c, 'granary')))) return; }
  // projects first when possible
  const hasPort = G.cities.some(x => x.civ === c.id && x.districts.spaceport);
  for (const p of ['p:satellite', 'p:moon', 'p:mars', 'd:spaceport']) {
    if (p === 'd:spaceport' && (hasPort || ct !== civCities(c).sort((a, b) => b.pop - a.pop)[0])) continue;
    if (has(p)) { if (choose(has(p))) return; }
  }
  // buildings in existing districts, cheapest first
  const blds = items.filter(i => i.key.startsWith('b:') && !['walls', 'hillfort', 'dzong'].includes(i.key.slice(2))).sort((a, b) => a.cost - b.cost);
  if (blds.length && Math.random() < 0.65) { if (choose(blds[0])) return; }
  const dOrder = ['campus', 'commercial', 'holy', 'industrial', 'theater', 'harbor', 'encampment', 'entertainment'];
  if (CIVS[c.key].aggr > 0.7) dOrder.splice(2, 0, 'encampment');
  for (const d of dOrder) {
    if (d === 'holy' && (c.religion || G.religions.length >= maxReligions()) && Math.random() < 0.7) continue;
    if (has('d:' + d)) { if (choose(has('d:' + d))) return; }
  }
  const wonders = items.filter(i => i.key.startsWith('w:'));
  if (wonders.length && Math.random() < 0.5 && ct.pop >= 3) { if (choose(pick(wonders))) return; }
  if (blds.length) { if (choose(blds[0])) return; }
  if (choose(bestMilitaryItem(items, c))) return;
  if (has('u:builder')) choose(has('u:builder'));
}

function aiSpend(c) {
  // upgrade units
  for (const u of civUnits(c)) if (canUpgrade(u) && c.gold > 150) upgradeUnit(u);
  if (c.gold < 250) return;
  const cities = civCities(c);
  if (!cities.length) return;
  const atWar = Object.keys(c.war).some(k => G.civs[k].alive);
  for (const ct of shuffle(cities.slice())) {
    if (c.gold < 300) break;
    const gc = ct.build && goldCost(ct, ct.build);
    if (gc != null && gc < c.gold - 150 && (atWar || c.gold > 600 || ct.build.startsWith('b:'))) purchase(ct, ct.build, 'gold');
  }
  if (c.faith > 400) {
    for (const ct of cities) {
      const k = 'b:' + buildingFor(c, cityHas(ct, 'shrine') ? 'temple' : 'shrine');
      if (canBuildKey(ct, k) && faithCost(ct, k) < c.faith) { purchase(ct, k, 'faith'); break; }
    }
  }
  const ct = pick(cities);
  const cands = borderCandidates(ct);
  if (cands.length && c.gold > 350) {
    let best = null, bs = 0;
    for (const [x, y] of cands) { const v = tileValue(tileAt(x, y), c); if (v > bs) { bs = v; best = [x, y]; } }
    if (best && bs > 5) buyTile(ct, best[0], best[1]);
  }
}

// ---------------------------------------------------------------------------
// unit behaviour
// ---------------------------------------------------------------------------
function aiMoveToward(u, tx, ty, stop = 0) {
  const p = findPath(u, tx, ty, { maxNodes: 2500 });
  if (!p) return false;
  while (p.length && hexDist(p[p.length - 1][0], p[p.length - 1][1], tx, ty) < stop) p.pop();
  if (!p.length) return false;
  u.path = p;
  moveAlongPath(u);
  u.path = null;
  return true;
}

function aiHasWork(c) {
  for (const ct of civCities(c)) for (const [x, y] of cityTiles(ct)) if (validImprovements({ x, y, civ: c.id }).length) return true;
  return false;
}

function settleScore(c, x, y) {
  if (!canFoundCity(c, x, y)) return -1;
  let s = startScore(x, y);
  for (const [nx, ny] of tilesInRadius(x, y, 3)) {
    const t = tileAt(nx, ny);
    if (t.owner >= 0 && t.owner !== c.id) s -= 1.5;
    if (t.res && RES[t.res].type === 'luxury' && !luxuriesOwned(c)[t.res]) s += 1;
  }
  if (neighbors(x, y).some(([nx, ny]) => tileAt(nx, ny).t === 'coast')) s += 3;
  return s;
}

function aiSettler(c, u) {
  if (!civCities(c).length) {
    // first city: settle on the spot unless a much better tile is adjacent
    let best = [u.x, u.y], bs = settleScore(c, u.x, u.y);
    if (u.moves > 0 && (u.wait || 0) < 2) {
      for (const [x, y] of neighbors(u.x, u.y)) { const s = settleScore(c, x, y); if (s > bs + 4) { bs = s; best = [x, y]; } }
    }
    if (best[0] === u.x && best[1] === u.y && bs >= 0) { foundCity(c, u.x, u.y); removeUnit(u); return; }
    u.wait = (u.wait || 0) + 1;
    aiMoveToward(u, best[0], best[1]);
    if (u.x === best[0] && u.y === best[1] && canFoundCity(c, u.x, u.y)) { foundCity(c, u.x, u.y); removeUnit(u); }
    return;
  }
  if (!u.target || !canFoundCity(c, u.target[0], u.target[1]) || (u.tries || 0) > 12) {
    let best = null, bs = 0;
    for (const [x, y] of tilesInRadius(u.x, u.y, 9)) {
      const s = settleScore(c, x, y) - hexDist(u.x, u.y, x, y) * 1.2;
      if (s > bs) { bs = s; best = [x, y]; }
    }
    u.target = best; u.tries = 0;
    if (!best) { u.tries = 0; return; }
  }
  u.tries = (u.tries || 0) + 1;
  if (u.x === u.target[0] && u.y === u.target[1]) { foundCity(c, u.x, u.y); removeUnit(u); return; }
  if (!aiMoveToward(u, u.target[0], u.target[1])) u.target = null;
  if (!u.dead && u.target && u.x === u.target[0] && u.y === u.target[1] && u.moves > 0) { foundCity(c, u.x, u.y); removeUnit(u); }
}

function aiBuilder(c, u) {
  const here = validImprovements(u);
  if (here.length) { buildImprovement(u, here[0]); return; }
  let best = null, bs = -1e9;
  for (const ct of civCities(c)) {
    for (const [x, y] of cityTiles(ct)) {
      const opts = validImprovements({ x, y, civ: c.id });
      if (!opts.length) continue;
      if (UT[idx(x, y)].some(o => o !== u && isCivilian(o))) continue;
      const t = tileAt(x, y);
      const s = (t.res ? 6 : 0) + (ct.worked.includes(idx(x, y)) ? 3 : 0) - hexDist(u.x, u.y, x, y);
      if (s > bs) { bs = s; best = [x, y]; }
    }
  }
  if (!best) { if (u.charges > 0 && Math.random() < 0.05) removeUnit(u); return; }
  aiMoveToward(u, best[0], best[1]);
  if (!u.dead && u.x === best[0] && u.y === best[1] && u.moves > 0) {
    const o = validImprovements(u);
    if (o.length) buildImprovement(u, o[0]);
  }
}

function nearestUnexplored(c, u) {
  let best = null, bd = 1e9;
  for (const [x, y] of tilesInRadius(u.x, u.y, 12)) {
    if (c.explored[idx(x, y)]) continue;
    if (!passableLand(tileAt(x, y))) continue;
    const d = hexDist(u.x, u.y, x, y) + Math.random() * 2;
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}

function findEnemyTargets(c, u, radius) {
  const out = [];
  for (const [x, y] of tilesInRadius(u.x, u.y, radius)) {
    const ct = cityAt(x, y);
    if (ct && ct.civ !== c.id && isAtWar(c.id, ct.civ)) out.push({ x, y, kind: 'city', target: ct });
    for (const o of UT[idx(x, y)]) if (o.civ !== c.id && isAtWar(c.id, o.civ)) out.push({ x, y, kind: 'unit', target: o });
  }
  return out;
}

function aiTryAttack(u) {
  const tg = unitAttackTargets(u);
  if (!tg.length) return false;
  let best = null, bs = -1e9;
  const ranged = !!UNITS[u.type].rs;
  for (const t of tg) {
    const p = combatPreview(u, t);
    let s = p.toDef - p.toAtt * 1.1;
    if (t.kind === 'city') {
      if (!ranged && p.toDef >= t.target.hp && !G.civs[u.civ].isBarb) s += 200;
      else if (!ranged && p.toDef < t.target.hp) s -= 30;
    } else if (p.toDef >= t.target.hp) s += 40;
    if (!ranged && p.toAtt >= u.hp) s -= 200;
    if (s > bs) { bs = s; best = t; }
  }
  const thresh = ranged ? -999 : -5;
  if (best && bs > thresh) { attack(u, best); return true; }
  return false;
}

function aiUnit(c, u) {
  const U = UNITS[u.type];
  if (u.type === 'settler') return aiSettler(c, u);
  if (u.type === 'builder') return aiBuilder(c, u);
  const st = c.aiState;
  if (U.cls === 'recon') {
    if (aiTryAttack(u) && u.dead) return;
    const tgt = nearestUnexplored(c, u);
    if (tgt) aiMoveToward(u, tgt[0], tgt[1]);
    else { const ct = pick(civCities(c)); if (ct) aiMoveToward(u, ct.x, ct.y, 1); }
    return;
  }
  // garrison assignment
  let gCity = null;
  for (const cid in st.garrison) if (st.garrison[cid] === u.id) gCity = cityById(+cid);
  if (gCity && gCity.civ !== c.id) { delete st.garrison[gCity.id]; gCity = null; }
  if (!gCity) {
    for (const ct of civCities(c)) {
      const gid = st.garrison[ct.id];
      if (gid && G.units.some(x => x.id === gid && !x.dead)) continue;
      if (U.cls === 'siege') continue;
      st.garrison[ct.id] = u.id; gCity = ct; break;
    }
  }
  if (gCity) {
    if (u.x === gCity.x && u.y === gCity.y) {
      if (UNITS[u.type].rs) aiTryAttack(u);
      else {
        // only sally out if the enemy is badly hurt
        const tg = unitAttackTargets(u).filter(t => t.kind === 'unit' && combatPreview(u, t).toDef >= t.target.hp);
        if (tg.length) { attack(u, tg[0]); return; }
      }
      if (!u.dead && !u.attacked) { u.fortify = true; }
      return;
    }
    aiMoveToward(u, gCity.x, gCity.y);
    if (!u.dead && u.x === gCity.x && u.y === gCity.y) u.fortify = true;
    return;
  }
  // wounded: retreat
  if (u.hp < 40) {
    const home = civCities(c).sort((a, b) => hexDist(a.x, a.y, u.x, u.y) - hexDist(b.x, b.y, u.x, u.y))[0];
    if (home && hexDist(home.x, home.y, u.x, u.y) > 1) { aiMoveToward(u, home.x, home.y, 1); return; }
    u.fortify = true; return;
  }
  if (aiTryAttack(u)) { if (u.dead || u.moves <= 0) return; }
  const wars = Object.keys(c.war).map(Number).filter(k => G.civs[k].alive);
  if (wars.length) {
    // march on the nearest enemy city
    let tgt = null, bd = 1e9;
    for (const ct of G.cities) {
      if (!wars.includes(ct.civ)) continue;
      const d = hexDist(u.x, u.y, ct.x, ct.y);
      if (d < bd) { bd = d; tgt = ct; }
    }
    const near = findEnemyTargets(c, u, 4).filter(t => t.kind === 'unit' && isMilitary(t.target));
    if (near.length) {
      const t = near[0];
      aiMoveToward(u, t.x, t.y, U.rs ? U.range : 1);
      aiTryAttack(u);
      return;
    }
    if (tgt) {
      aiMoveToward(u, tgt.x, tgt.y, U.rs ? U.range : 1);
      aiTryAttack(u);
      return;
    }
  }
  // peace time: clear barbarians & camps near home
  const barb = findEnemyTargets(c, u, 7).filter(t => t.kind === 'unit');
  if (barb.length) { aiMoveToward(u, barb[0].x, barb[0].y, U.rs ? U.range : 1); aiTryAttack(u); return; }
  const camp = G.camps.filter(cp => civCities(c).some(ct => hexDist(ct.x, ct.y, cp.x, cp.y) <= 9))
    .sort((a, b) => hexDist(a.x, a.y, u.x, u.y) - hexDist(b.x, b.y, u.x, u.y))[0];
  if (camp && U.cls !== 'siege' && !U.rs) {
    const defended = UT[idx(camp.x, camp.y)].length > 0;
    if (!defended) { aiMoveToward(u, camp.x, camp.y); return; }
    aiMoveToward(u, camp.x, camp.y, 1); aiTryAttack(u); return;
  }
  // idle: drift near a random own city and fortify
  if (!u.post || !cityById(u.post) || cityById(u.post).civ !== c.id) { const ct = pick(civCities(c)); u.post = ct ? ct.id : null; }
  const post = cityById(u.post);
  if (post && hexDist(u.x, u.y, post.x, post.y) > 2) aiMoveToward(u, post.x, post.y, 2);
  else u.fortify = true;
}

// ---------------------------------------------------------------------------
// barbarians
// ---------------------------------------------------------------------------
function barbTurn(b) {
  for (const u of civUnits(b).slice()) {
    if (u.dead) continue;
    const U = UNITS[u.type];
    if (aiTryAttack(u) && (u.dead || u.moves <= 0)) continue;
    let best = null, bd = 8;
    for (const [x, y] of tilesInRadius(u.x, u.y, 7)) {
      const ct = cityAt(x, y);
      const hasTarget = ct || UT[idx(x, y)].some(o => o.civ !== b.id);
      if (!hasTarget) continue;
      const d = hexDist(u.x, u.y, x, y);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    if (best) { aiMoveToward(u, best[0], best[1], U.rs ? U.range : 1); if (!u.dead) aiTryAttack(u); continue; }
    // wander
    const nb = neighbors(u.x, u.y).filter(([x, y]) => tileStatus(u, x, y) === 'ok');
    if (nb.length) { const [x, y] = pick(nb); stepUnit(u, x, y); }
  }
}
