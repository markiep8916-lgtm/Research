// Battle preview: boots the engine, input, audio, field UI and game state like a mini game.
//
// Model battles (BattleState, restarted whenever one ends):
//   ?enc=<encounterId>&party=<1-4>&seed=<n>   plus &arena=<name> (arena override), &auto (party
//   autoplay), &fast (3x battle speed, for slow headless runs), &q=low|medium|high (quality tier).
//   The POC hash form still works: #boss_sentinel@bridge&auto&seed=4
// Canned fixtures (TECH_PLAN 7.4): ?events=<name>[&party=<n>] plays a recorded event list against the
//   stage and UI without the model: summon | adds | transform | submerge | phase | say | skip | cue |
//   learn | charge | ultimate | intro | results | colossus | defeat. Fixtures register a 256x192 test
//   art ('dev_colossus', with a fitBox) and speaker styles, and use the dev arena and fx.
//
// window.__PREVIEW = { ready, battle, model, stage, ui, director, current, fixture, fixtureDone, marker,
//   autoplay(on), seen, log, results, pauseOn(pred, delay, uiMs), paused, resume(), menuOpen(), restart(query),
//   forceVictory(), dismiss(), setHp(id, hp), wound(hp), nearLevel(), links(), renderInfo(), lights(), FIXTURES }
// links() counts shader program links since the page started (engine.renderInfo().compiles); lights()
// counts the stage's lights by type. Like game.startBattle, every battle is compiled with
// engine.compileScene right after it is built.

import { Engine } from '../core/engine.js';
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { gameState, resetGame, healParty, useItemOutOfBattle } from '../core/state.js';
import { ITEMS, PARTY_DEFS, ENCOUNTERS, ENEMIES, SKILLS } from '../battle/data.js';
import { buildPortrait, buildBattleSprite, PARTY_IDS } from '../art/characters.js';
import { prebuildEnemySprites, registerEnemyArt, hasEnemyArt } from '../art/enemies.js';
import { parseColor } from '../art/painter.js';
import { iconURL } from '../art/icons.js';
import { buildTexture } from '../art/tiles.js';
import { BattleState, resultMembers } from '../battle/battleState.js';
import { BattleStage } from '../battle/stage.js';
import { BattleUI } from '../battle/battleUI.js';
import { Director } from '../battle/director.js';
import { registerArena, ARENAS } from '../battle/arena.js';
import { registerActionFx, getActionFx } from '../battle/actionfx.js';
import { registerAll, REG } from '../content/index.js';
import devArenas from '../content/dev/arena.js';
import devFx from '../content/dev/fx.js';
import { isTouchDevice, makeRng } from '../core/util.js';

// ---------------------------------------------------------------- options

function parseOpts() {
  const q = new URLSearchParams(location.search);
  const opts = {
    encounterId: 'drone_pair', arena: null, auto: false, seed: null, fast: false, party: 4, events: null,
    quality: q.get('q') || (isTouchDevice() ? 'medium' : 'high'),
  };
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (raw) {
    const [head, ...flags] = raw.split('&');
    const [id, backdrop] = (head || '').split('@');
    if (ENCOUNTERS[id]) opts.encounterId = id;
    opts.arena = backdrop || null;
    for (const f of flags) {
      if (f === 'auto') opts.auto = true;
      else if (f === 'fast') opts.fast = true;
      else if (f.startsWith('seed=')) opts.seed = Number(f.slice(5)) || 1;
    }
  }
  if (q.has('enc')) opts.encounterId = ENCOUNTERS[q.get('enc')] ? q.get('enc') : opts.encounterId;
  if (q.has('arena')) opts.arena = q.get('arena');
  if (q.has('seed')) opts.seed = Number(q.get('seed')) || 1;
  if (q.has('party')) opts.party = Math.max(1, Math.min(4, Number(q.get('party')) || 4));
  if (q.has('auto')) opts.auto = true;
  if (q.has('fast')) opts.fast = true;
  if (q.has('events')) opts.events = q.get('events');
  return opts;
}

