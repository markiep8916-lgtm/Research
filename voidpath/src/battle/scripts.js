// Boss-script registry (PURE, TECH_PLAN 7.3). Content registers scripts by id (DataDef.bossScripts,
// merged by content/registry.js); BattleModel calls the hooks of every enemy whose def names a
// `script` (any enemy may have one). Scripts are plain objects of pure functions:
//
//   {
//     thresholds: [0.75, 0.5, 0.25],          // HP fractions for onThreshold (each fires once)
//     onBegin(api),                            // after round 1's roundStart and bp events
//     onRoundStart(api, round),                // every round, round 1 included
//     chooseAction(api, enemy) -> { actionId, targetId?, override?: { type, name, power } } | null
//                                              // null = the default weighted pick; override changes
//                                              // this use only (Mirror). Pending charge, lock-on and
//                                              // `then` actions run before chooseAction is asked.
//     onPartyAction(api, actor, action),       // after a party attack/skill/item; action is its
//                                              // 'action' event (action.damageType = element used)
//     onHit(api, hit),                         // every hit: { attackerId, targetId, type, amount, weak, protected? }
//     onThreshold(api, enemy, fraction),
//     onBreak(api, enemy), onRecover(api, enemy), onTransform(api, enemy),
//     onDefeat(api, enemy) -> boolean,         // true prevents the KO (the script handled the defeat)
//   }
//
// Hooks without an enemy argument (onBegin, onRoundStart, onPartyAction, onHit) run once per script
// among the living enemies; the others run per enemy. A hook that throws is reported with
// console.error and ignored. Script hooks nest at most 4 deep (useAction -> onHit -> ...).
// Beat guard: while an enemy has an unfired threshold (or an unfired `phases` entry), a lethal blow
// leaves it at 1 HP, so the beat always plays before the KO.
//
// api (every method appends events to the list being built):
//   api.round; api.rng; api.mem                 // mem: per-battle scratch, one object per script id
//   api.enemy(idOrKind); api.enemies(); api.party(); api.member(id)   // enemies()/party(): living only
//   api.say(speaker, text, { portrait, expr }); api.message(text)
//   api.cue(name, { targetId, value })          // 'cue' event -> arena.react and fx 'cue.<name>'
//   api.transform(enemyId, kind, { keepHp = false }); api.summon(kind, { count = 1 }) -> ids
//   api.setUntargetable(enemyId, on, { rounds = 1, style = 'submerge' })
//   api.setResist(id, { [type]: mult }, { rounds = 1 })   // damage multipliers; cue 'resist'
//   api.shiftWeaknesses(enemyId, list); api.heal(id, amount); api.status(id, effect)
//   api.cleanse(idOrParty, stats)               // 'party' = every living member; stats default: all ailments
//   api.protect(memberId, { hits = 1 })         // the next lethal hit leaves 1 HP; cue 'protect' (and
//                                               // cue 'protected' when it triggers)
//   api.telegraph(enemyId, targetId | null, text); api.useAction(enemyId, actionId, targetId)
//   api.grantUltimate(memberId)                 // sets ult:<member>, adds the skill, 'learn' (ultimate: true)
//   api.rechargeUltimates()                     // every ultimate usable again; cue 'ultimatesRecharged'
//
// Durations: setUntargetable and setResist last the rest of the current round plus `rounds` more
// (counted down at round start, like breaks).

export const BOSS_SCRIPTS = {};

export function registerBossScript(id, script) {
  BOSS_SCRIPTS[id] = script;
}
