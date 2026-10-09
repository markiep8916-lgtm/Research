// Content lints (TECH_PLAN 10.3), node only. Validates every registered pure location of a registry
// (the default one after registerAllData(), or an isolated fixture registry from createRegistry()).
//
//   import { lintContent } from './contentlint.mjs';
//   const { errors, warnings } = lintContent(registry, { written, reads });
//     written: flags the script dry run saw scripts set; reads: conditions it saw scripts test
//     errors / warnings: [{ rule, loc, msg }]
//
// Rules (rule tag: what fails)
//   map       validateMap problems of every map, merged with its extends (walls, pairs, ids per map,
//             spawns on walls without `requires`, conditions in the map, ...)
//   extends   an `extends` entry for a map nobody registered
//   ref       exits, exit/lift interactables, destinations, jumps, CHAPTER_START, newJourney and
//             scenes' contact-sheet staging (`jump`, `at: 'map:spawn'`) pointing at unknown jumps,
//             maps or spawns (a { x, z } spawn must stand on a walkable cell)
//   cond      a condition that does not compile (destinations, shops, party talks, companions, map.talk)
//   script    a referenced script id that does not exist (talk, interactables, triggers, bosses,
//             scenes, party talks, companions, newJourney, destinations' before)
//   enemy     encounters naming unknown enemies (also phases/onDefeat transforms and summons), enemies
//             naming unknown boss scripts, maps naming unknown encounters or zones
//   zone      content zones listing unknown encounters or fewer than 4 formations
//   item      shops, chests, kits and locks listing unknown items
//   objective CHAPTER_START or jump objectives missing once that chapter has objectives at all
//             (outside dev)
//   softlock  a flag some condition reads that nothing writes (switch, shard and chest flags of
//             existing interactables, defeated: of boss encounters, CHAPTER_FLAGS, doneFlags, jump
//             flags, lock flags, tip flags, auto prefixes, cs.flag literals, dry-run flags)
//   bounded   a story trigger (once, or running a scene) or an extends trigger/npc/talk/interactable/
//             chest/prop whose `when` has no story: or chapter term (poc maps and dev are exempt)
//   inline    inline (legacy) lines on a map without poc: true, outside dev
//   staging   (warning) a `key: true` scenes entry with neither `jump` nor `at`: the contact sheet
//             would frame it on its chapter's start map instead of where it is staged
//   id        extends ids without the adding location's code, script ids without '<loc>.',
//             encounter and zone ids without the location prefix (2.7), map NPCs whose id is a
//             party member id (a world NPC wins actor lookups in scripts, so a hidden map NPC
//             'orion' would take Orion's place in cs.move / cs.face once he is in the party)

import { CHAPTER_IDS, CHAPTER_START, CHAPTER_FLAGS, chapterIndex } from '../src/content/chapters.js';
import { validateMap, cellSpec, isWalkableSpec, inlineLines, normalizeTalk } from '../src/world/mapdef.js';
import { compileCond, condFlags } from '../src/world/cond.js';

const PARTY = ['kade', 'nyx', 'orion', 'sera'];

// Location codes for ids added through extends (dm.coil_socket) and the 2.7 encounter/zone prefixes.
export const LOC_CODES = {
  common: ['common'], prologue: ['pro', 'prologue'], driftmarket: ['dm', 'driftmarket'],
  shoals: ['sh', 'shoals', 'meridian'], arboretum: ['arb', 'arboretum'], spire: ['sp', 'spire'],
  vault: ['va', 'vault'], heart: ['hr', 'heart'], dreams: ['dr', 'dream', 'dreams'],
  warden: ['wd', 'warden'], epilogue: ['ep', 'epi', 'epilogue'], dev: ['dev'],
};
export const ENC_PREFIX = {
  prologue: ['pro_'], driftmarket: ['dm_'], shoals: ['shoals_', 'meridian_'], arboretum: ['arb_'],
  spire: ['spire_'], vault: ['vault_'], heart: ['heart_'], warden: ['heart_'], dreams: ['dream_'],
  epilogue: ['epi_'], dev: ['dev_'], common: [],
};
// Script ids the plan binds outside the '<loc>.' rule.
const SCRIPT_EXCEPTIONS = { prologue: ['travel.flight'] };
const AUTO_PREFIXES = ['visited:', 'area:', 'talk:', 'seen:', 'ptalk:', 'dest:'];
const BOUNDED_KINDS = ['triggers', 'npcs', 'interactables', 'chests', 'props'];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entries = (o) => (isObj(o) ? Object.entries(o) : []);