// every registered location (dev encounters, content arts, arenas, fx, tips); if a location is
// broken mid-wave, the dev arenas and fx the fixtures need are registered directly
try {
  registerAll();
} catch (err) {
  console.warn('preview-battle: registerAll failed, fixtures use the dev content only', err);
}
for (const [name, def] of Object.entries(devArenas)) if (!ARENAS[name]) registerArena(name, def);
for (const [id, fn] of Object.entries(devFx)) if (!getActionFx(id)) registerActionFx(id, fn);
const OPTS = parseOpts();
const engine = new Engine(document.getElementById('view'), { quality: OPTS.quality });
const input = new Input({ touchLayer: document.getElementById('touch-layer') });
const ui = new UI({
  root: document.getElementById('ui-root'), input, audio, state: gameState, engine,
  onUseItem: useItemOutOfBattle, items: ITEMS, partyDefs: PARTY_DEFS,
});
ui.setPortraitProvider(buildPortrait);
ui.setIconProvider((n) => iconURL(n, 2));
input.onAny(() => audio.init());

const SPEAKERS = {
  KADE: { portrait: 'kade', accent: '#ffb54a' }, NYX: { portrait: 'nyx', accent: '#3fd6d2' },
  ORION: { portrait: 'orion', accent: '#b98cff' }, SERA: { portrait: 'sera', accent: '#ff7cbd' },
  BOLT: { portrait: 'bolt', accent: '#7fe3ff' }, WARDEN: { sigil: 'warden_sigil', accent: '#ffd27a', textSpeed: 0.6 },
};
for (const [name, def] of Object.entries(SPEAKERS)) if (!ui.speaker?.(name)) ui.registerSpeaker?.(name, def);

const battle = new BattleState({ engine, input, audio, ui, state: gameState, game: null, content: REG });

// ---------------------------------------------------------------- test art: a 256x192 colossus with a fitBox

const rp = (...hex) => hex.map((h) => parseColor(h));
const HULL = rp('#0e111b', '#171c2a', '#212839', '#2d364b', '#3e4962', '#56637e', '#7a88a4');
const IVORY = rp('#1b1d26', '#2c3040', '#43485c', '#62687e', '#868ca2', '#aeb4c8', '#d6dbea');
const BRASS = rp('#2a1606', '#4f2c0c', '#7d4a16', '#b0702a', '#d99a44', '#f7c870');
const G_CORE = rp('#4a0c40', '#8f1c78', '#e23aa8', '#ff8ad8', '#ffe2f6');
const G_EYE = rp('#0d4f78', '#1479b0', '#29a9e0', '#7ff4ff', '#e6fdff');

function drawColossus(r, p) {
  const bob = p.bob || 0, arm = p.arm || 0, core = p.core ?? 1, slump = p.slump || 0;
  r.save().translate(0, bob + slump * 16);
  for (const side of [-1, 1]) {
    const sx = 128 + side * 46, sy = 62;
    const ex = 128 + side * (90 + arm * 6), ey = 92 - arm * 12 + slump * 18;
    const hx = 128 + side * 116, hy = 132 - arm * 20 + slump * 26;
    r.begin();
    r.seg(sx, sy, ex, ey, 12, 10, HULL);
    r.seg(ex, ey, hx, hy, 10, 8, HULL);
    r.ball(hx, hy, 13, 13, IVORY);
    r.end();
    r.glow(ex, ey, 5, 5, G_CORE, { k: core });
  }
  r.begin();
  r.poly([[80, 46], [176, 46], [192, 72], [64, 72]], IVORY, { bevel: 2 });
  r.end();
  r.begin();
  r.ball(128, 100, 42, 52, HULL);
  r.end();
  r.ring(128, 96, 15, 22, BRASS);
  r.glow(128, 96, 15 * core, 15 * core, G_CORE, { k: 1.2 });
  r.begin();
  r.ball(128, 32, 17, 19, IVORY);
  r.end();
  r.rect(116, 30, 24, 3, G_EYE[3], 1.4);
  r.begin();
  r.seg(128, 146, 128, 176, 15, 4, HULL);
  r.end();
  r.glow(128, 182, 9, 6, G_EYE, { k: 0.9 });
  r.restore();
}