/** True when a condition contains a story: flag or a chapter term. */
export function chapterBounded(src) {
  if (typeof src !== 'string' || !src) return false;
  if (/\bchapter\s*(>=|<)/.test(src)) return true;
  try {
    return condFlags(src).some((f) => f.startsWith('story:'));
  } catch {
    return false;
  }
}

/** Flags set by literal cs.flag('...') / .flag("...") calls in a script's source. */
export function flagLiterals(fn) {
  if (typeof fn !== 'function') return [];
  const out = [];
  for (const m of fn.toString().matchAll(/\bflag\(\s*(['"`])([A-Za-z0-9_:.-]+)\1/g)) out.push(m[2]);
  return out;
}

export function lintContent(reg, { written = [], reads = [] } = {}) {
  const { REG, getMap, ownerOf, tables } = reg;
  const errors = [];
  const warnings = [];
  const err = (rule, loc, msg) => errors.push({ rule, loc, msg });
  const warn = (rule, loc, msg) => warnings.push({ rule, loc, msg });
  const locOfMap = (id) => ownerOf('maps', id);
  const mapOf = (id) => (REG.maps[id] ? getMap(id) : null);
  const scriptExists = (id) => typeof REG.scripts[id] === 'function';

  const condReads = [];   // { src, loc, where }
  const writers = new Set([...written]);
  // silent: validateMap already reports this condition's syntax; only record what it reads
  const checkCond = (src, loc, where, silent = false) => {
    if (src === undefined || src === null || src === '' || typeof src === 'boolean') return;
    try {
      compileCond(src);
      condReads.push({ src, loc, where });
    } catch (e) {
      if (!silent) err('cond', loc, `${where}: ${e.message}`);
    }
  };
  const checkScript = (id, loc, where) => {
    if (id && !scriptExists(id)) err('script', loc, `${where} runs missing script "${id}"`);
  };
  const checkTalk = (spec, loc, where, silent = false) => {
    let list;
    try {
      list = normalizeTalk(spec) || [];
    } catch (e) {
      err('script', loc, `${where}: ${e.message}`);
      return;
    }
    for (const t of list) {
      checkCond(t.when, loc, `${where} talk when`, silent);
      if (t.script) checkScript(t.script, loc, where);
    }
  };
  const checkTarget = (map, spawn, loc, where) => {
    const m = mapOf(map);
    if (!m) { err('ref', loc, `${where} -> unknown map "${map}"`); return; }
    if (typeof spawn === 'string') {
      if (!m.spawns[spawn]) err('ref', loc, `${where} -> unknown spawn "${map}:${spawn}"`);
    } else if (isObj(spawn)) {
      if (!isWalkableSpec(cellSpec(m, Math.floor(spawn.x), Math.floor(spawn.z)))) err('ref', loc, `${where} -> position (${spawn.x}, ${spawn.z}) on "${map}" is not walkable`);
    } else err('ref', loc, `${where} -> no spawn given for "${map}"`);
  };
  const checkItem = (id, loc, where) => {
    if (id && !tables.items[id]) err('item', loc, `${where} lists unknown item "${id}"`);
  };

  // ---------------------------------------------------------------- maps
  for (const mapId of Object.keys(REG.maps)) {
    const loc = locOfMap(mapId);
    let map;
    try {
      map = getMap(mapId);
    } catch (e) {
      err('map', loc, `${mapId}: ${e.message}`);
      continue;
    }
    for (const p of validateMap(map)) if (p) err('map', loc, p);
    const devLike = loc === 'dev';
    if (!map.poc && !devLike) for (const id of inlineLines(map)) err('inline', loc, `${mapId}: ${id} holds inline lines (maps without poc: true use scripts)`);

    for (const n of map.npcs) {
      checkTalk(n.talk, loc, `${mapId} npc "${n.id}"`, true);
      if (PARTY.includes(n.id)) err('id', loc, `${mapId} npc "${n.id}" uses a party member id: give the map NPC its own id (e.g. "${n.id}_npc")`);
    }
    for (const it of map.interactables) {
      checkTalk(it.talk, loc, `${mapId} interactable "${it.id}"`, true);
      checkScript(it.script, loc, `${mapId} interactable "${it.id}"`);
      if (it.kind === 'exit' && it.to) checkTarget(it.to.map, it.to.spawn, loc, `${mapId} exit interactable "${it.id}"`);
      if (it.kind === 'switch' || it.kind === 'shard') { if (it.flag) writers.add(it.flag); }
      if (it.kind === 'shop' && it.shop && !REG.shops[it.shop]) err('item', loc, `${mapId} shop "${it.id}" names unknown shop "${it.shop}"`);
      if (it.leader && !PARTY.includes(it.leader)) err('ref', loc, `${mapId} interactable "${it.id}": unknown leader "${it.leader}"`);
    }
    for (const c of map.chests) {
      writers.add(`chest:${mapId}:${c.id}`);
      checkItem(c.item, loc, `${mapId} chest "${c.id}"`);
    }
    for (const b of map.bosses) {
      checkScript(b.script, loc, `${mapId} boss "${b.id}"`);
      checkTalk(b.talk, loc, `${mapId} boss "${b.id}"`);
      if (b.encounter && !tables.encounters[b.encounter]) err('enemy', loc, `${mapId} boss "${b.id}" names unknown encounter "${b.encounter}"`);
    }
    for (const t of map.triggers) {
      checkScript(t.script, loc, `${mapId} trigger "${t.id}"`);
      const story = t.once || REG.scenes.some((s) => s.id === t.script);
      if (story && !map.poc && !devLike && !chapterBounded(t.when)) err('bounded', loc, `${mapId} trigger "${t.id}": when "${t.when ?? ''}" needs a story: or chapter term`);
    }
    for (const e of map.exits) checkTarget(e.to?.map, e.to?.spawn, loc, `${mapId} exit "${e.id}"`);
    for (const spec of Object.values(map.legend)) {
      if (spec?.lock) {
        if (spec.lock.item) { checkItem(spec.lock.item, loc, `${mapId} lock "${spec.lock.id}"`); writers.add(spec.lock.flag); }
        checkTalk(spec.lock.talk, loc, `${mapId} lock "${spec.lock.id}"`);
      }
    }
    for (const a of map.areas) {
      const zones = typeof a.zone === 'string' ? [a.zone] : Array.isArray(a.zone) ? a.zone.map((z) => z?.zone).filter(Boolean) : [];
      for (const z of zones) if (!tables.zones[z]) err('enemy', loc, `${mapId} area "${a.id}" names unknown zone "${z}"`);
    }
    for (const [id, list] of entries(map.talk)) checkTalk(list, loc, `${mapId} talk "${id}"`);
    // what the map's conditions read (validateMap reports their syntax)
    const note = (src, where) => checkCond(src, loc, `${mapId} ${where}`, true);
    for (const [k, sp] of Object.entries(map.spawns)) note(sp?.requires, `spawn "${k}" requires`);
    for (const [kind, list] of Object.entries({ npc: map.npcs, chest: map.chests, interactable: map.interactables, boss: map.bosses, trigger: map.triggers, exit: map.exits, prop: map.props, light: map.lights })) {
      for (const e of list) { note(e.when, `${kind} "${e.id ?? e.t ?? '?'}" when`); note(e.status, `${kind} "${e.id ?? e.t ?? '?'}" status`); }
    }
    for (const g of map.gates) note(g.open, `gate "${g.id}" open`);
    for (const spec of Object.values(map.legend)) {
      note(spec?.drain, 'water drain');
      note(spec?.lock?.flag, `lock "${spec?.lock?.id}"`);
    }
    for (const a of map.areas) if (Array.isArray(a.zone)) for (const z of a.zone) note(z?.when, `area "${a.id}" zone`);
  }

  // ---------------------------------------------------------------- extends
  for (const [mapId, parts] of entries(REG.extends)) {
    for (const { loc, ext } of parts) {
      if (!REG.maps[mapId]) { err('extends', loc, `extends "${mapId}": no such map`); continue; }
      const codes = LOC_CODES[loc] || [loc];
      const exempt = loc === 'dev';
      for (const kind of BOUNDED_KINDS) {
        for (const e of Array.isArray(ext[kind]) ? ext[kind] : []) {
          if (!exempt && !chapterBounded(e.when)) err('bounded', loc, `extends.${mapId}.${kind} "${e.id ?? e.t ?? '?'}": when "${e.when ?? ''}" needs a story: or chapter term`);
          if (e.id && !exempt && kind !== 'props' && !codes.some((c) => e.id.startsWith(`${c}.`) || e.id.startsWith(`${c}_`))) {
            err('id', loc, `extends.${mapId}.${kind} id "${e.id}" must start with the location code (${codes[0]}.)`);
          }
        }
      }
      for (const kind of ['lights', 'ambient']) {
        for (const e of Array.isArray(ext[kind]) ? ext[kind] : []) {
          if (!exempt && !chapterBounded(e.when)) warn('bounded', loc, `extends.${mapId}.${kind}: no chapter-bounded when (shows in every chapter)`);
        }
      }
      for (const [id, spec] of entries(ext.talk)) {
        let list = [];
        try { list = normalizeTalk(spec) || []; } catch (e) { err('script', loc, `extends.${mapId}.talk "${id}": ${e.message}`); }
        for (const t of list) {
          if (!exempt && !chapterBounded(t.when)) err('bounded', loc, `extends.${mapId}.talk "${id}": when "${t.when ?? ''}" needs a story: or chapter term`);
        }
      }
    }
  }

  // ---------------------------------------------------------------- battle data
  const enemyOk = (kind) => !!tables.enemies[kind];
  for (const [id, enc] of entries(tables.encounters)) {
    const loc = ownerOf('encounters', id);
    if (loc === 'core') continue;
    for (const k of enc.enemies || []) if (!enemyOk(k)) err('enemy', loc, `encounter "${id}" names unknown enemy "${k}"`);
    if (enc.retryPhase?.encounter && !tables.encounters[enc.retryPhase.encounter]) err('enemy', loc, `encounter "${id}": retryPhase names unknown encounter "${enc.retryPhase.encounter}"`);
    for (const t of enc.tips || []) if (t.flag) writers.add(t.flag);
    const prefixes = ENC_PREFIX[loc];
    if (prefixes && !prefixes.some((p) => id.startsWith(p))) err('id', loc, `encounter "${id}" must start with ${prefixes.join(' or ') || '(no encounters in this location)'}`);
  }
  for (const [kind, e] of entries(tables.enemies)) {
    const loc = ownerOf('enemies', kind);
    if (loc === 'core') continue;
    for (const ph of e.phases || []) if (ph?.transform && !enemyOk(ph.transform)) err('enemy', loc, `enemy "${kind}": phase transform to unknown "${ph.transform}"`);
    if (e.onDefeat?.transform && !enemyOk(e.onDefeat.transform)) err('enemy', loc, `enemy "${kind}": onDefeat transform to unknown "${e.onDefeat.transform}"`);
    for (const a of e.actions || []) if (a?.summon?.kind && !enemyOk(a.summon.kind)) err('enemy', loc, `enemy "${kind}": action "${a.id}" summons unknown "${a.summon.kind}"`);
    if (e.script && !tables.bossScripts[e.script]) err('enemy', loc, `enemy "${kind}" names unknown boss script "${e.script}"`);
    for (const d of e.drops || []) checkItem(d.id, loc, `enemy "${kind}" drops`);
  }
  for (const [id, list] of entries(tables.zones)) {
    const loc = ownerOf('zones', id);
    if (loc === 'core') continue;
    for (const encId of list || []) if (!tables.encounters[encId]) err('zone', loc, `zone "${id}" lists unknown encounter "${encId}"`);
    const formations = new Set(list || []).size;
    if (formations < 4) err('zone', loc, `zone "${id}" has ${formations} formations (at least 4)`);
    const prefixes = ENC_PREFIX[loc];
    if (prefixes && !prefixes.some((p) => id.startsWith(p))) err('id', loc, `zone "${id}" must start with ${prefixes.join(' or ') || '(no zones in this location)'}`);
  }
  for (const [id] of entries(REG.zoneRates)) if (!tables.zones[id]) err('zone', ownerOf('zoneRates', id), `zoneRates for unknown zone "${id}"`);
  for (const [id, enc] of entries(tables.encounters)) if (enc.boss) writers.add(`defeated:${id}`);

  // ---------------------------------------------------------------- economy
  for (const [id, shop] of entries(REG.shops)) {
    const loc = ownerOf('shops', id);
    for (const s of shop.stock || []) {
      checkItem(s.item, loc, `shop "${id}"`);
      checkCond(s.when, loc, `shop "${id}" stock when`);
    }
  }
  for (const [ch, kit] of entries(REG.kits)) {
    const loc = ownerOf('kits', ch);
    if (chapterIndex(ch) < 0) err('ref', loc, `kit for unknown chapter "${ch}"`);
    for (const id of Object.keys(kit.items || {})) checkItem(id, loc, `kit "${ch}"`);
    for (const [m, slots] of entries(kit.equip)) for (const id of Object.values(slots || {})) checkItem(id, loc, `kit "${ch}" ${m}`);
  }

  // ---------------------------------------------------------------- story tables
  for (const sc of REG.scenes) {
    if (!scriptExists(sc.id)) err('script', sc.loc, `scene "${sc.id}" has no script`);
    if (sc.chapter && chapterIndex(sc.chapter) < 0) err('ref', sc.loc, `scene "${sc.id}": unknown chapter "${sc.chapter}"`);
    // contact-sheet staging: jump = a chapter or a jumps id, at = 'map:spawn'
    if (sc.jump && chapterIndex(sc.jump) < 0 && !(REG.jumps && REG.jumps[sc.jump])) err('ref', sc.loc, `scene "${sc.id}": unknown jump "${sc.jump}"`);
    if (sc.at) {
      const [m, sp] = typeof sc.at === 'string' ? sc.at.split(':') : [sc.at.map, sc.at.spawn];
      checkTarget(m, sp, sc.loc, `scene "${sc.id}" at`);
    }
    // G2 T-2: without them the contact sheet frames a key scene on the chapter's start map
    if (sc.key && !sc.jump && !sc.at) warn('staging', sc.loc, `key scene "${sc.id}" has no jump or at: the contact sheet frames it on its chapter's start map`);
  }
  for (const [id, s] of entries(REG.scripts)) {
    const loc = ownerOf('scripts', id);
    if (typeof s !== 'function') err('script', loc, `script "${id}" is not a function`);
    const ok = id.startsWith(`${loc}.`) || (SCRIPT_EXCEPTIONS[loc] || []).includes(id);
    if (!ok) err('id', loc, `script id "${id}" must start with "${loc}."`);
    for (const f of flagLiterals(s)) writers.add(f);
  }
  for (const [id, o] of entries(REG.objectives)) {
    const loc = ownerOf('objectives', id);
    if (o.chapter && chapterIndex(o.chapter) < 0) err('ref', loc, `objective "${id}": unknown chapter "${o.chapter}"`);
    if (o.target?.map && !REG.maps[o.target.map]) err('ref', loc, `objective "${id}": target on unknown map "${o.target.map}"`);
  }
  for (const ch of CHAPTER_IDS) {
    const want = CHAPTER_START[ch].objective;
    // dev's test objectives do not make a chapter's start objective mandatory
    const has = Object.entries(REG.objectives).some(([id, o]) => o.chapter === ch && ownerOf('objectives', id) !== 'dev');
    if (has && !REG.objectives[want]) err('objective', null, `CHAPTER_START.${ch} objective "${want}" is not defined`);
    if (REG.maps[CHAPTER_START[ch].map]) checkTarget(CHAPTER_START[ch].map, CHAPTER_START[ch].spawn, null, `CHAPTER_START.${ch}`);
  }
  for (const [id, j] of entries(REG.jumps)) {
    const loc = ownerOf('jumps', id);
    if (j.chapter && chapterIndex(j.chapter) < 0) err('ref', loc, `jump "${id}": unknown chapter "${j.chapter}"`);
    if (j.map) checkTarget(j.map, j.spawn, loc, `jump "${id}"`);
    if (j.objective && !REG.objectives[j.objective]) err('objective', loc, `jump "${id}": unknown objective "${j.objective}"`);
    for (const f of j.flags || []) writers.add(f);
    for (const it of Object.keys(j.items || {})) checkItem(it, loc, `jump "${id}"`);
  }
  for (const d of REG.destinations) {
    checkTarget(d.map, d.spawn, d.loc, `destination "${d.id}"`);
    checkCond(d.unlock, d.loc, `destination "${d.id}" unlock`);
    checkCond(d.visible, d.loc, `destination "${d.id}" visible`);
    checkScript(d.before, d.loc, `destination "${d.id}" before`);
  }
  for (const [id, pt] of entries(REG.partyTalks)) {
    const loc = ownerOf('partyTalks', id);
    checkScript(pt.script, loc, `party talk "${id}"`);
    checkCond(pt.when, loc, `party talk "${id}" when`);
    for (const m of pt.members || []) if (!PARTY.includes(m)) err('ref', loc, `party talk "${id}": unknown member "${m}"`);
    if (pt.chapter && chapterIndex(pt.chapter) < 0) err('ref', loc, `party talk "${id}": unknown chapter "${pt.chapter}"`);
  }
  for (const [id, c] of entries(REG.companions)) {
    const loc = ownerOf('companions', id);
    checkScript(c.talk, loc, `companion "${id}"`);
    checkCond(c.follow, loc, `companion "${id}" follow`);
  }
  for (const [, tip] of entries(REG.tips)) if (tip?.flag) writers.add(tip.flag);
  if (REG.newJourney) {
    const loc = ownerOf('newJourney', 'newJourney');
    checkTarget(REG.newJourney.map, REG.newJourney.spawn, loc, 'newJourney');
    checkScript(REG.newJourney.script, loc, 'newJourney');
  }

  // ---------------------------------------------------------------- soft-lock lint
  for (const flags of Object.values(CHAPTER_FLAGS)) for (const f of flags) writers.add(f);
  for (const flags of Object.values(REG.doneFlags)) for (const f of flags) writers.add(f);
  writers.add('boss_defeated'); // legacy, still set by the model
  const isWritten = (f) => writers.has(f) || AUTO_PREFIXES.some((p) => f.startsWith(p));
  for (const src of reads) { try { compileCond(src); condReads.push({ src, loc: null, where: 'script cs.test' }); } catch { /* reported by the dry run */ } }
  const reported = new Set();
  for (const { src, loc, where } of condReads) {
    for (const f of condFlags(src)) {
      if (isWritten(f) || reported.has(f)) continue;
      reported.add(f);
      err('softlock', loc, `${where}: flag "${f}" is read but nothing writes it`);
    }
  }
  return { errors, warnings };
}

/** One line per finding, for test output and the CLI. */
export function formatFindings(list) {
  return list.map((f) => `  [${f.rule}]${f.loc ? ` ${f.loc}:` : ''} ${f.msg}`).join('\n');
}