if (!hasEnemyArt('dev_colossus')) {
  registerEnemyArt('dev_colossus', {
    w: 256, h: 192, bevel: 4, draw: drawColossus,
    anims: {
      idle: { fps: 5, loop: true, poses: [{ core: 1 }, { bob: -1, arm: 0.2, core: 1.15 }, { bob: -2, arm: 0.35, core: 1.3 }, { bob: -1, arm: 0.2, core: 1.15 }] },
      attack: { fps: 8, loop: false, poses: [{ arm: 1, core: 1.5 }, { arm: -0.4, core: 1.7 }] },
      hurt: { fps: 6, loop: false, poses: [{ arm: -0.3, core: 0.6, bob: 2 }] },
      break: { fps: 4, loop: true, poses: [{ slump: 1, core: 0.3, arm: -0.6 }, { slump: 1, core: 0.6, arm: -0.5 }] },
    },
    points: { center: [128, 96], muzzle: [128, 96], top: [128, 12], core: [128, 96] },
    icon: { x: 128, y: 40, scale: 0.42 },
    fitBox: [92, 56, 72, 92],   // the torso and core: head, arms and thrusters may bleed off-frame
  });
}

// ---------------------------------------------------------------- canned fixtures

/** Combatant view of a party member (for fixtures). */
function memberCombatant(m) {
  return {
    id: m.id, side: 'party', key: m.id, name: m.name, hp: m.hp, maxHp: m.maxHp, ep: m.ep, maxEp: m.maxEp, bp: 1,
    shield: 0, maxShield: 0, revealed: [], weaknesses: [], alive: m.alive !== false,
  };
}

function enemyCombatant(id, kind, extra = {}) {
  const d = ENEMIES[kind] || {};
  return {
    id, side: 'enemy', key: kind, name: extra.name || d.name || kind.toUpperCase(), hp: extra.hp ?? d.maxHp ?? 5000, maxHp: extra.maxHp ?? d.maxHp ?? 5000,
    ep: 0, maxEp: 0, bp: 0, shield: extra.shield ?? d.shield ?? 4, maxShield: extra.shield ?? d.shield ?? 4,
    weaknesses: d.weaknesses || ['lance', 'rifle', 'volt'], revealed: extra.revealed || [], alive: true, art: extra.art,
  };
}

/** Plays a fixture's event lists against a real stage, UI and director (no model). */
class Fixture {
  constructor(name, spec) {
    this.name = name;
    this.spec = spec;
    this.timeScale = 1;
    this.hp = new Map();
  }

  start() {
    const spec = this.spec;
    const party = gameState.party.slice(0, OPTS.party).map(memberCombatant);
    const enemies = spec.enemies.map(([id, kind, extra]) => enemyCombatant(id, kind, extra));
    this.combatants = [...party, ...enemies];
    for (const c of this.combatants) this.hp.set(c.id, c.hp);
    const encounter = { id: `fixture_${this.name}`, backdrop: spec.arena || 'corridor', boss: !!spec.boss, music: spec.boss ? 'boss' : 'battle' };
    this.stage = new BattleStage(engine, { encounter, combatants: this.combatants });
    this.ui = new BattleUI({ root: ui.root, engine, input, audio, stage: this.stage, model: null, combatants: this.combatants, fieldUI: ui });
    this.ui.autoAdvance = true;
    this.director = new Director({ stage: this.stage, ui: this.ui, audio, engine });
    this.director.onEvent = (e) => onEvent(e);
    engine.setView(this.stage.scene, this.stage.camera);
    const f = this.stage.fx;
    engine.setFx({ tiltShift: { enabled: true, focusY: f.focusY, band: f.band, falloff: f.falloff, maxBlur: 1.15 } });
    this.stage.warm();
    engine.compileScene(this.stage.scene, this.stage.camera);
    input.setContext('battle');
    ui.hud?.setVisible(false);
    audio.music(encounter.music);
    this.ui.showIntro(false);
    this.active = true;
    P.fixtureDone = false;
    Promise.resolve(spec.run(this)).then(() => { P.fixtureDone = true; P.marker = 'done'; });
  }

  update(dt, t) {
    const sdt = dt * this.timeScale;
    this.stage.update(sdt, t);
    this.ui.update();
  }

  exit() {
    this.active = false;
    this.ui.dispose();
    engine.setView(null, null);
    this.stage.dispose();
    ui.hud?.setVisible(true);
  }

  // event builders --------------------------------------------------
  get ids() { return this.combatants.filter((c) => this.stage.actor(c.id)?.alive !== false).map((c) => c.id); }
  round(n = 1) { return { type: 'roundStart', round: n, order: this.ids, nextOrder: this.ids }; }
  turn(id) { return { type: 'turnStart', actorId: id }; }
  action(actorId, o) {
    return { type: 'action', actorId, kind: o.kind || 'attack', name: o.name, anim: o.anim || 'enemyShot', damageType: o.type ?? null, targets: o.targets || [], hits: o.hits || 1, ...(o.skillId ? { skillId: o.skillId } : {}), ...(o.actionId ? { actionId: o.actionId } : {}) };
  }
  hit(actorId, targetId, amount, { weak = false, crit = false, broken = false, type = null, hitIndex = 0, hitCount = 1 } = {}) {
    const hpAfter = Math.max(0, (this.hp.get(targetId) ?? 0) - amount);
    this.hp.set(targetId, hpAfter);
    return { type: 'hit', actorId, targetId, damageType: type, amount, crit, weak, broken, hpAfter, hitIndex, hitCount };
  }
  summon(id, kind, extra = {}) {
    const c = enemyCombatant(id, kind, extra);
    this.combatants.push(c);
    this.hp.set(id, c.hp);
    return { type: 'summon', targetId: id, kind, name: c.name, hp: c.hp, maxHp: c.maxHp, shield: c.shield, maxShield: c.maxShield, weakCount: c.weaknesses.length, revealed: c.revealed };
  }
  play(events) { return this.active ? this.director.play(events) : new Promise(() => {}); }
  wait(sec) { return this.stage.wait(sec); }
  mark(name) { P.marker = name; }
  hold(sec = 1e6) { return this.stage.wait(sec); }
}

const FIXTURES = {
  summon: {
    arena: 'bridge', boss: true, enemies: [['e0', 'sentinel']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), f.turn('e0'), f.action('e0', { kind: 'summon', name: 'Call Reinforcements', anim: 'enemyCharge', actionId: 'call' })]);
      f.mark('summoning');
      await f.play([f.summon('e1', 'drone'), f.summon('e2', 'turret')]);
      f.mark('adds');
    },
  },
  adds: {
    arena: 'bridge', boss: true, enemies: [['e0', 'sentinel'], ['e1', 'drone'], ['e2', 'crawler']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), f.turn('kade')]);
      f.mark('adds');
    },
  },
  transform: {
    arena: 'dev_lab', boss: true, enemies: [['e0', 'sentinel']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), f.turn('kade'), f.action('kade', { kind: 'attack', name: 'Lance', anim: 'thrust', type: 'lance', targets: ['e0'] }), f.hit('kade', 'e0', 4200, { type: 'lance', weak: true })]);
      await f.play([{ type: 'say', speaker: 'SENTINEL', text: 'Override accepted. *Reconfiguring.*' }]);
      f.mark('transform');
      await f.play([{ type: 'transform', targetId: 'e0', kind: 'dev_colossus', name: 'COLOSSUS', hp: 9000, maxHp: 9000, shield: 8, maxShield: 8, weakCount: 4, revealed: [] }]);
      f.mark('transformed');
    },
  },
  submerge: {
    arena: 'cryo', enemies: [['e0', 'drone'], ['e1', 'crawler']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), { type: 'telegraph', actorId: 'e1', targetId: null, text: 'The ice groans beneath the squad...' }]);
      await f.play([f.turn('e1'), f.action('e1', { kind: 'submerge', name: 'Submerge', anim: 'enemyCharge', actionId: 'submerge' }), { type: 'untargetable', targetId: 'e1', on: true, style: 'submerge' }]);
      f.mark('submerged');
    },
  },
  phase: {
    arena: 'dev_lab', enemies: [['e0', 'drone'], ['e1', 'turret']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), f.turn('e0'), f.action('e0', { kind: 'buff', name: 'Glitch Phase', anim: 'enemyCharge', actionId: 'phase' }), { type: 'untargetable', targetId: 'e0', on: true, style: 'phase' }]);
      f.mark('phased');
    },
  },
  charge: {
    arena: 'engineering', enemies: [['e0', 'turret'], ['e1', 'drone']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), f.turn('e0'), f.action('e0', { kind: 'charge', name: 'Overwrite', anim: 'enemyCharge', actionId: 'charge_overwrite' })]);
      f.mark('band');
      await f.play([{ type: 'telegraph', actorId: 'e0', targetId: null, text: 'The turret coils whine to a scream...' }]);
      f.mark('charging');
      await f.hold(2.5);
      const ids = f.combatants.filter((c) => c.side === 'party').map((c) => c.id);
      await f.play([f.round(2), f.turn('e0'), f.action('e0', { kind: 'attack', name: 'Overwrite', anim: 'enemyBeam', type: 'void', targets: ids, actionId: 'overwrite' }),
        ...ids.map((id) => f.hit('e0', id, 180, { type: 'void' }))]);
      f.mark('fired');
    },
  },
  say: {
    arena: 'bridge', boss: true, enemies: [['e0', 'sentinel']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1),
        { type: 'say', speaker: 'NYX', text: 'Great-grandma fought worse than you. I read her log.', portrait: 'nyx:determined' },
        { type: 'say', speaker: 'WARDEN', text: 'Please. Lay down your arms. Sleep is not death. Sleep is shelter.' },
        { type: 'say', speaker: 'KADE', text: 'Then we make somewhere.' }]);
    },
  },
  skip: {
    arena: 'corridor', enemies: [['e0', 'drone'], ['e1', 'drone', { name: 'Sec-Drone B' }]],
    async run(f) {
      await f.wait(0.6);
      const [a, b] = f.combatants.filter((c) => c.side === 'party').map((c) => c.id).concat(['kade', 'kade']);
      await f.play([f.round(1), f.turn('e0'), f.action('e0', { kind: 'debuff', name: 'Pollen', anim: 'enemyCharge', actionId: 'pollen', targets: [a] }),
        { type: 'status', targetId: a, stat: 'sleep', stage: 1, turns: 2 },
        f.turn('e1'), f.action('e1', { kind: 'debuff', name: 'Mark Target', anim: 'enemyBeam', actionId: 'mark', targets: [b] }),
        { type: 'status', targetId: b, stat: 'marked', stage: 1, turns: 2 }]);
      f.mark('icons');
      await f.play([f.turn(a), { type: 'skip', actorId: a, reason: 'sleep' }]);
      f.mark('skipped');
    },
  },
  cue: {
    arena: 'dev_lab', boss: true, enemies: [['e0', 'sentinel']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), { type: 'cue', name: 'dev_flare', targetId: 'e0' }]);
      f.mark('cued');
      await f.play([f.turn('e0'), f.action('e0', { kind: 'attack', name: 'Prism Beam', anim: 'enemyBeam', type: 'photon', actionId: 'prism', targets: ['kade', 'nyx'] }),
        f.hit('e0', 'kade', 160, { type: 'photon' }), f.hit('e0', 'nyx', 150, { type: 'photon' })]);
    },
  },
  learn: {
    arena: 'cryo', boss: true, enemies: [['e0', 'sentinel']],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), { type: 'say', speaker: 'NYX', text: 'Great-grandma fought worse than you. I read her log.', portrait: 'nyx:determined' }]);
      f.mark('awakening');
      await f.play([{ type: 'learn', memberId: 'nyx', skillId: 'ringfire_barrage', name: SKILLS.ringfire_barrage?.name || 'Ringfire Barrage', ultimate: true },
        { type: 'ultimateReady', memberId: 'nyx', skillId: 'ringfire_barrage' }]);
      f.mark('ready');
    },
  },
  ultimate: {
    arena: 'bridge', boss: true, enemies: [['e0', 'sentinel']],
    async run(f) {
      await f.wait(0.6);
      const name = SKILLS.oathblade?.name || 'Oathblade';
      await f.play([f.round(1), { type: 'ultimateReady', memberId: 'kade', skillId: 'oathblade' }, f.turn('kade'),
        { type: 'boost', actorId: 'kade', level: 3 }, { type: 'bp', actorId: 'kade', bp: 0, delta: -3 }]);
      f.mark('cutin');
      await f.play([f.action('kade', { kind: 'skill', name, anim: 'slash', type: 'volt', targets: ['e0'], skillId: 'oathblade' }),
        f.hit('kade', 'e0', 2480, { type: 'volt', weak: true }), { type: 'shield', targetId: 'e0', shield: 0, maxShield: 6 }, { type: 'break', targetId: 'e0' }]);
      f.mark('done');
    },
  },
  intro: {
    arena: 'bridge', boss: true, enemies: [['e0', 'sentinel']],
    async run(f) {
      f.stage.cam.zoom = 1.25;
      f.stage.focus({ zoom: 1, rate: 1.7 });
      f.ui.showIntro(true);
      f.mark('card');
      await f.ui.bossCard({ title: 'SENTINEL', subtitle: 'Bridge Guardian' });
      f.ui.showIntro(false);
      await f.play([{ type: 'say', speaker: 'KADE', text: 'Sentinel-class. Stay behind me.' }]);
    },
  },
  results: {
    arena: 'corridor', enemies: [['e0', 'drone']],
    async run(f) {
      await f.wait(0.4);
      f.ui.ending();
      const party = gameState.party.slice(0, OPTS.party);
      const before = new Map(party.map((p) => [p.id, { level: p.level, xp: Math.max(0, p.xpNext - 30), xpNext: p.xpNext }]));
      const first = party[0];
      const last = party[party.length - 1];
      // a level up for the first member, a learned skill (and no level up) for the last
      const ups = [
        { type: 'levelUp', memberId: first.id, level: first.level + 1, gains: { maxHp: 24, maxEp: 4, atk: 3, def: 2, mag: 1, res: 2, spd: 1 }, name: first.name },
        { type: 'learn', memberId: last.id, skillId: 'clarity', name: SKILLS.clarity?.name || 'Clarity' },
      ];
      const members = resultMembers(party, before, ups).map((m) => (m.id === first.id ? { ...m, level: m.level + 1 } : m));
      f.mark('results');
      await f.ui.showResults({ xp: 140, credits: 95, items: [{ id: 'medigel', n: 1 }], members });
    },
  },
  colossus: {
    arena: 'dev_lab', boss: true, enemies: [['e0', 'dev_colossus', { name: 'COLOSSUS', art: 'dev_colossus', hp: 12000, shield: 8 }]],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), f.turn('kade')]);
      f.mark('colossus');
    },
  },
  defeat: {
    arena: 'dev_lab', boss: true, enemies: [['e0', 'dev_colossus', { name: 'COLOSSUS', art: 'dev_colossus', hp: 3000, shield: 8 }]],
    async run(f) {
      await f.wait(0.6);
      await f.play([f.round(1), f.turn('kade'), f.action('kade', { kind: 'attack', name: 'Lance', anim: 'thrust', type: 'lance', targets: ['e0'] }),
        f.hit('kade', 'e0', 3000, { type: 'lance', crit: true }), { type: 'ko', targetId: 'e0' }]);
      f.mark('defeat');
      await f.director.victory();
      f.mark('victory');
    },
  },
};

// ---------------------------------------------------------------- tool surface

const P = {
  ready: false,
  battle,
  get current() { return P.fixture || battle; },
  get model() { return battle.model; },
  get stage() { return P.current.stage; },
  get ui() { return P.current.ui; },
  get director() { return P.current.director; },
  fixture: null,
  fixtureDone: false,
  marker: null,
  speed: 1,
  seen: {},
  log: [],
  results: [],
  FIXTURES: Object.keys(FIXTURES),
  autoplay(on = true) { battle.setAutoplay(on); return on; },
  menuOpen() { return !!(battle.ui && battle.ui.cmd); },
  forceVictory() { battle.forceVictory(); },
  dismiss() { P.ui?._dismissResults?.(); },
  /**
   * Freeze the battle `delay` seconds (battle time) after an event matching pred (type string or fn);
   * DOM animations keep running for `uiMs` more milliseconds of UI time so popups are mid-animation.
   */
  pauseOn(pred, delay = 0, uiMs = 700) {
    P._pause = { test: typeof pred === 'function' ? pred : (e) => e.type === pred, delay, uiMs, armed: true };
    P.paused = false;
  },
  /** Freeze presentation now (after uiMs more milliseconds of UI time for DOM animations). */
  freeze(uiMs = 0) {
    P.current.timeScale = 0;
    P._pause = { armed: false, freezeAt: (P.ui?.clock || 0) + uiMs / 1000 };
  },
  resume() {
    P._pause = null;
    P.paused = false;
    P.current.timeScale = P.speed;
    P.ui?.freeze(false);
  },
  setHp(id, hp) {
    const c = battle.model.get(id);
    c.hp = hp;
    battle.ui.setHp(id, hp);
  },
  /** Party members a few EXP short of their next level (to see level-ups on the results panel). */
  nearLevel() {
    for (const m of gameState.party) m.xp = Math.max(0, m.xpNext - 20);
  },
  /** Every living party member down to `hp` (e.g. to watch a defeat). */
  wound(hp = 1) {
    for (const c of battle.model.party) if (c.alive) P.setHp(c.id, hp);
  },
  /** Shader programs linked since the page started (engine counter). */
  links() { return engine.renderInfo().compiles; },
  renderInfo() { return engine.renderInfo(); },
  /** Lights in the current stage by type. */
  lights() {
    const n = { point: 0, spot: 0, dir: 0, hemi: 0 };
    P.stage?.scene.traverse((o) => {
      if (o.isPointLight) n.point++;
      else if (o.isSpotLight) n.spot++;
      else if (o.isDirectionalLight) n.dir++;
      else if (o.isHemisphereLight) n.hemi++;
    });
    return n;
  },
  restart(query) {
    if (query != null) history.replaceState(null, '', query);
    Object.assign(OPTS, parseOpts());
    start();
  },
};
window.__PREVIEW = P;

function onEvent(e) {
  P.seen[e.type] = (P.seen[e.type] || 0) + 1;
  P.log.push(e.type);
  if (P.log.length > 400) P.log.shift();
  const pz = P._pause;
  if (pz && pz.armed && pz.test(e)) {
    pz.armed = false;
    const cur = P.current;
    cur.stage.wait(pz.delay).then(() => {
      if (P._pause !== pz) return;
      cur.timeScale = 0;
      pz.freezeAt = cur.ui.clock + pz.uiMs / 1000;
    });
  }
}
battle.onEvent = onEvent;

function resetParty() {
  resetGame();
  gameState.party.splice(OPTS.party);
}

let starting = false;
async function start() {
  if (starting) return;
  starting = true;
  const running = P.fixture || battle.stage;
  if (running) {
    await engine.transition('fade', { duration: 0.6, onMidpoint: () => { stop(); begin(); } });
  } else begin();
  starting = false;
}

function stop() {
  if (P.fixture) {
    P.fixture.exit();
    P.fixture = null;
  } else if (battle.stage) battle.exit();
}

function begin() {
  P.speed = OPTS.fast ? 3 : 1;
  P.resume();
  if (OPTS.events) {
    resetParty();
    const spec = FIXTURES[OPTS.events];
    if (!spec) throw new Error(`preview-battle: unknown fixture "${OPTS.events}" (${Object.keys(FIXTURES).join(', ')})`);
    P.fixture = new Fixture(OPTS.events, spec);
    P.fixture.timeScale = P.speed;
    P.fixture.start();
    return;
  }
  if (gameState.party.every((p) => !p.alive) || ENCOUNTERS[OPTS.encounterId].boss || gameState.party.length !== OPTS.party) resetParty();
  healParty();
  battle.autoplay = OPTS.auto;
  battle.timeScale = P.speed;
  battle.enter({
    encounterId: OPTS.encounterId,
    backdrop: OPTS.arena,
    rng: OPTS.seed != null ? makeRng(OPTS.seed) : undefined,
    onEnd: (result) => {
      P.results.push(result);
      if (result === 'defeat') resetParty();
      start();
    },
  });
  engine.compileScene(battle.stage.scene, battle.stage.camera);
}

engine.onUpdate((dt, t) => {
  input.update();
  ui.update(dt);
  P.current.update(dt, t);
  const pz = P._pause;
  if (pz && pz.freezeAt != null && P.ui && P.ui.clock >= pz.freezeAt) {
    pz.freezeAt = null;
    P.ui.freeze(true);
    P.paused = true;
  }
});
engine.start();

window.addEventListener('hashchange', () => { Object.assign(OPTS, parseOpts()); start(); });

// warm the art caches behind the boot screen, then fight
(async () => {
  resetParty();
  buildTexture('space_backdrop');
  for (const id of PARTY_IDS) buildBattleSprite(id);
  await prebuildEnemySprites(['drone', 'crawler', 'turret', 'sentinel', 'dev_colossus']);
  begin();
  document.getElementById('vp-boot')?.classList.add('vp-hide');
  let frames = 0;
  const off = engine.onUpdate(() => {
    if (++frames < 3) return;
    off();
    P.ready = true;
  });
})();
