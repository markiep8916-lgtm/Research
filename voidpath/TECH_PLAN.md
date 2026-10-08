# VOIDPATH: technical plan for the full game

This is the binding technical plan for turning the VOIDPATH proof of concept (POC) into the full game
described in `STORY.md`. Agents implement it in three waves (S: systems, C: content in three
sub-waves, I: integration) with review gates between them (section 13). Read this file, `STORY.md`,
`WRITING.md` (from Wave C on) and the code you touch. `CONTRACTS.md` and `MODULE_NOTES.md` describe
the POC and stay valid wherever this plan does not change them.

Revision 2 folds in the systems review and the production review. Where a suggestion was not taken,
the section says so in one line starting with "Kept:".

Rules for every agent:

- **Names and signatures in this file are binding.** Add extra exports, options and helpers freely.
  If you need a contract change, implement the contract as written anyway, add a shim, and state the
  change you want in your final report. Do not edit files outside your task's file list.
- **Extend, do not rewrite.** Everything that works in the POC keeps working: the look, the battle
  feel, the 51 unit tests (`tests/battle.test.mjs` 43, `tests/state.test.mjs` 8, which nobody may
  edit; section 2.8 lists what they pin), the preview pages, the `window.__VP` hooks.
- **Keep exports alive until G1.** During Wave S nobody removes or renames an export that another
  module imports (`main.js` imports `ExploreState`, `VIEWPOINTS`, `prewarmWorld`, `ENEMY_KINDS`,
  `ICON_NAMES`, `FX_NAMES`, `PARTY_IDS`; `game.js` imports `resetGame`, `healParty`). Replace with a
  re-export shim; gate G1 deletes shims and dead files (`world/maps.js`, `world/script.js`).
- **Determinism and purity.** Files marked PURE import nothing from three.js, the DOM, or `src/art/*`,
  so node tests, the balance simulator and the script dry-run can import them.
- **Contract violations are errors in every build.** Light-budget overruns, unknown ids, staging
  violations and similar checks report with `console.error` (or `console.warn` where this plan says
  so) in the minified build too. Never hide a check behind `__DEV__`: scenarios run the minified page.
- **Dialogue lives in `story.js`.** From Wave C on, maps and data reference script ids only, and every
  line follows `WRITING.md` and the story budgets of section 11.7.
- **Baseline.** Another workflow is fixing bugs while this plan is written. Line numbers may drift;
  the module and function names quoted here are stable.
- Plain ES modules, three r170, no new runtime dependencies, no network fetches at runtime.
  The game ships as one page (`dist/index.html`, `dist/artifact.html`), under 16 MB.
- Every task finishes with `npm run build`, `npm test`, `npm run scriptcheck` (from G1 on), and its
  own screenshots or scenarios with `tools/play.mjs --strict` (zero page errors and zero
  `console.error`). Look at your screenshots.
- Shared docs (`README.md`, `CONTRACTS.md`, `MODULE_NOTES.md`) are only edited in Wave I3. `WRITING.md`
  belongs to task W, then to the gate directors (G2, G3). Document your API in the header comment of
  each module you own and in your final report.

---

## 1. Architecture at a glance

```
src/
  main.js                 boot (title + prologue art only), ctx wiring, debug hooks             [S2a]
  core/
    game.js               state machine + flows: new journey, continue/load, battles as promises,
                          retry from snapshot, game over, finish (credits)                       [S2a]
    titleScene.js         title diorama (+ Ione dawn variant after a clear)                       [S2a]
    input.js, util.js     + hold-to-skip, small helpers                                           [S2a]
    state.js              gameState (+ roster, leader, story, equipment, played), party helpers   [S3]
    progression.js  NEW   PURE level curve, learnsets, equipment math, optimize, refreshMember    [S3]
    shop.js         NEW   PURE buy/sell                                                            [S3]
    save.js         NEW   save format, slots, localStorage with memory fallback                    [S3]
    audio.js              + tracks, sfx, once-layer stings, motifs, restart                        [C9]
    engine.js, postfx.js  + renderInfo, compileScene, quality tiers                                [S2b]
    programs.js     NEW   shader-program anchor (every material is released through it)           [S2b]
    perf.js         NEW   ?stats=1 overlay, frame-time monitor, automatic quality drop             [S2b]
    particles.js, vfx.js, spriteActor.js   + presets, refcounted glow sheets                       [S1b]
  world/                  multi-map world
    mapdef.js       NEW   PURE normalizeMap / validateMap / DEFAULT_LEGEND                         [S1a]
    cond.js         NEW   PURE condition mini-language                                             [S1a]
    world.js, explore.js, camera.js NEW, lighting.js (persistent rig), geometry.js, player.js     [S1a]
    props.js, actors.js NEW, emotes.js NEW, water.js NEW, sky.js NEW, paint.js, lint.js NEW       [S1b]
  story/          NEW     story state, cutscene runner, travel, jumpTo state builder               [S2a]
  battle/                 model + presentation                                                    [S3 + S4]
    scripts.js      NEW   PURE boss-script registry and api                                        [S3]
    actionfx.js     NEW   battle choreography registry                                              [S4]
  ui/                     + equip, journal, map, shop, starchart, saves, cards, speaker styles     [S5]
  art/                    + registries, expressions, poses, fallbacks; cache.js NEW (byte LRU)     [S1b; enemies.js, fx.js: S4; icons.js: S5]
  content/        NEW     everything location-specific
    registry.js, data.js, index.js, chapters.js, prewarm.js                                        [S2b]
    balance.js            PURE stat lines, BATTLE_RULES overrides, zone-rate defaults        [S3 -> C10]
    common/               shared items, equipment, kits, fabricator (data); shared speakers,
                          global tips, BOLT companion and hint scripts (story.js)          [S3 -> C10, C1]
    dev/                  test-only location: dev_box map, demo scripts, test encounters  [S1a, S1b, S2a, S3, S4]
    prologue/ driftmarket/ shoals/ arboretum/ spire/ vault/ heart/ dreams/ warden/ epilogue/   [Wave C owners]
WRITING.md        NEW     voice sheet, canon facts, callbacks, scene inventory                      [W]
```

Runtime flow: `main.js` registers all content (`registerAll()` from `content/index.js`), builds
`ctx = { engine, input, audio, ui, state: gameState, game, story, cutscenes, travel, content: REG }`,
prewarms the title and the Halcyon, then starts on the title. ExploreState loads one map at a time
from `REG`, runs triggers and talk through `ctx.cutscenes`, and hands battles to `game.startBattle`,
which returns a promise of the result.

---

## 2. Content modules

### 2.1 Folder layout

Every location is a folder `src/content/<loc>/` with exactly these files. All of them exist from Wave
S on: S2b creates valid stubs for the ten Wave C folders in its first minutes, S3 creates the `common`
files, and the `dev` owners create theirs (section 13). A stub exports `{}`; a stub `pure.js` exports
`{ id, chapter, name, data: {}, story: {}, maps: {} }`.

| File | Purity | Contents |
|---|---|---|
| `pure.js` | PURE | `export default { id, chapter, name, data, story, maps }` assembled from the files below |
| `data.js` | PURE | battle and economy data: enemies, encounters, zones, items, shops, boss scripts |
| `story.js` | PURE | cutscene scripts and every line of dialogue, objectives, speakers, destinations, map extensions, jump points, scenes, recaps, party talks, credits |
| `maps/<mapId>.js` | PURE | one MapDef per map (section 3) |
| `art.js` | browser | textures, backdrops, characters, particle presets, boss and other location-owned enemy art |
| `enemyart.js` | browser | regular-enemy art (owned by the sub-wave's bestiary task, section 13) |
| `props.js` | browser | prop builders (three.js) |
| `arena.js` | browser | battle arena builders |
| `fx.js` | browser | battle action choreography |
| `index.js` | browser | `export default { ...pure, art, enemyArt, props, arenas, actionFx }` |

Locations (`<loc>`): `prologue`, `driftmarket`, `shoals`, `arboretum`, `spire`, `vault`, `heart`,
`dreams`, `warden`, `epilogue` (Wave C), plus `common` (no maps) and `dev` (test content). `warden`
has no maps: it holds the final boss (data, script, art, arena, fx) so one task can give it full
attention. `dreams` holds the dream map, the four dreams, the crown scene and the resolution. The
aggregators `src/content/data.js` and `src/content/index.js` import all twelve folders by these fixed
paths, so a Wave C owner never edits an aggregator. No location may paint, build meshes, or touch the
DOM at module top level: registration only stores definitions; painting happens in prewarm or on
first use. Each `index.js` imports only files that exist (always true for the stubbed folders; the
`dev` and `common` owners keep theirs consistent).

### 2.2 LocationDef

```js
// src/content/<loc>/pure.js  (PURE)
import data from './data.js';
import story from './story.js';
import shoals from './maps/shoals.js';
import meridian from './maps/meridian.js';
export default {
  id: 'shoals',
  chapter: 'ch1',                 // chapter the location belongs to (journal, extends order, eviction)
  name: 'The Shoals',
  data,                           // DataDef (2.3)
  story,                          // StoryDef (2.4)
  maps: { shoals, meridian },     // mapId -> MapDef (section 3); map ids are global
};

// src/content/<loc>/index.js  (browser)
import pure from './pure.js';
import art from './art.js';
import enemyArt from './enemyart.js';
import props from './props.js';
import arenas from './arena.js';
import actionFx from './fx.js';
export default { ...pure, art, enemyArt, props, arenas, actionFx };
```

### 2.3 DataDef (PURE, `data.js`)

```js
export default {
  enemies:    { [kind]: EnemyDef },            // section 7.1; kinds are global
  encounters: { [encounterId]: EncounterDef },  // section 7.1
  zones:      { [zoneId]: [encounterId, ...] }, // rolled uniformly (repeat an id to weight it); >= 4 formations (7.8)
  zoneRates:  { [zoneId]: { grace, sigma } },   // optional; default ZONE_RATE_DEFAULT (balance.js, 11.7)
  items:      { [itemId]: ItemDef },            // consumables, key items, equipment (section 5.5-5.7)
  shops:      { [shopId]: ShopDef },            // section 5.6
  bossScripts:{ [scriptId]: BossScript },       // section 7.3 (pure functions; any enemy with `script` may use one)
  kits:       { [chapterId]: Kit },             // common only: jumpTo starter kits (section 10.1)
                                                // Kit = { equip: { [memberId]: { weapon, armor, accessory } }, items: { [id]: n }, credits }
};
```

### 2.4 StoryDef (PURE, `story.js`)

```js
export default {
  scripts:    { 'shoals.varo_log': async (cs, args) => { ... } },  // section 4.3; ids prefixed '<loc>.'
  scenes:     [ { id: 'shoals.varo_log', chapter: 'ch1', key: true, budget: { boxes: 25, sec: 150 } } ],
              // every scene script in play order (dry-run transcript, 10.3); `key` scenes get the staging
              // rules of 11.3; budget defaults 25 boxes / 150 s
  objectives: { 'ch1.reach_wreck': { chapter: 'ch1', text: 'Reach the Meridian wreck.',
                hint: 'Through the Shoals, east of the docks.',
                boltHint: 'The wreck is past the ice. The cold part. I checked twice.',   // BOLT says it (4.5)
                target: { map: 'shoals', x: 40.5, z: 6.5 },   // Map tab marker (or { map, interactable })
                side: false } },                                // side: favours and optional goals (journal)
  speakers:   { RUSE: { portrait: 'ruse', accent: '#e8a25a' } },  // 8.5; party, BOLT, HALCYON, WARDEN live in common
  destinations: [ DestinationDef ],          // 4.7
  extends: {                                  // additions to maps owned by other locations (2.6 merge order)
    halcyon: {
      interactables: [ ... ], triggers: [ ... ], npcs: [ ... ], chests: [ ... ], props: [ ... ],
      lights: [ ... ], ambient: [ ... ],      // the world reacts: hub changes per chapter (12.3)
      talk: { bolt: [ { when: 'chapter>=ch1 & !story:ch1_done', script: 'driftmarket.bolt_hub' } ] },
    },
  },
  jumps:      { 'ch1.wreck': { chapter: 'ch1', map: 'meridian', spawn: 'from_shoals', level: 10,
                flags: ['story:ruse_met', 'story:maw_lore'], items: {}, objective: 'ch1.find_coil' } },
  doneFlags:  { ch1: ['seen:driftmarket:arrival', 'talk:driftmarket:ruse', 'dm:legend_heard'] },
              // flags this location's part of a chapter leaves behind in real play; jumpTo adds them (10.1)
  preload:    { halcyon: ['npc:theo', 'npc:ruse', 'tex:bd_ione_dawn'] },   // e.g. the epilogue's cs.spawn actors
              // art the map's scripts can show although no MapDef or encounter names it (prewarm, 11.5)
  recaps:     { ch1: 'Story so far, at most 400 characters.' },   // journal (8.1); owner of the chapter's end
  partyTalks: { 'ch1.kade_nyx': { chapter: 'ch1', members: ['kade', 'nyx'], title: 'Ship-People',
                when: 'story:ruse_met', script: 'driftmarket.pt_kade_nyx' } },   // 4.5
  credits:    [ CreditLine ],                 // epilogue only (section 8.6)
  newJourney: { map: 'exterior', spawn: 'view', script: 'prologue.new_journey' },   // prologue only (4.4)
  // common only:
  tips:       { 'status:sleep': { lines: [Line], flag: 'tut:sleep' } },        // 7.7
  companions: { bolt: { sprite: 'bolt', name: 'BOLT', talk: 'common.bolt_talk',
                        follow: 'story:kade_awake & !story:bolt_away' } },       // 3.6
};
```

### 2.5 Browser parts

```js
// art.js
export default {
  textures:   { [name]: TextureDef },    // art/tiles.js registerTexture (section 3.12)
  characters: { [id]: CharDef },         // art/characters.js registerCharacter (field sprite, poses, portrait expressions)
  enemyArt:   { [art]: EnemyArtDef },    // bosses and location-owned enemies (section 7.6)
  particles:  { [preset]: [layer, ...] }, // core/particles.js registerPreset(name, ...layers), POC layer format
};
// enemyart.js
export default { [art]: EnemyArtDef };   // regular enemies (bestiary task)
// props.js
export default { 'shoals.icePillar': { textures: ['sh_ice_wall'], sprites: [], build(W, p) { ... } } };
// arena.js
export default { shoals: { textures: ['sh_ice_floor'], theme: { ... }, build(kit) { ... }, react(kit, event) { ... } } };
// fx.js
export default { 'maw.ice_breath': async (d, act) => { ... }, 'maw.defeat': async (d, act) => { ... } };   // 7.4
```

### 2.6 Registry (S2b: `src/content/registry.js`)

```js
export const REG = {
  locations: {}, maps: {}, scripts: {}, scenes: [], objectives: {}, speakers: {}, destinations: [],
  jumps: {}, doneFlags: {}, preload: {}, recaps: {}, partyTalks: {}, tips: {}, companions: {},
  extends: {}, credits: [], newJourney: null, zoneRates: {}, shops: {}, kits: {}, props: {}, arenas: {},
  actionFx: {},
};
export function registerData(pure)        // PURE path: merges data + story + maps (no art)
export function registerLocation(loc)     // registerData(loc) + art, enemyArt, props, arenas, actionFx (browser)
export function registerAllData()         // content/data.js: every pure.js, then applyBalance()
export function registerAll()             // content/index.js: every index.js, then applyBalance()
export function getMap(id) -> MapDef      // normalized (world/mapdef.js) with every `extends` merged; cached
export function locationOfMap(mapId) -> locId
export function locationOfArt(kind, key) -> locId | 'core'   // for the art cache (11.5)
```

Registering the same location object again is a no-op, and `registerAll()` / `registerAllData()` are
idempotent, so `main.js` and preview pages may both call them. A different object with an id already
taken throws `Error('content: duplicate <table> id "<id>" (<locA> vs <locB>)')`.

How systems consume content:

| Content | Merged into | Consumer |
|---|---|---|
| `data.enemies`, `encounters`, `items` | the exported objects `ENEMIES`, `ENCOUNTERS`, `ITEMS` of `battle/data.js`, **in place** (`Object.assign`) | BattleModel, UI, state |
| `data.zones` | `ENCOUNTER_TABLES` in place | ExploreState |
| `data.zoneRates`, `shops`, `kits` | `REG.zoneRates`, `REG.shops`, `REG.kits` | ExploreState, ui.shop, jumpTo |
| party skills | not content: they live in `SKILLS` of `battle/data.js` (S3, section 5.4) | BattleModel, progression |
| `data.bossScripts` | `BOSS_SCRIPTS` of `battle/scripts.js` | BattleModel |
| `story.*` | `REG.*` | story, cutscenes, travel, UI, scriptcheck |
| `art.textures` | `registerTexture` (art/tiles.js) | world, arenas |
| `art.characters` | `registerCharacter` (art/characters.js) | NPC actors, portraits |
| `art.enemyArt`, `enemyArt` | `registerEnemyArt` (art/enemies.js) | battle stage, field bosses |
| `art.particles` | `registerPreset` (core/particles.js) | world, arenas |
| `props` | `registerProp` (world/props.js) | World |
| `arenas` | `registerArena` (battle/arena.js) | BattleStage |
| `actionFx` | `registerActionFx` (battle/actionfx.js) | Director |
| `story.speakers` | `ui.registerSpeaker` (done by main.js after UI exists) | dialog |

Merging in place keeps every existing import working (`ENEMIES` from `battle/data.js` is still the
table the model reads). The unit tests never call a register function, so `battle/data.js` alone still
holds exactly the POC data they pin.

**Import direction.** `content/balance.js` imports only `battle/data.js`; it exports `applyBalance()`,
which mutates `BATTLE_RULES`, `ENEMIES` and the zone-rate defaults in place. The registry imports
balance; `battle/model.js` imports only `battle/data.js` and `battle/scripts.js`, never anything under
`content/`. `world/cond.js` imports nothing: `content/chapters.js` calls `setChapterOrder(ids)` on it.

**`extends` merge order.** `getMap(id)` merges every location's `extends[id]`. Arrays (`npcs`,
`triggers`, ...) append in chapter order. `talk` entries are prepended to the NPC's TalkSpec sorted by
the adding location's chapter, latest chapter first (ties by location id), and first match wins.
Every `extends` trigger, NPC and talk entry must have a chapter-bounded `when` (one that contains a
`chapter` or `story:` term); `tests/content.test.mjs` enforces it.

### 2.7 Naming rules and flags

- Map ids, enemy kinds, item ids, encounter ids, zone ids, shop ids: globally unique, `snake_case`.
- Encounter and zone ids start with the location code: `pro_`, `dm_`, `shoals_`/`meridian_`, `arb_`,
  `spire_`, `vault_`, `heart_` (also the `warden` folder: `heart_boss_warden`), `dream_`, `epi_`,
  `dev_`.
  Texture names: `pro_`, `dm_`, `sh_`, `arb_`, `sp_`, `va_`, `hr_`, `dr_`, `wd_`, `ep_`; backdrops
  `bd_<name>`. Script ids: `<loc>.<name>`. Prop types and fx ids: `<loc>.<name>` (boss fx
  `<boss>.<move>`, defeat `<boss>.defeat`). Interactable, NPC, trigger ids: unique per map; ids added
  through `extends` start with the adding location's code (`dm.coil_socket`).
- Flags (all in `gameState.flags`, value `true` unless noted):

| Prefix | Meaning | Set by |
|---|---|---|
| `story:<beat>` | story beats (binding list in 4.1) | scripts |
| `unlock:<destId>` | Starchart destination available | scripts |
| `dest:<destId>` | destination visited (Starchart "new" marker off) | travel |
| `defeated:<encounterId>` | boss victory | BattleModel |
| `ult:<memberId>` | ultimate awakened | boss scripts (`api.grantUltimate`), jumpTo |
| `chest:<map>:<id>` | chest opened | World |
| `sw:<map>:<id>` | switch / valve on | World |
| `shard:<map>:<id>` | memory crystal collected | World |
| `seen:<map>:<triggerId>` | once-trigger's script **completed** | cutscene runner |
| `talk:<map>:<npcId>` | talked at least once | ExploreState |
| `ptalk:<id>` | party talk completed | cutscene runner |
| `visited:<map>` | map entered once | ExploreState |
| `area:<map>:<areaId>` | area entered once (Map tab) | ExploreState |
| `tut:<key>` | tip shown | BattleState, scripts |
| `<loc>:<name>` | any location-local state | that location's scripts |

  The prefixes `item:`, `chapter`, `party:` and `leader:` are reserved for the condition language.
  The legacy `boss_defeated` flag is still set by the model (a unit test pins it) and no new code
  reads it.

### 2.8 Pinned by the POC tests (S3 and S4 read this before touching `battle/` or `core/state.js`)

- `battle/data.js` keeps exactly the POC key sets: `ENEMIES` = `drone crawler turret sentinel`,
  `ITEMS` = `medigel ether revive keycard`, the POC `ENCOUNTER_TABLES` keys, and the POC encounters'
  reward numbers. New content enters these objects only at registration.
- Every `SKILLS` entry, including new party skills and ultimates, passes "skills are well formed":
  `kind` in `attack heal buff debuff revive taunt`; `anim` in `slash thrust shot punch cast heal buff`;
  `target` in `enemy enemies randomEnemies ally allies self koAlly`; `cost > 0`; `desc` 11-79
  characters; attacks have `type` in `DAMAGE_TYPES`, `power > 0`, `hits >= 1`, `scale` in `atk mag`.
  Cut-ins, ultimates and bespoke choreography live in extra fields (`ultimate: true`, `fx: id`),
  never in new kinds or anims.
- `saveCheckpoint(pos)` / `loadCheckpoint()` round-trip deepEquals `{ x, z, facing }`: the copy gains
  `map` only when the caller passes one.
- `resetGame()` builds the four POC members with `PARTY_DEFS` levels and skills (no learnsets, no
  `campaign` flag) and mutates `gameState.party` in place.
- `applyRewards()` returns exactly the POC `levelUp` list for POC members; `learn` events come only
  from `campaign` members.
- The POC boss path (two actions, Lock-On then `annihilator_beam`, break cancels it, +2 max shield
  per break, Overcharge below 50%, `boss_defeated`) runs unchanged for the POC `sentinel` (7.1 AI
  dispatch). POC event types keep exactly their contract fields; base encounters consume `rng()`
  exactly as before.

### 2.9 POC rename table

| POC | Full game |
|---|---|
| `crate_<id>` flags | `chest:halcyon:<id>` |
| `bridge_unlocked` | `story:bridge_unlocked` |
| field encounter `boss_sentinel` | `pro_boss_sentinel` (`boss_sentinel` stays in `battle/data.js` for the tests and `debug.startBattle`) |
| `talked_bolt` | `talk:halcyon:bolt` |
| `rested` | dropped; Med-Station Restore sets the checkpoint (assert `checkpoint`) |
| `boss_defeated` | `defeated:<encounterId>` (legacy flag still set, never read) |
| "Proof of concept complete" screen | the Sentinel aftermath and the CH1 card |
| music `explore` after every battle | `explore.restoreMusic()` (area or map track) |
| `world/maps.js` `SPAWN`, `VIEWPOINTS`, `BOSS` | `content/prologue/maps/halcyon.js` (re-export shim until G1) |
| `world/script.js` lines | prologue scripts rewritten to WRITING.md (lore fixes in 12.2); not ported |
| POC zone ids | `pro_corridor`, `pro_engineering`, `pro_late` (C1) |

The `poc` jump (10.1) is the regression sandbox: in Wave S it is the `resetGame()` party at
`halcyon:start` with no flags. C1 redefines `REG.jumps.poc` as the `resetGame()` party plus every
prologue flag up to the bridge door (joins, rescue, squad and the `seen:` flags of those scenes), but
not `story:bridge_unlocked`, the keycard chest or `defeated:pro_boss_sentinel`.

---

## 3. Multi-map world (S1a, S1b)

### 3.1 MapDef (PURE)

The POC's `world/maps.js` becomes `src/content/prologue/maps/halcyon.js` in this format (S1a does
the conversion in Wave S without changing any coordinate; `world/maps.js` stays as a re-export shim
until G1). In Wave S the converted map keeps the POC lines inline (`poc: true`, see below) so the POC
stays playable; C1 replaces them with scripts. A MapDef is plain data; every field except `id`,
`name`, `grid`, `spawns` is optional.

```js
export default {
  id: 'halcyon',
  name: 'ISV Halcyon',                 // location banner + menu header
  region: 'Crew Decks',                // banner subtitle
  music: 'explore',                    // field track (areas may override)
  grid: [                              // rows of equal length, max 72 cols x 56 rows
    '#sWWWWs#',
    '#......#',
  ],
  legend: { },                         // char -> CellSpec, merged over DEFAULT_LEGEND (3.2)
  wallH: 3, lowH: 0.75,
  wallTex: { side: 'wall_panel', cap: 'wall_cap', low: 'wall_low' },
  grand: [{ row: 1, c0: 34, c1: 47, height: 6 }],             // taller wall runs (POC GRAND)
  dividers: [{ id: 'south', row: 17, rect: [0, 17, 34, 29] }],  // POC divider semantics
  areas: [ AreaDef ],                  // 3.4
  spawns: { start: { x: 6.55, z: 20.3, facing: 'down' } },   // + requires?: cond when it stands on a gate or drain cell
  anchors: { hub_stall: { x: 40.5, z: 12.5, facing: 'down' } }, // named staging spots for other owners (12.3)
  exits: [ ExitDef ],                  // 3.7
  props: [ PropEntry ],                // 3.3
  lights: [ LightDef ],                // POC LIGHTS format (virtual lights; tag, mode, on, decorative)
  ambient: [ AmbientDef ],             // POC AMBIENT format
  backdrop: { texture: 'space_backdrop', stars: 'stars_layer', tint: [1.05, 1.05, 1.1] },  // shown through windows
  sky: null,                           // open maps: camera-anchored vista (3.9)
  underlay: null,                      // pits: { texture, y: -5, repeat: [8, 8], scroll: [0.002, 0], color } plane under the map
  view: { pitch: 34, dist: 16 },       // default camera (3.10; POC values)
  npcs: [ NpcDef ],                    // 3.6
  chests: [ ChestDef ],                // 3.5
  interactables: [ InteractableDef ],  // 3.5
  triggers: [ TriggerDef ],            // 3.5
  gates: [ GateDef ],                  // 3.5
  bosses: [ FieldBossDef ],            // 3.6
  viewpoints: { cryo: { x: 6.6, z: 22.6, facing: 'down' } },   // debug.view(name), screenshots, visualLint
  fx: { tiltShift: { maxBlur: 1.25 } },                       // optional field post-FX overrides
  transit: false,     // true: travel-only map (moth): never autosaves, never sets the checkpoint
  scene: false,       // true: staged-scene map (dreams, exterior): arrivals run no triggers or encounters,
                      // never autosave or set the checkpoint, companions stay away
  companions: true,   // false: companions (BOLT) do not follow on this map
  poc: false,         // Wave S only: TalkSpecs may hold inline POC lines; G2 fails any map still marked
};
```

Coordinates follow CONTRACTS.md: cell (c, r) spans x c..c+1, z r..r+1, centre (c+0.5, r+0.5).

### 3.2 Cells and legend

`DEFAULT_LEGEND` reproduces the POC characters exactly: `' '` void, `#vsp` walls
(`wall_panel`, `wall_panel_vent`, `wall_panel_screen`, `wall_pipes`), `W` window pair, `D` door pair,
`L` locked door pair, `.` `,` `h` `g` `b` `c` floors. A CellSpec:

```js
{ t: 'wall',   tex: 'wall_panel', side?, cap?, low?, height? }
{ t: 'window', tex: 'window_frame', backdrop? }
{ t: 'door',   tex: 'door', lock?: { flag, item?, id, label? } }  // locked until `flag` (cond) is true; interacting
                                                            // with `item` held sets `flag`; `id` names the door interactable
{ t: 'floor',  tex, mix?: [[texName, chance]], grime?: 0.07, stripe?: true, gate?: gateId }
{ t: 'water',  tex, bank: 'arb_bank', depth: 0.35, drain?: cond, path?: texName }  // blocks movement;
                                                            // when `drain` is true the surface sinks and a
                                                            // walkway (`path` texture at y = 0) becomes walkable
{ t: 'pit',    edge: 'va_edge', thickness: 0.4 }            // impassable drop; neighbours get edge faces;
                                                            // map.underlay shows below
{ t: 'void' }
```

A floor cell with `gate` is walkable only while that gate is open (light bridges). Walls keep the POC
height rules (room to the south: full height, to the north: cutaway) and dividers.

`validateMap` enforces what the World builder can draw (world.js builds windows and doors only in
these shapes):
- `window`, `door` and locked-door cells come in horizontal pairs inside a wall row. Door leaves slide
  along x. East and west openings in a wall are plain gaps (floor cells), never doors.
- A window pair has floor directly south and void directly north (its space box is built there).
- Locked doors use `lock.id` for their interactable id (the POC `L` cell keeps `bridge_door`).
- Rows have equal length; at most 72 x 56; every spawn, anchor and viewpoint is inside the grid.

### 3.3 Props

`PropEntry = { t: '<type>', x, z, ...typeFields, on?: dividerId, when?: cond, id? }`.
Built-in types (S1b, `world/props.js`): every POC type (`pod bed crate locker console bench lamp sign
guide decal pipe vent alarm conduit med reactor holoTable chair`) plus:

| Type | Fields | Notes |
|---|---|---|
| `box` | `w d h y rot tex: { front, side, top }` | textured box; collider unless `solid: false` |
| `plane` | `w h y rot tex alpha` | vertical textured plane (plants, banners, signage) |
| `floorPlane` | `w d tex rot y` | flat overlay (rugs, puddles, light patterns) |
| `cylinder` | `r h tex arc emissive` | `wrappedCylinder` column |
| `sprite` | `sheet: 'npc:<id>' / 'enemy:<art>', anim, flipX, hologram, scale` | static decorative SpriteActor |
| `glow` | `color size intensity y` | makeGlow only |
| `screen` | `w h y rot tex group` | emissive screen; `world.setScreens(tex, group?)` swaps every screen (WARDEN's sigil, 4.2) |
| `pod` (POC, extended) | `+ id, status: cond, delay` | with `status` it is a LivingProp: its screen flips from REVIVAL DEFERRED to REVIVAL AUTHORIZED when `status` holds, staggered by `delay` |
| `guide` (POC, extended) | `+ from: [x, z], to: [x, z], color, link: switchId` | glowing floor strip; with `link` it lights up while that switch is on (puzzle readability, 11.8) |
| `chest` | (from `chests`) | POC supply crate, generalized (LivingProp) |
| `switch.panel`, `switch.valve`, `switch.lever` | (from `interactables` kind `switch`) | LivingProp with on/off animation |
| `gate.laser`, `gate.shutter`, `gate.bridge` | (from `gates`) | LivingProp: red laser grid, rising shutter, hard-light bridge |
| `shard` | (from `interactables` kind `shard`) | floating crystal, LivingProp (`setOpen(true)` = collected) |
| `starchart` | `x z` | holo table variant that pulses when a destination is new |

Registered types (content `props.js`): `registerProp(type, { build(W, p), textures?, sprites? })`.
`textures` and `sprites` list what the builder uses so prewarm can paint them. A builder may return a
**LivingProp** `{ setOpen?(open, instant), setState?(value, instant), update?(dt, t), dispose?() }`;
when the entry has an `id`, `W.living(id)` returns it and gates, chests, switches and shards drive it.

**World builder API** (stable for prop builders, `W` is the World):

```js
W.map, W.scene, W.root, W.particles, W.lighting, W.engine, W.anchors
W.mats.tile(name, { emissive, roughness, metalness, cast, receive, transparent, alphaTest, side, variant })
W.mats.decal(name); W.mats.plain(color, opts)
W.batchFor(on) -> Batch      // merged static geometry: quad/faceX/faceY/faceZ/box/geometry (world/geometry.js)
W.groupFor(on) -> THREE.Group
W.addBox(x, z, w, d) -> collider; W.addCircle(x, z, r) -> collider   // collider.enabled toggles
W.addInteractable(entry) -> entry
W.addEmitter(preset, opts, on) -> emitter
W.addGlow(sprite, x, z)       // links lamp glows to virtual lights (flicker dims them)
W.addUpdater(fn(dt, t)); W.addActor(spriteActor)
W.test(cond) -> bool          // condition language (3.11)
W.track(disposable)           // anything with dispose(): freed with the map
```

Everything a builder creates must be reachable from `W.scene` or passed to `W.track`, so
`World.dispose()` frees it. Builders take materials from `W.mats` (shared per World and released
through `programs.release`, 11.4).

### 3.4 Areas

POC AREAS format plus optional fields:

```js
{ id, name, subtitle, rect: [x0, z0, x1, z1], cam: [z0, z1], zone, ceiling, ceilingY, focus, mood,
  music?: trackId,                           // overrides map.music while inside
  zone?: 'arb_gardens' | [{ when: 'story:ch2_done', zone: null }, { zone: 'arb_gardens' }],  // first match
  view?: { pitch: 38, dist: 17 },            // camera override, lerped over 0.8 s (3.10)
  puzzle?: true,                             // no encounters here (11.8)
  banner?: false }                           // suppress the area banner
```

### 3.5 Chests, interactables, triggers, gates

```js
ChestDef = { id, x, z, item: 'medigel' | 'eq_w_nyx_3', n: 1, credits?: 0, prop?: 'chest', when?: cond }
//  flag chest:<map>:<id>; opened chests stay open (POC crate behaviour), toast 'Obtained ...'

InteractableDef = { id, kind, x, z, box?: [x0, z0, x1, z1], r?, reach?: 1.3, label, icon, when?: cond,
                    prop?: type, propFields?: {}, leader?: memberId, ...kindFields }
// kinds and their fields:
//   'terminal'  talk: TalkSpec              logs (scripts)
//   'inspect'   talk: TalkSpec              anything to examine
//   'med'       label?: 'Med-Station'       choice Restore / Save / Party Talk / Leave (Restore = heal +
//                                           checkpoint; Save = ui.saves save mode; Party Talk only while one is
//                                           available, with a '!' badge on the prompt, 4.5); inns use label 'Rest'
//   'shop'      shop: shopId                ui.shop.open(REG.shops[shop])
//   'starchart' (none)                      travel UI (section 4.7); one at every Moth berth
//   'switch'    flag: 'sw:spire:grid_a', mode: 'toggle' | 'once', script?: id, sfx?: 'valve',
//               reveal?: gateId             the camera pans to that gate while it opens, then back (11.8)
//   'shard'     flag: 'shard:vault:a', script: id   (collect -> script)
//   'exit'      to: { map, spawn }, transition?   (ladders, hatches, interfaces)
//   'lift'      to: spawnId (same map), label     camera rises, light streams fall, no save (3.7)
//   'door'      (generated by locked door cells)
//   'boss'      (generated by FieldBossDef)
// leader: only that traveler can use it (Nyx cracks a lockbox, Orion coaxes a terminal, Sera treats a
// wounded NPC, Kade uses a security override). With another leader the prompt still shows and runs
// 'common.leader_hint' with { member } ("Nyx could open this."). Every map has one (12.4).
TalkSpec = scriptId | [{ when?: cond, script: id }, ...]   // first match wins
```

`normalizeMap` converts every TalkSpec to the entry-list form: a string becomes `[{ script }]`; an
array whose elements are strings or objects with `text` is a legacy line list and becomes
`[{ lines }]`. Legacy lines are allowed only on maps with `poc: true` and in `dev`;
`tests/content.test.mjs` fails on any other.

```js
TriggerDef = { id, on: 'enter' | 'load' | 'flag', rect?: [x0, z0, x1, z1], area?: areaId, when?: cond,
               once?: true, script: scriptId }
GateDef = { id, cells?: [[c, r], ...], rect?: [c0, r0, c1, r1], open: cond, prop: 'gate.laser', propFields?: {} }
// closed gates block their cells; World.syncFlags() re-evaluates `open` and calls living.setOpen(open)
```

Trigger rules (S1a):
- `enter` is edge-triggered: it fires when the leader moves from outside to inside the rect or area
  while `when` holds. After any teleport, arrival, respawn or script end the inside/outside state is
  re-seeded without firing.
- `load` fires once the fade-in of an arrival ends, for the arrivals listed in 3.7 (never after
  `cs.goto`, never on scene or transit maps).
- `flag` fires as soon as `when` becomes true while this map is loaded, checked after every flag
  change, arrival, battle return and script end.
- Triggers never fire during cutscenes, battles, travel or menus. A trigger that becomes due then is
  pending: it fires when the blocking activity ends, **on the same map only**. Every map change
  discards the pending list.
- `once` triggers set `seen:<map>:<id>` when their script **completes normally** (4.2). A script that
  is aborted (game over, error) leaves the trigger armed, so Retry replays it.
- Every story trigger's `when` contains a `story:` or `chapter` term, not only `seen:` terms, so jumps
  and later chapters cannot replay it (content lint, 10.3).

### 3.6 NPC actors, companions, field bosses, acting

```js
NpcDef = { id, sprite: 'bolt' | 'holo' | 'sera' | 'ruse' | ..., x, z, facing: 'down', name: 'BOLT',
           talk?: TalkSpec, when?: cond, hologram?: false, shadow?: true, scale?: 1, pose?: poseName,
           idle?: { anim?: 'idle_down', path?: [[x, z], ...], speed?: 1.4, pause?: [1, 3], loop?: true } }
FieldBossDef = { id, art: 'sentinel', x, z, facing?: 'right', encounter: 'pro_boss_sentinel',
                 script?: id, triggerRadius: 3.4, when?: cond /* default '!defeated:<encounter>' */,
                 focus?: true, light?: lightTag }
// a boss confronts the party when the leader comes within triggerRadius (POC SENTINEL behaviour);
// with `script` the script runs (it must call cs.battle), else the battle starts directly. Scripts
// address the field boss by its id. Because the script touched it, it stays visible after the
// battle until the aftermath script ends (3.8), so the aftermath can stage it (the Maw sinks, Voss
// kneels) before it fades or the script despawns it.
```

`sprite` resolves to `buildFieldSprite(id)` for party ids and registered characters, and to
`buildNpcSprite(kind)` for `bolt`, `holo`. NPCs face the leader while talked to, then return to their
idle. `src/world/actors.js` (S1b):

```js
export class NpcActor {
  constructor(world, def)
  id; def; actor /* SpriteActor */; x; z; facing; visible
  face(dirOrPoint)                       // 'up'|'down'|'left'|'right' or { x, z }
  play(anim)                              // any sheet anim or pose; idle_<dir> by default
  walkTo(points, { speed = 2.4, run = false }) -> Promise   // [[x, z], ...]; walk anim, collision ignored
  setVisible(on, { fade = 0 }) -> Promise
  update(dt, t); dispose()
}
```

**Companions.** `REG.companions` (common) defines followers; BOLT is the only one. On every map with
`companions !== false` and while `follow` holds, ExploreState spawns the companion near the leader;
it trails the leader's recent path at about 1.4 units, hovers, never blocks movement and never
triggers anything. It is talkable (`talk: 'common.bolt_talk'`, which says the current objective's
`boltHint`), and scripts address it as `bolt`. BOLT follows everywhere except `moth`, `exterior` and
`dreams`; a script may park him (`story:bolt_away`).

**Acting.** S1b gives the four travelers' field sheets these poses, each with a down and a side view
(the side view flips): `kneel`, `look_up`, `arms_crossed`, `hand_to_chest`, `collapse` (lying, also
used for sleep), `point`. `cs.anim(id, pose)` holds a pose until the next move or `cs.anim(id, null)`.
Portraits gain expressions `neutral`, `smile`, `sad`, `determined`, `surprised` for `kade`, `nyx`,
`orion`, `sera` (S1b) and for `voss`, `ruse`, `theo` (their owners); BOLT gets eye variants `happy`,
`worried`, `determined`, and HALCYON `calm`, `flicker`. A portrait id may carry an expression:
`'sera:sad'`. An unknown expression falls back to neutral with `console.warn`.

The player stays `world/player.js` (`Player`), plus `player.setCharacter(id)` for leader switching.

### 3.7 Transitions, spawns, lifecycle

```js
ExitDef = { id, rect: [x0, z0, x1, z1], to: { map, spawn }, when?: cond, auto?: true,
            transition?: 'fade' | 'iris' | 'none', label?: 'Board the Moth' }
// auto exits fire when the leader's centre enters rect (walk through a door, off the edge of a dock)
```

Map change (S2a `travel.arrive`, S1a `ExploreState.loadMap`):

1. `explore.lock('travel')`; the leader stops; prompts hide; pending triggers are discarded.
2. `engine.transition(transition, { duration: 0.9, onMidpoint })`. `onMidpoint` returns a promise and
   the cover holds until it settles: `await prewarmLocation(locOf(map))` (no-op when warm), then
   `await explore.loadMap(map, spawn)`, which:
   1. builds the new `World` (leader placed at the spawn with its facing, camera snapped);
   2. attaches the persistent lighting rig to the new scene (below);
   3. `await engine.compileScene(newWorld.scene, camera)` (11.4);
   4. switches the view to the new scene;
   5. disposes the old World, releasing materials through `programs.release`.
3. After the fade-in: location banner when the map changed, `visited:` and `area:` flags, then the
   arrival rules below, then `explore.unlock('travel')`.

| Arrival (first matching row wins) | `load` triggers | autosave | checkpoint + snapshot | encounter grace |
|---|---|---|---|---|
| on a scene or transit map (`scene`, `transit`), or `cs.goto(..., { scene: true })` | no | no | no | encounters off |
| lift, same-map `goto`, teleport | no | no | no | restarts |
| `cs.goto` | no | no (the script may queue one, 6.2) | no | restarts |
| Continue, Load, Retry respawn | yes | no (state just came from a save) | kept | restarts |
| exit, Starchart travel, New Journey | yes | yes | yes | restarts |

An arrival never autosaves or sets the checkpoint while a cutscene is active; those requests wait for
the outermost script to end (6.2). Travelling to the current map teleports under the cover without a
rebuild. A spawn may be `{ x, z, facing }` instead of an id.

**Persistent lighting rig.** ExploreState owns one `Lighting` for its whole life (S1a refactors
`world/lighting.js`): hemisphere, key directional with shadow, fill, hero point light, field spot,
the point-light pool and FogExp2. `rig.attach(scene, lightDefs, mood)` re-parents those lights into
the new scene, rebinds the virtual lights and sets the mood; the World never creates or disposes
lights. Every map therefore has the same light set, so the same shader programs, and no map leaks a
shadow map. Light counts depend only on the quality tier (11.6).

**Disposal is mandatory.** `World.dispose()` frees every geometry, every material (through
`programs.release`), every texture those materials hold (map, normalMap, emissiveMap; the POC
`World.dispose` skips these), InstancedMeshes, flickers, emitters, Particles, SpriteActors (and their
glow sheet references), NpcActors, LivingProps and tracked objects. Painted canvases live in the art
cache (11.5), which decides when they are dropped.

### 3.8 Per-map persistent state

Only flags persist (section 2.7). `World.syncFlags()` re-applies chests, locked doors, gates, water
drains, switch states, pod states, NPC and boss presence (`when`), and light tags after every map
load, battle return, respawn and flag change (`story.set` notifies the explore state).

Actors that the running script has touched (moved, faced, animated, spoken for, battled) are exempt
from `when` checks until the outermost script ends; then any whose `when` no longer holds fades out
over 0.3 s instead of popping. NPC presence changes outside scripts also fade over 0.3 s.

### 3.9 Backdrops, sky and underlay (S1b `world/sky.js`, `world/water.js`)

Windows show `map.backdrop` (or the window cell's `backdrop`), built like the POC space boxes (painted
1024x512 backdrop + additive stars + hull box + light shafts).

Open maps use `map.sky = { texture, stars?, horizonV: 0.6, edge: 'north', parallax: 0.12, tint }`.
The field camera's top ray is 19 degrees below the horizontal at the default pitch, so a world-fixed
horizon plane would never be seen; the sky is a **camera-anchored vista** like the arena `space()`
backdrop: a plane parented to the camera at depth 120 (camera far is 140), sized to cover the
frustum, `fog: false`, `depthWrite: false`, drawn first, so map geometry covers it wherever there is
map. Each frame `sky.js` offsets the texture so its row `horizonV` sits on the screen line where the
map's far `edge` (y = 0) projects, and shifts it by `parallax` with the camera's x. It reads correctly
at the default pitch (the band beyond the far edge) and in low shots (`cs.camera.view`, about 12
degrees on the Ione shore), where more of it shows. `scene.background` stays the fog colour.

Pit maps use `map.underlay`, a world-fixed plane below the map (you look down into pits, so a fixed
plane works). Backdrops and skies are registered textures with `raw` painters (section 3.12).

### 3.10 Field camera (S1a `world/camera.js`)

FOV 30, pitch 34 degrees, distance 16 stay the defaults; `map.view` and `area.view` override pitch and
distance, lerped over 0.8 s. Portrait screens keep the POC pull-back.

```js
explore.camera.focus(target, { zoom = 1, ms = 800 }) -> Promise   // actor id, [x, z] or { x, z }
explore.camera.view({ pitch, dist, ms = 800 }) -> Promise         // until reset or the script ends
explore.camera.pan(points, { sec }) -> Promise                    // slow pans (credits, establishing shots)
explore.camera.reset({ ms = 600 }) -> Promise                     // back to follow mode with the area view
```

The shadow camera and the tilt-shift focus follow the camera's **look target**, not the leader, so
pans and focus shots stay sharp and keep their shadows.

### 3.11 Condition language (PURE `world/cond.js`, S1a)

```
cond  := or            or := and ('|' and)*        and := unary ('&' unary)*
unary := '!' unary | '(' or ')' | term
term  := FLAG                          // true when gameState.flags[FLAG] is truthy; FLAG = [A-Za-z0-9_:.-]+
       | 'item:' ID                    // inventory count > 0, or equipped by anyone
       | 'party:' MEMBER               // member in the active party
       | 'leader:' MEMBER
       | 'chapter>=' CHAPTER | 'chapter<' CHAPTER    // by the order given to setChapterOrder
```

```js
export function compileCond(src) -> (state) => bool     // cached by string; throws Error('cond: ...') on bad syntax
export function testCond(src, state = gameState) -> bool // undefined / '' -> true
export function setChapterOrder(ids)                      // content/chapters.js calls it; cond.js imports nothing
export function condFlags(src) -> string[]                // flags a condition reads (soft-lock lint, 10.3)
```

`tests/cond.test.mjs` covers precedence, negation, parentheses, every term kind, upper-case flags and
syntax errors.

### 3.12 Art registries used by the world (S1b)

```js
// art/tiles.js
registerTexture(name, TextureDef)
// TextureDef: { w, h, frames = 1, fps = 0, wrapX, wrapY, alpha, strength = 2.4, paint(t /* Tex */, frame) }
//          or { w, h, raw: () => Painter, emissiveIsMap: true }        (backdrops, skies, star layers)
export { Tex, fbm, vnoise, hash, engrave, seamGrime, grime, plateBase, tread, drawText, GLYPHS }  // paint helpers
// art/characters.js
registerCharacter(id, CharDef)    // CharDef = CHARS format { mats, build, style, hair, over } with optional
                                  // `base: 'nyx'` to inherit and override, `poses`, `expressions`;
                                  // or { custom: { field(view, kind, i, blink), portrait(expr) } }
hasCharacter(id); buildFieldSprite(id) and buildPortrait(id[:expr]) work for registered ids
// core/particles.js
registerPreset(name, ...layers)   // same layer format as PRESETS
```

**Fallbacks.** While Wave C runs in parallel, unknown art must not throw: an unknown texture paints a
magenta checker, an unknown character a tinted silhouette, an unknown enemy art a tinted `drone`
sheet scaled to the declared size (`buildEnemySprite`, `buildEnemyIcon`, `charDef` and the tile
builder all fall back), each with one `console.warn`. `debug.missingArt()` lists every fallback used;
it must be empty at G2, G3 and I1.

New built-in particle presets (S1b): `firefly` (slow glowing wanderers), `rain` (sprinkler streaks),
`drip`, `snow` (drifting ice crystals), `spore`, `petal`, `data` (rising cyan squares and bits),
`glitch` (magenta pixel bursts), `mote` (warm choir light), `ash`, `light_stream` (falling light for
lifts), `breath` (cold breath puffs). New world textures for emotes, the WARDEN sigil
(`warden_sigil`, shared by the Spire screens, the Choir pods and Warden's core) and generic props are
painted in `world/paint.js`.

### 3.13 World and Explore API

```js
// world/world.js (S1a)
export class World {
  constructor({ engine, map /* normalized MapDef */, state /* gameState */, rig /* Lighting */, onSound })
  map; scene; root; particles; lighting; npcs /* id -> NpcActor */; anchors
  areaAt(x, z); collide(p, r); solid(c, r); walkable(x, z)
  npc(id); spawnNpc(def) -> NpcActor; removeNpc(id); living(id)
  interactable(id); exitAt(x, z) -> ExitDef | null; triggersAt(x, z) -> TriggerDef[]
  syncFlags(); snap(px, pz); setQuality(q); setScreens(tex | null, group?)
  emote(target /* NpcActor | 'leader' | id */, kind, { ms = 1200 }) -> Promise
        // kinds: '!', '?', '...', 'note', 'heart', 'anger', 'sweat', 'idea', 'zzz'
        // a pixel-art bubble sprite above the head, lit by nothing (MeshBasic), sfx 'emote' (S1b emotes.js)
  update(dt, t, focus, player); dispose()
}
// world/explore.js (S1a)
export class ExploreState {
  enter({ map, spawn, resume, respawn })   // resume: back from battle; respawn: at gameState.checkpoint
  exit(); update(dt, t)
  loadMap(mapId, at /* spawnId | { x, z, facing } */) -> Promise   // call under a cover only (3.7)
  mapId; world; player; area; rig /* persistent Lighting */
  teleport(x, z, facing)
  lock(reason); unlock(reason); unlockAll(); get locked()   // a Set of reasons; movement and interaction
                                                             // are off while any reason is held
  setLeader(id)                                        // swaps the field sprite
  restoreMusic()                                       // area track, else map track
  fxOverride                                           // partial fx merged after the explore look every frame
  camera                                               // 3.10
  interact(id) -> Promise                              // debug: run an interactable/npc/chest by id
  debugInfo                                            // { map, area, x, z, danger }
}
export function prewarmMap(mapId) -> Promise           // paints every texture/sprite the map itself needs, one job per macrotask
```

`enter()` never clears locks. `enter({ resume })` while `ctx.cutscenes.active` only rebinds the view
and the explore look: it leaves the input context, the music, the HUD and the locks to the running
script. Outside a script it restores the input context, the HUD and `restoreMusic()`.

ExploreState pushes its tilt-shift values every frame and its mood (bloom, exposure, saturation) on
mood changes, then merges `fxOverride` on top, so script effects (`cs.fx`, `cs.memory`, speaker moods)
last until the runner clears the override.

Interaction dispatch, encounter rolls (POC Rayleigh hazard with `zoneRates`), the danger gauge,
banners and the field camera keep the POC behaviour. Talk, terminal, shard, switch and boss scripts
run through `ctx.cutscenes.run(id, args)`.

---

## 4. Story, cutscenes and game flow (S2a)

### 4.1 Story state, chapters, flags

```js
gameState.story = { chapter: 'prologue', objective: 'pro.wake', done: [] }   // done: objective ids

// src/content/chapters.js (PURE, S2b)
export const CHAPTERS = [
  { id: 'prologue', kicker: 'PROLOGUE',      title: 'WAKING',    traveler: null,    levels: [1, 7] },
  { id: 'ch1',      kicker: 'CHAPTER ONE',   title: 'RINGBORN',  traveler: 'nyx',   levels: [7, 12] },
  { id: 'ch2',      kicker: 'CHAPTER TWO',   title: 'THE CHOIR', traveler: 'sera',  levels: [12, 17] },
  { id: 'ch3',      kicker: 'CHAPTER THREE', title: 'THE OATH',  traveler: 'kade',  levels: [17, 22] },
  { id: 'ch4',      kicker: 'CHAPTER FOUR',  title: 'ECHOES',    traveler: 'orion', levels: [22, 27] },
  { id: 'finale',   kicker: 'FINAL CHAPTER', title: 'VOIDPATH',  traveler: null,    levels: [27, 32] },
  { id: 'epilogue', kicker: 'EPILOGUE',      title: 'IONE',      traveler: null,    levels: [32, 32] },
];
export const CHAPTER_START = {      // where each chapter begins (jumpTo, journal)
  prologue: { map: 'halcyon', spawn: 'start',            party: ['kade'],  objective: 'pro.wake' },
  ch1:      { map: 'halcyon', spawn: 'bridge_starchart', party: 'all',     objective: 'ch1.go_driftmarket' },
  ch2:      { map: 'halcyon', spawn: 'bridge_starchart', party: 'all',     objective: 'ch2.go_arboretum' },
  ch3:      { map: 'halcyon', spawn: 'bridge_starchart', party: 'all',     objective: 'ch3.go_spire' },
  ch4:      { map: 'spire',   spawn: 'antechamber',      party: 'all',     objective: 'ch4.dive' },
  finale:   { map: 'halcyon', spawn: 'bridge_starchart', party: 'all',     objective: 'fin.go_heart' },
  epilogue: { map: 'halcyon', spawn: 'cryo',             party: 'all',     objective: 'epi.wake' },
};   // 'all' = ['kade', 'sera', 'orion', 'nyx'] (join order = default formation)
export const CHAPTER_FLAGS = {      // binding beats guaranteed once the chapter is complete (cumulative for jumps)
  prologue: ['story:kade_awake', 'story:sera_joined', 'story:orion_joined', 'story:nyx_joined',
             'story:bridge_unlocked', 'defeated:pro_boss_sentinel', 'story:halcyon_fragment',
             'unlock:driftmarket', 'story:prologue_done'],
  ch1:      ['story:ruse_met', 'story:maw_lore', 'story:varo_log', 'story:meridian_power',
             'defeated:shoals_boss_maw', 'ult:nyx', 'story:ringborn_seeding', 'story:nyx_for_real',
             'story:coil_installed', 'story:warden_speaks', 'unlock:arboretum', 'story:ch1_done'],
  ch2:      ['story:channels_drained', 'defeated:arb_boss_gardener', 'ult:sera', 'story:theo_found',
             'unlock:spire', 'story:ch2_done'],
  ch3:      ['story:cadets_freed', 'defeated:spire_boss_voss', 'ult:kade', 'story:flare_report',
             'story:core_open', 'story:ch3_done'],
  ch4:      ['story:memory_launch', 'story:memory_lullaby', 'story:memory_severance', 'story:bolt_seed',
             'defeated:vault_boss_echo', 'ult:orion', 'story:halcyon_restored', 'story:ione_revealed',
             'unlock:heart', 'story:ch4_done'],
  finale:   ['story:dream_kade', 'story:dream_nyx', 'story:dream_orion', 'story:dream_sera',
             'defeated:heart_boss_warden', 'story:warden_merged', 'story:finale_done'],
  epilogue: ['story:revival_authorized', 'story:game_clear', 'unlock:ione'],
};
```

`CHAPTER_FLAGS` holds the beats other owners depend on. Each location also exports
`story.doneFlags[chapter]`: every local and `seen:`/`talk:`/`tut:` flag that playing its part of that
chapter leaves behind (including the `tut:` flags of tips its battles show), so a jump state matches
real play and Driftmarket does not replay its ch1 arrival after `jumpTo('ch2')`.

Chapter boundaries (who plays the card, and where the next chapter starts). Cross-owner script ids
in this table are binding:

| Ends | Script owner | Card plays on | Next chapter starts at |
|---|---|---|---|
| prologue | prologue (Sentinel aftermath) | `halcyon` bridge | `halcyon:bridge_starchart` |
| ch1 | shoals' Maw aftermath `cs.goto('driftmarket', 'dock')` then `cs.run('driftmarket.return')`; the coil install `driftmarket.coil_install` runs from `extends.halcyon` (engineering) | `halcyon` engineering, then `goto` bridge | `halcyon:bridge_starchart` |
| ch2 | arboretum | choir chamber, then `goto` bridge | `halcyon:bridge_starchart` |
| ch3 | spire | command deck, then `goto` antechamber | `spire:antechamber` |
| ch4 | vault | vault core, then `goto` bridge | `halcyon:bridge_starchart` |
| finale | dreams (`dreams.crown`, triggered at the heart crown) | heart crown (EPILOGUE card) | `halcyon:cryo` |

Each card call sets the chapter, so `story.chapter` changes exactly at the card, and makes the new
chapter's traveler the leader (finale and epilogue keep the current leader). Objective ids in
`CHAPTER_START` are binding (the owning location defines their text).

```js
// src/story/story.js
export const story = {
  get chapter(); get objective();
  test(cond) -> bool; flag(name) -> bool;
  set(name, value = true)           // sets the flag, grants flag-gated skills (progression.learnFromFlags,
                                     // toast per learned skill), notifies explore (syncFlags, flag triggers)
  setChapter(id); setObjective(id)  // setObjective marks the previous objective done, toasts the new one
  played(scriptId) -> bool          // completed at least once (gameState.played)
  journal() -> { chapter: CHAPTERS[i], objective: { id, text, hint } | null, side: [{ id, text }],
                 done: [{ id, text }], recaps: [{ chapter, title, text }],
                 chapters: [{ id, kicker, title, state: 'done' | 'current' | 'locked' }] }
  onChange(fn) -> unsubscribe
};
```

### 4.2 Cutscene runner (`src/story/cutscene.js`)

```js
export class CutsceneRunner {
  constructor(ctx)
  run(scriptIdOrFn, args) -> Promise     // top-level entry for triggers, talk, interactables and game flows;
                                         // resolves when the script ends. While a script is active it reports
                                         // console.error('cutscenes.run while a script is active: use cs.run')
                                         // and rejects; nested scripts always go through cs.run.
  get active() -> bool; get depth() -> number
  abortAll()                             // see below
  fast                                   // debug.skip: dialog auto-advances, waits x0.05, walks x6, tweens instant
}
```

Nothing is queued: triggers and talk are suspended while a script runs (pending triggers wait,
3.5), and nested work (`cs.run`, travel flights, shop and Starchart calls) runs inside the current
script. That removes the deadlock where an outer script waits for a flight queued behind itself.

**While the outermost script runs:** explore lock `'cutscene'`, `ui.menuEnabled = false`, prompt and
danger gauge hidden, encounters and triggers suspended, input context `'dialog'`, and saves and
checkpoint requests are queued (6.2).

**When it ends normally:** the triggering once-trigger's `seen:` flag (or the party talk's `ptalk:`
flag) is set; the outermost script id and every nested id join `gameState.played`; queued checkpoint
and save requests are applied at the leader's position (6.2); the camera returns to follow mode; the
letterbox goes off; `explore.fxOverride` is cleared; a leader forced with `cs.scene` is restored;
touched actors are released (3.8); the music is restored with `explore.restoreMusic()` if the script
changed it; locks are released; then pending flag triggers are checked.

**`abortAll()`** (called by game over, Retry, Load, Title and New Journey): every pending `cs` call
rejects with an `AbortError` that the runner swallows; no `seen:`/`ptalk:` flags are set; queued saves
are dropped; every explore lock, the letterbox, `ui.menuEnabled`, `fxOverride`, actor exemptions and
any open dialog are released. A script error is logged with `console.error`, rethrown asynchronously
(it shows in `#vp-fatal`) and cleaned up the same way.

**Player skip.** Holding Cancel for 1 s during a script the player has already completed
(`story.played`) switches the rest of that script to instant mode: dialog and narration resolve at
once, waits are zero, moves teleport to their end, camera moves snap, fades, cards and emotes take at
most 0.3 s. Choices are still asked and `cs.battle` is never skipped. The HUD shows "Hold to skip"
after 0.4 s of holding. After a Retry, the script that started the lost battle runs in instant mode
up to its first `cs.battle` automatically.

**Leader handling.** Scripts never assume who leads. `cs.actor(id)` for a party member resolves to
the leader's sprite when `id === gameState.leader`, and `'leader'` always means the leader.
`cs.gather(layout)`: a listed leader walks to its slot; every other listed member steps out of the
leader and walks to its slot; unlisted members stay hidden. `cs.scene({ leader: 'kade' })` makes Kade
the leader for the rest of the script and restores the previous leader when it ends (`cs.setLeader`
is the permanent version).

**Staging checks.** `cs.say` for a party speaker (KADE, NYX, ORION, SERA) whose actor is not visible
on screen reports `console.error` unless the line has `{ offscreen: true }` (radio, voice in the
dream). Speakers with a `mood` (WARDEN, 8.5) apply that mood while their consecutive lines are shown:
a soft-gold `fxOverride` grade and `world.setScreens('warden_sigil')`, both reverted after the last
line.

### 4.3 The `cs` API

Every method returns a Promise unless marked sync. Lines are at most 100 visible characters (11.7).

```js
// dialogue
cs.say(lines)                         // ui.dialog.show(lines); Line = { speaker, text, portrait?, expr?, offscreen?, tag? } | string
cs.say(speaker, text, { expr, offscreen })            // expr: 'sad' -> portrait '<speaker portrait>:sad'
cs.narrate(text)                      // italic narration box (speaker null)
cs.choice(prompt, options, { speaker, expr, cancelIndex }) -> index
cs.wait(sec)
// scene
cs.scene({ leader }) (sync)           // force a leader for this script (restored at the end)
// actors: id = NPC id, field boss id, party member id, 'leader', 'bolt', or a handle from spawn()
cs.actor(id) -> handle | null                        (sync)
cs.spawn(id, { sprite, x, z, facing, hologram, fade = 0.3, name, pose }) -> handle
cs.despawn(id, { fade = 0.4 })
cs.move(id, path, { speed = 2.4, run = false, face })  // path: [[x, z], ...] or { x, z } or an anchor name
cs.face(id, dirOrTarget)                             (sync)
cs.anim(id, nameOrPose | null)                       (sync)  // sheet anim or pose (3.6); null = idle
cs.emote(id, kind, { ms = 1200, wait = true })
cs.gather(layout)          // { kade: [x, z], sera: [x, z] } (4.2 leader handling)
cs.ungather()              // members walk back into the leader and vanish
// camera and screen
cs.camera.focus(target, { zoom = 1, ms = 800 })     // target: id | [x, z]; zoom < 1 = closer
cs.camera.view({ pitch, dist, ms = 800 })           // low or steep shots (Ione dawn about 12 degrees)
cs.camera.pan(points, { sec })
cs.camera.reset({ ms = 600 })
cs.letterbox(on)                                     // ui.hud.letterbox
cs.fadeOut({ ms = 600, color = '#000' }); cs.fadeIn({ ms = 600 })
cs.flash(color, sec, strength) (sync); cs.shake(intensity, sec) (sync)
cs.fx(partialFx) (sync)                              // explore.fxOverride until the script ends
cs.memory(on) (sync)                                 // memory-scene look (cyan-violet grade + scanlines) via fxOverride
cs.screens(tex | null, group?) (sync)                // world.setScreens until the script ends
cs.card(chapterId)                                   // chapter card (8.5) + sting + setChapter + traveler leads
                                                     // + queued checkpoint and autosave (6.2)
cs.banner(name, subtitle)
cs.caption(text, { ms = 2500 })                      // centred caption ("En route", cut fallbacks)
// audio
cs.music(track | null | 'map', { fade, restart }) (sync); cs.sfx(name, opts) (sync)
// state
cs.flag(name, value = true) (sync); cs.test(cond) (sync)
cs.objective(id) (sync); cs.chapter(id) (sync)
cs.give(itemId, n = 1, { toast = true }); cs.take(itemId, n = 1) (sync); cs.credits(n) (sync)
cs.join(memberId, { level }); cs.leave(memberId)      // party toast, field sprite update
cs.setLeader(id); cs.heal()
cs.checkpoint() (sync); cs.save() (sync)              // queued until the outermost script ends (6.2)
// flow
cs.battle(encounterId, { allowDefeat = false, canFlee = false, seed }) -> 'victory' | 'defeat' | 'fled'
              // waits until no transition runs, then game.startBattle; resolves after the field has faded back in
cs.goto(mapId, spawn, { transition = 'fade', scene = false })   // the script keeps running on the new map;
              // scene: no triggers, encounters, autosave or checkpoint (dreams, vignettes)
cs.shop(shopId); cs.travel(destId?)                   // Starchart (or go to destId) from inside the script
cs.run(scriptId, args)                                // nested script, same lock and cleanup scope
cs.ending()                                           // writes any queued save at the leader's position first, then
                                                      // game.finish(): credits, THE END, stats, then shore or title
// world
cs.light(tag, { on, color, intensity }) (sync); cs.particles(preset, [x, y, z], opts) (sync)
cs.prop(id) -> LivingProp | null (sync)
```

### 4.4 Game flow (S2a `core/game.js`)

```js
game.newJourney()                 // abortAll; newGame(); iris to REG.newJourney's map and spawn (default
                                  // CHAPTER_START.prologue), then cutscenes.run(REG.newJourney.script) when set
                                  // (C1: cold open on `exterior`, PROLOGUE card, goto halcyon:start, BOLT)
game.continue(); game.load(slot)  // abortAll; deserialize; arrive at pos (3.7 arrival rules)
game.startBattle(encounterId, { allowDefeat = false, canFlee, rng, boss }) -> Promise<'victory' | 'defeat' | 'fled'>
game.retry(); game.toTitle()      // both abortAll first
game.finish() -> Promise          // credits, THE END, stats; then "Return to Ione" (the post-game shore) or Title
```

`startBattle`:
- If a transition is running it waits for it to end, then shatters. If a battle is already running
  it reports `console.error` and rejects.
- `onMidpoint` builds the BattleState and `await engine.compileScene(stage.scene, stage.camera)`
  before the cover lifts (11.4).
- **BattleState owns battle music** (`encounter.music`, then `phaseMusic`). game.js never calls
  `audio.music` for a battle (the POC line that overrode `final_boss` is deleted).
- `canFlee` defaults to the encounter's value for random battles; `cs.battle` passes `false` unless
  the script says otherwise.
- Victory or escape: fade back, `explore.enter({ resume: true })`; outside a script also
  `explore.restoreMusic()`. The promise resolves **after** the fade-in completes, so a script never
  continues while the battle is on screen.
- Defeat with `allowDefeat`: KO'd members return at 1 HP, then the same path; resolves `'defeat'`.
- Defeat otherwise: game over (below). The POC ending path (`_complete()`, "Proof of concept
  complete", the hard-coded `title`/`explore` music after a boss) is deleted; nothing reads
  `boss_defeated`.

**Game over** offers Retry, Load and Title (`ui.screens.gameOver`), plus **Retry from the second
form** when the encounter has `retryPhase` and its transform happened. That option restores party
HP, EP and inventory to their values at the start of the lost battle and starts `retryPhase.encounter`
directly; the script's pending `cs.battle` promise stays pending and resolves with that battle's
result. Every other option calls `abortAll()` first.

**Retry** restores the in-memory checkpoint snapshot (6.2) with `deserialize`, keeping the current
`stats` and `played`, heals the party, respawns at the checkpoint and marks the script that started
the lost battle for automatic skip (4.2). Because once-triggers only set `seen:` on completion and
the snapshot predates the battle, a lost scripted battle can always be replayed (Orion's rescue, the
Sentinel squad, every boss). Before the first checkpoint exists, Retry restarts the New Journey.

**Title.** Continue (when `latestSlot()` exists), New Journey, Load, Controls, Sound. After a clear
(`voidpath.cleared` in localStorage, wrapped in try/catch; else the latest save's `summary.cleared`)
the title diorama shows the Ione dawn (`bd_ione_dawn`, painted at boot only then) through its window.

### 4.5 Wiring

- NPC talk, `terminal`/`inspect` TalkSpecs, `shard`, `switch`, `lift` scripts, triggers and field
  bosses all resolve to `cutscenes.run(id, args)`. Scripts read `args.npc`, `args.interactable`,
  `args.trigger` or `args.member`.
- Party NPCs (Sera in her pod, Orion behind the shutters, Nyx at the door) are ordinary NpcDefs with
  `sprite: 'sera'` etc. and a `when` that hides them after they join.
- Hub dialogue per chapter (BOLT, HALCYON on the bridge) uses TalkSpec entry lists; every chapter
  owner prepends its own entries through `extends.halcyon.talk` with chapter-bounded `when`s (2.6).
- `common.bolt_talk` (C1) has BOLT say the current objective's `boltHint` in his voice, with a
  fallback line per chapter. `common.leader_hint` names the traveler an interactable needs.
- **Party Talk.** `REG.partyTalks` lists optional two-person scenes (at most 10 boxes). A talk is
  available when its chapter is current, its members are in the party, its `when` holds and
  `ptalk:<id>` is unset. Med-Stations and inns then show a "!" badge on their prompt and add "Party
  Talk" to their choice, which lists the available titles. Two per chapter (12.4).
- **Objectives.** `story.setObjective` toasts the new objective; the location banner shows the current
  objective under the subtitle; the Map tab marks `objective.target`.

### 4.6 Worked example

```js
// src/content/prologue/maps/halcyon.js (excerpt)
npcs: [{ id: 'sera', sprite: 'sera', x: 9.6, z: 32.4, facing: 'down', name: 'SERA', when: '!story:sera_joined', pose: 'collapse' }],
triggers: [{ id: 'sera_wakes', on: 'enter', area: 'medbay', when: 'story:kade_awake & !story:sera_joined', once: true, script: 'prologue.sera_wakes' }],

// src/content/prologue/story.js (excerpt; text follows WRITING.md)
'prologue.sera_wakes': async (cs) => {
  cs.letterbox(true);
  cs.music(null, { fade: 1.5 });                         // staging device 1: the music falls away
  await cs.camera.focus('sera', { zoom: 0.82, ms: 900 }); // staging device 2: camera
  cs.anim('sera', null);
  await cs.emote('sera', '...');
  await cs.say('SERA', 'Pod... 2271. Where is he?', { expr: 'surprised' });
  await cs.move('leader', [[9.6, 33.8]], { speed: 2.2 });
  cs.face('leader', 'sera');
  cs.face('sera', 'leader');
  await cs.say([
    { speaker: 'KADE', text: 'Easy. You were under for 412 days.' },
    { speaker: 'SERA', text: 'Somebody forced my pod open. *Halfway*.', expr: 'determined' },
    { speaker: 'SERA', text: 'Pod 2271. My brother. If anything\'s happened to him...', expr: 'sad' },
  ]);
  const pick = await cs.choice('', ['We\'ll find him.', 'First we get off this deck.'], { speaker: 'KADE', cancelIndex: 1 });
  await cs.say('SERA', pick === 0 ? 'You\'d better mean that, Lieutenant.' : 'Fine. Then walk faster.');
  await cs.join('sera');                 // toast "SERA joined the party", party size 2
  cs.flag('story:sera_joined');
  cs.objective('pro.reach_engineering');
  await cs.camera.reset();
},                                       // seen:halcyon:sera_wakes is set now, after completion

'prologue.orion_rescue': async (cs) => {
  await cs.camera.focus([30.5, 20.4], { zoom: 0.85 });
  cs.sfx('rumble');
  await cs.narrate('Something heavy hammers on the reactor-control shutters.');
  await cs.gather({ kade: [28.6, 22.4], sera: [27.8, 23.2] });   // whoever leads walks to its own slot
  await cs.say('KADE', 'Sera, stay behind me.');
  await cs.battle('pro_orion_rescue');   // canFlee false; defeat -> game over; Retry replays this trigger
  cs.flag('sw:halcyon:control_shutter'); // the shutter gate opens (World.syncFlags)
  await cs.move('orion', [[30.5, 21.4]]);
  await cs.say('ORION', 'There, there. Nobody\'s going to vent you.', { expr: 'smile' });
  await cs.ungather();
  await cs.join('orion');
  cs.flag('story:orion_joined');
},
```

### 4.7 Travel (S2a `src/story/travel.js`)

```js
export const travel = {
  open({ cs } = {}) -> Promise              // ui.starchart with REG.destinations; the choice goes through go()
  go(destId, { cs } = {}) -> Promise        // `before` script, flight, arrival
  arrive(map, spawn, { transition, scene }) -> Promise   // the map-change sequence of 3.7
};
DestinationDef = { id, name, subtitle, desc, map, spawn, unlock: cond, visible?: cond, lockedText?,
                   warn?, before?: scriptId, order }
```

`go(destId, { cs })`:
1. Runs the destination's `before` script if any (nested through `cs.run` when `cs` is given, else
   top-level); it may cancel by returning `false`.
2. Starts `prewarmLocation(dest location)` in the background.
3. If map `moth` and script `travel.flight` exist (prologue owns both), arrives at `moth:cockpit`
   (a transit map) and runs `travel.flight` with `{ from, to }` (nested through `cs.run` when `cs`
   is given). The flight lasts at least 3 s and until the prewarm finishes; Confirm skips once it is
   done. Otherwise it fades with a "En route" caption while the prewarm finishes.
4. Arrives at the destination's map and spawn, sets `dest:<id>`, and evicts the art of finished
   chapters (11.5).

Calling `travel.go` without `cs` while a script is active reports `console.error` (use `cs.travel`).
The Starchart on the Halcyon bridge and the `starchart` interactable at every Moth berth call
`travel.open()`. Each location declares its own destination in `story.destinations`.

Destination list (binding):

| id | owner | unlock | visible | notes |
|---|---|---|---|---|
| `halcyon` | prologue | always | always | Bridge; also the Moth berth |
| `driftmarket` | driftmarket | `unlock:driftmarket` | always | dock berth |
| `arboretum` | arboretum | `unlock:arboretum` | always | dock berth |
| `spire` | spire | `unlock:spire` | always | dock berth |
| `heart` | heart | `unlock:heart` | `!story:finale_done` | `before: 'dreams.night_before'`; `warn: 'The way back closes at the crown.'` |
| `ione` | epilogue | `unlock:ione` | `story:ione_revealed` | `lockedText: 'After the Heart'`; the shore has a berth with a Starchart (post-game) |

The Shoals and the Meridian are reached on foot from Driftmarket; the Vault from the Spire's core
antechamber (an `exit` interactable with `when: 'story:core_open'`). A new node shows "NEW" while
`unlock` holds and `dest:<id>` is unset. Ione appears as a locked node the moment HALCYON reveals it,
so the reveal is shown on the chart rather than told.
Kept: the Heart node itself is not a point of no return, because its dock has a berth for
restocking; the crown lift is, and the node's `warn` says so.

---

## 5. Party and progression (S3)

### 5.1 Roster, party, leader

```js
gameState.roster     // { id: PartyMember }: every recruited member; the only owner of member objects
gameState.party      // PartyMember[] in formation order: references into roster (the same objects)
gameState.leader     // member id walking in the field; must be in party
gameState.played     // string[] of completed script ids (4.2); never reverted by Retry
// core/state.js
export function newGame()                    // campaign start: resetGame(), then roster/party = [KADE level 1
                                             // via makeMemberAt], leader 'kade', kit 'prologue', story at prologue
export function joinParty(id, { level } = {}) -> PartyMember   // level default: max(2, round(avg party level));
                                             // roster entry reused if present; full HP/EP; tier-1 gear (kit)
export function leaveParty(id) -> boolean    // stays in roster; leader falls back to party[0]
export function setLeader(id); export function moveMember(id, toIndex)
```

The `gameState.party` **array object never changes identity**: `joinParty`, `leaveParty`,
`moveMember` and `deserialize` splice it in place, because the UI and the BattleModel hold it.
BattleModel mutates members in place (POC), and since party entries are the roster objects, HP, EP
and level never drift between the two and saves write current values.

`resetGame()` keeps its POC behaviour exactly (section 2.8) and also fills `roster` with the four POC
members, sets `leader: 'kade'`, the default `story`, empty `played`. Only the campaign uses
`newGame()`. `PartyMember` gains:

```js
{ ...POC fields,
  campaign: true,                                  // created by progression: learns skills, stats derived
  equip: { weapon: null, armor: null, accessory: null },
  mods: { resist: {}, boost: {}, immune: [], ailmentResist: {}, startBp: 0, encounterRate: 1 } }   // from equipment
```

### 5.2 Battle party size and difficulty

Battles take `gameState.party` (1-4 members). Party-size scaling and difficulty live in
`battle/data.js`, which `applyBalance()` mutates in place:

```js
export const BATTLE_RULES = {
  partyScale: { hp: [0, 0.45, 0.65, 0.85, 1], dmg: [0, 0.7, 0.82, 0.92, 1] },   // enemy HP and damage by party length
  difficulty: { hp: 1, dmg: 1 },        // Story difficulty: { hp: 0.8, dmg: 0.7 } (settings, 8.1)
  ultimateBp: 3,                        // 5.4
};
```

Encounters may set `scale: false`. Four-member Normal battles are byte-for-byte the POC numbers.

### 5.3 Levels and stats

- `xpToNext(level) = 30 * level + 70` stays (unit tests). Levels run 1-40, story targets 1-32.
- Linear growth anchored on the POC: `statsAt(id, L) = PARTY_DEFS[id].base + (L - PARTY_DEFS[id].level) * growth`,
  with floors (HP 120, EP 20, stats 8). KADE at level 1: 190 HP, ATK 31; at level 32: 1120 HP, ATK 124.
  Balance may override `base`/`growth` per member in `balance.js` (`overrides.party`).
- `member.maxHp`, `maxEp` and `stats` always hold **effective** values (level + equipment);
  `refreshMember(member)` recomputes them after level-ups, equipment changes and loads, keeping the
  HP/EP deficit. So BattleModel reads members exactly as in the POC.
- `gainXp` (state.js) keeps the POC path for legacy members; for `campaign` members it levels up,
  calls `refreshMember`, then `learnByLevel`. Learned skills are reported as separate `learn` events,
  never inside `levelUp` (its shape is pinned).

```js
// core/progression.js (PURE)
export const LEARNSETS                        // table 5.4
export function statsAt(id, level)
export function makeMemberAt(id, level, { flags }) -> PartyMember
export function refreshMember(member)
export function learnByLevel(member) -> skillIds        // newly learned
export function learnFromFlags(member, flags) -> skillIds   // ultimates from ult:<member>
export function canEquip(member, itemId) -> boolean
export function equip(member, slot, itemId | null) -> { ok, message }   // moves items between inventory and member
export function equipDelta(member, slot, itemId) -> { maxHp, maxEp, atk, def, mag, res, spd }  // for UI arrows
export function equipBonus(member) -> { stats, resist, boost, immune, ailmentResist, startBp, encounterRate }
export function optimize(member, inventory) -> { weapon, armor, accessory }   // Equip "Optimize" (8.1)
```

### 5.4 Learnsets and ultimates (binding skill ids)

The four POC skills of each traveler stay as defined. New skills go into `SKILLS` in
`battle/data.js` and must pass the rules of section 2.8. Levels below a member's join level are
learned on joining.

| | KADE | NYX | ORION | SERA |
|---|---|---|---|---|
| 1 | `arc_slash` | `scatter_shot`, `cryo_round` | `thermal_burst` | `nanoheal`, `photon_lance` |
| 2-6 | `cross_edge` 3, `provoke` 5 | `expose` 3, `void_round` 6 | `cryo_field` 2, `volt_chain` 4, `overclock` 6 | `restore_field` 4, `revive` 6 |
| 8-12 | `lance_charge` 8, `rally` 12 (allies ATK+) | `quickdraw` 10 (rifle, randomEnemies x4) | `static_field` 10 (all foes SPD-) | `clarity` 9 (heal kind, allies: cleanse + small heal) |
| 13-17 | `storm_lance` 16 (volt, all foes) | `frost_volley` 15 (cryo, all foes) | `inferno` 14 (thermal, all foes) | `radiant_spear` 14 (photon, all foes) |
| 18-22 | `aegis_stance` 20 (taunt kind: self DEF/RES+2, taunt) | `dead_eye` 20 (rifle, one, heavy) | `recompile` 19 (allies MAG/RES+) | `aegis_field` 19 (allies DEF/RES+) |
| 23-27 | `thunder_rend` 25 (blade, hits boost) | `event_horizon` 25 (void, all foes) | `absolute_zero` 24 (cryo, one, heavy) | `triage` 23 (allies, big heal) |
| 28-30 | `skyfall` 29 (lance, all foes, heavy) | `ringbreaker` 28 (rifle, one, 4 hits, hits boost) | `entropy` 30 (debuff, all foes ATK/DEF/RES-) | `dawnsong` 29 (heal kind, allies: heal + cleanse) |
| Ultimate | `oathblade` (`ult:kade`) volt, one | `ringfire_barrage` (`ult:nyx`) rifle, randomEnemies | `singularity` (`ult:orion`) void, all foes | `lifebloom` (`ult:sera`) heal kind, allies: revive + heal + cleanse |

**Ultimates awaken inside the traveler's own boss fight.** The boss script calls
`api.grantUltimate(memberId)` at the story beat (7.9): Nyx at the Maw's 50%, Sera at the Gardener's
50%, Kade at Voss's overclock, Orion at Echo's 50%. It sets `ult:<member>`, adds the skill to the
member and the combatant, and emits a `learn` event (`ultimate: true`) that plays the awakening
cut-in and the `ultimateReady` tip. `learnFromFlags` grants them again from the flag on loads and
jumps.

**Ultimate rule:** usable once per battle; costs its EP **and exactly `BATTLE_RULES.ultimateBp` (3)
BP**, so the member must hold 3 BP; it always resolves at that Boost (potency x2.5, or +3 hits for
`boostMode: 'hits'`) and plays a cut-in (7.4). The model emits `ultimateReady` the first time in a
battle that a member can use theirs. In the menu ultimates are greyed out with "Needs 3 BP" until
then. Numbers are tuned by C10 through `balance.js` overrides.

### 5.5 Equipment

Slots `weapon`, `armor`, `accessory`. ItemDef fields for gear:

```js
{ id: 'eq_w_nyx_3', name: "Varo's Long Gun", desc: '...', target: null, battle: false, key: false,
  price: 1800, icon: 'weapon',
  equip: { slot: 'weapon', for: ['nyx'],                       // weapons: owner list; armor/accessory: any
           stats: { atk: 22, spd: 4, maxHp: 0, maxEp: 0, def: 0, mag: 0, res: 0 },
           resist: { cryo: 0.3 },        // incoming damage of that type x (1 - value)
           boost: { rifle: 0.12 },       // outgoing damage of that type x (1 + value)
           immune: ['sleep'],            // ailments
           ailmentResist: { sleep: 0.5 },// chance of that ailment landing x (1 - value); rolls rng only when present
           startBp: 1,                   // extra BP at battle start (max 5)
           encounterRate: 0.5 } }        // field encounter hazard x value (Ghost Signal)
```

**Gear has personality.** Every tier 3-4 weapon and every accessory carries one distinct effect
(`boost`, `resist`, `immune`, `ailmentResist`, `startBp` or `encounterRate`) that fits its story
(Varo's Long Gun boosts rifle; the Lullaby Ward blocks sleep). `tests/progression.test.mjs` fails if
two such items share the same effect signature; the four dream keepsakes are exempt (they share their
sleep guard by design and differ in their stat).

Binding equipment ids (names, stats and prices: C10; sources: the listed location owner places the
chest or stocks the shop):

| Ids | Source |
|---|---|
| `eq_w_kade_1` Service Blade, `eq_w_nyx_1` Salvage Carbine, `eq_w_orion_1` Field Gauntlet, `eq_w_sera_1` Medic's Lance, `eq_a_1` Crew Jumpsuit | starting gear (kits) |
| `eq_x_stim_chip` Stimulus Chip (startBp 1) | prologue chest (engineering) |
| `eq_w_kade_2` Arc Saber, `eq_w_nyx_2` Ring Rifle, `eq_a_2` Pressure Suit, `eq_x_swift_band` (SPD) | `ruse` shop, ch1 |
| `eq_w_orion_2` Coil Gauntlet, `eq_w_sera_2` Lumen Lance, `eq_x_power_band` (ATK), `eq_x_focus_lens` (MAG) | `fabricator` shop, ch1+ |
| `eq_w_nyx_3` Varo's Long Gun, `eq_x_varo_compass` (rifle boost), `eq_x_frost_charm` (cryo resist) | shoals / meridian chests |
| `eq_w_kade_3` Ringforged Lance, `eq_w_orion_3` Lattice Fist, `eq_a_3` Ringborn Weave, `eq_x_ghost_signal` (encounterRate 0.5) | `ruse` shop, ch2+ |
| `eq_w_sera_3` Seedling Spear, `eq_x_ember_charm` (thermal resist), `eq_x_photon_prism` (photon boost) | arboretum chests |
| `eq_w_kade_4` Oathkeeper, `eq_a_4` Security Plate, `eq_x_ground_coil` (volt resist), `eq_x_vital_core` (max HP) | spire chests (Oathkeeper in Kade's quarters); `quartermaster` shop |
| `eq_w_nyx_4` Horizon Rifle, `eq_w_orion_4` Empathy Engine, `eq_x_null_ward` (void resist), `eq_x_ether_core` (max EP) | vault chests |
| `eq_w_sera_4` Dawnspear, `eq_a_5` Choir Mantle, `eq_x_lullaby_ward` (sleep immunity) | heart chests; `eq_x_lullaby_ward` also `ruse` shop after ch4 |
| `eq_x_keepsake_kade` Voss's Insignia, `eq_x_keepsake_nyx` Meridian Ribbon, `eq_x_keepsake_orion` Lullaby Score, `eq_x_keepsake_sera` Theo's Drawing (each `ailmentResist: { sleep: 0.5 }` plus one stat) | dream refusals (dreams) |
| `eq_x_ice_heart` (ch1), `eq_x_bloom_crown` (ch2), `eq_x_sentinel_core` (ch3), `eq_x_glitch_lens` (ch4), `eq_x_choir_bell` (finale) | the chapter's optional elite (12.4, M3) |

### 5.6 Shops, credits, treasure

```js
ShopDef = { name: "Ruse's Salvage", keeper: 'RUSE', portrait: 'ruse', greeting: 'Credits first. Questions never.',
            stock: [{ item: 'medigel' }, { item: 'eq_w_kade_2', when: 'chapter>=ch1' }], sellRate: 0.5 }
// core/shop.js (PURE)
export function shopStock(shop, state) -> [{ item, price, owned }]
export function buy(itemId, n = 1, price) -> { ok, message }      // credits and inventory
export function sell(itemId, n = 1, rate) -> { ok, message }      // key items and equipped gear cannot be sold
```

Shops (binding ids): `ruse` (Driftmarket, owner driftmarket; stock grows by chapter), `fabricator`
(Halcyon antechamber, data in `common`, interactable placed by prologue; stock grows by chapter),
`quartermaster` (Spire, owner spire; opens when the cadets are freed). Credits come from battles,
chests (`credits` field) and selling. Prices live on ItemDefs. Buying gear asks "Equip now?" (8.2).

### 5.7 Items (binding ids, effects by C10)

Consumables: `medigel` (POC), `medigel_plus`, `medigel_max`, `nanomist` (heal all), `ether` (POC),
`ether_plus`, `revive` (POC), `revive_plus`, `stim` (cures sleep and jam), `thermal_charge`,
`cryo_charge`, `volt_charge`, `photon_charge`, `void_charge` (fixed damage of that type to one foe;
hits weaknesses like any typed hit). Key items: `keycard` (POC), `lattice_coil`, `command_key`.
New item effect fields: `effect.cleanse: true`, `effect.damage: { amount, type }`, `target: 'allies'`,
`icon` (UI icon name; defaults to the item id). All live in `src/content/common/data.js` except the
four POC items.

---

## 6. Save and load (S3 format, S2a flows, S5 UI)

### 6.1 Format

```js
// core/save.js
export const SAVE_VERSION = 1;
export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
export function serialize(state, pos /* { map, x, z, facing } */) -> SaveData
export function deserialize(data, { keep } = {}) -> { pos, checkpoint }  // migrates, validates, writes into gameState
                                                          // in place (party array identity kept); keep: ['stats', 'played']
export function writeSlot(slot, data) -> { ok, storage: 'local' | 'memory', error? }
export function readSlot(slot) -> SaveData | null
export function listSlots() -> [{ slot, empty, damaged, summary }]
export function latestSlot() -> slot | null                // newest savedAt
export function deleteSlot(slot)
export function migrate(data) -> data                       // version chain v0 -> v1 -> ...
```

```js
SaveData = {
  v: 1, game: 'voidpath', savedAt: '2026-10-08T12:00:00.000Z',
  summary: { chapter: 'ch1', chapterLabel: 'Chapter One · Ringborn', location: 'Driftmarket',
             playTime: 1834, leader: 'nyx', party: [{ id: 'kade', level: 9 }, ...], cleared: false },
  pos: { map: 'driftmarket', x: 12.5, z: 8.5, facing: 'down' },
  checkpoint: { map, x, z, facing } | null,
  party: ['kade', 'nyx', 'orion', 'sera'], leader: 'nyx',
  roster: { kade: { level, xp, hp, ep, alive, equip: { weapon, armor, accessory } }, ... },
  inventory: { ... }, credits: 0, flags: { ... }, story: { chapter, objective, done },
  played: [ ... ], stats: { ... }, bestiary: { ... },
}
```

- Derived values are not stored: stats, max HP/EP, mods and skills are rebuilt from level, equipment
  and flags on load (`makeMemberAt` + `refreshMember` + `learnFromFlags`), so balance changes apply to
  old saves.
- Keys: `voidpath.save.<slot>`; settings keep `voidpath.settings.v1`; `voidpath.cleared` marks a clear.
  Every storage call is in try/catch. If localStorage throws (Artifact iframe, private mode, quota),
  saves go to an in-memory map for the session and the UI shows once: "Saving is unavailable in this
  view. Progress lasts until the page closes."
- Load validation: unknown map or spawn, or a `transit`/`scene` map, falls back to the checkpoint,
  else the map's location dock, else `halcyon:start`; unknown items are dropped with `console.warn`;
  unknown flags are kept; HP/EP clamped; a member missing from PARTY_DEFS is dropped; corrupt JSON
  returns null and the slot shows "Damaged".

### 6.2 When the game saves, checkpoints and snapshots (S2a)

- **Autosave** (slot `auto`) on the arrivals listed in 3.7, after every chapter card, and when a
  script calls `cs.save()` (every boss aftermath does).
- **Checkpoint** (`{ map, x, z, facing }`): Med-Station or inn Restore, and the arrivals listed in 3.7.
  Whenever the checkpoint is set, S2a also keeps an in-memory `serialize()` **snapshot**; Retry
  restores it (4.4).
- **Deferral.** While a cutscene is active, `cs.card` (checkpoint and autosave), `cs.save`,
  `cs.checkpoint` and arrivals only queue requests. When the outermost script ends normally, the
  queued requests are written once, at the leader's position at that moment: at most one checkpoint
  (with its snapshot) and one autosave. If that moment is on a `transit` or `scene` map, nothing is
  written and `console.error` names the script (scripts must end on a real map). `abortAll()` drops
  the queue.
- **Never:** in battle, on `transit` or `scene` maps, on same-map lifts or teleports, or during
  `cs.goto` vignettes and dreams.
- **Manual saves** only at Med-Stations and inns (Save choice). A small "Autosaved" toast with the
  save icon confirms every autosave.
- **Finale and ending.** `dreams.crown` ends with `cs.goto('halcyon', 'cryo')`, so the save after the
  Warden fight is written on a real map before the epilogue starts (its flag trigger, 12.5).
  The epilogue script sets `story:game_clear` on `ione:shore` and queues a save; `cs.ending()` writes
  it there before the credits, so the final autosave lands on the shore even if the player picks Title
  after the stats. The shore has talkable travelers, BOLT and Theo, and a Moth berth with a Starchart,
  so a cleared save is never a dead end.
- **Title:** Continue (shown when `latestSlot()` exists) loads it; Load opens the saves UI.

---

## 7. Battle

### 7.1 Model extensions (S3, `battle/model.js`, `battle/data.js`, `battle/scripts.js`)

Hard rules: the 51 tests stay green unchanged (section 2.8); base encounters consume `rng()` exactly as
before and emit exactly the POC event shapes (a new field may only appear on new event types, and
keys are omitted, never set to `undefined`); every new behaviour is off unless a definition asks for
it.

EncounterDef additions (all optional):

```js
{ id, enemies, backdrop, boss, canFlee, music,
  scale: true,                    // party-size scaling (5.2)
  winOn: 'all' | 'boss',          // 'boss': victory when every boss enemy is down (adds shut down)
  intro: { title: 'THE MAW', subtitle: 'Void Leviathan', lines: [Line] },   // boss card + lines
  outro: { lines: [Line] },       // after the victory pose, before results
  tips: [{ on: eventKey, lines: [Line], flag?: 'tut:maw_dive' }],   // 7.7; any event key
  phaseMusic: { warden_unbound: 'final_boss_2' },   // music switch on transform
  retryPhase: { encounter: 'heart_boss_warden_2' } } // game over after the transform offers "Retry from the second form"
```

EnemyDef additions (all optional):

```js
{ kind, name, level, maxHp, shield, stats, weaknesses, actions, xp, credits, drops, boss,
  art: 'drone',                   // sprite builder key (default: kind)
  tint: '#ffd0f0',                // multiply tint (elite remixes)
  script: 'maw',                  // BOSS_SCRIPTS id (any enemy may have one: Firewall Golem does)
  ai: 'sentinel' | 'basic',       // default: 'sentinel' for a boss without `script`, else 'basic' (dispatch below)
  actionsPerRound, maxShieldCap,
  shieldGain: 2,                  // shield growth after each break (bosses; default BOSS_SHIELD_GAIN)
  phases: [{ at: 0.5, say?: [Line], transform?: kind, keepHp?: true }],   // HP-fraction triggers, once each
  onDefeat: { transform: kind, say?: [Line] },     // instead of KO: transform at full HP (two-form bosses)
  weaknessPool: [[...], [...]], shiftOnRecover: true,  // new weaknesses after each break recovery
  resist: { cryo: 0.5 }, immune: ['sleep'], ailmentResist: { sleep: 0.5 },
  stage: { slot: [x, z], scale: 1 } }   // presentation override
```

Enemy action additions:

```js
{ id, name, kind, power, type, target, anim, weight, desc, hits, effect,
  kind: 'attack' | 'debuff' | 'buff' | 'heal' | 'lockOn' | 'charge' | 'summon' | 'submerge',
  summon: { kind: 'rootling', count: 2 },  // max 4 enemies alive; unavailable when full
  untargetable: 1,                         // submerge: rounds untargetable (style from enemy: 'submerge' | 'phase')
  then: 'breach',                          // forced next action of this enemy (a break clears it)
  fires: 'annihilator_beam',               // lockOn / charge: the action fired when the telegraph completes
  telegraph: 'The ice groans...',          // lockOn / charge banner text
  chargeRounds: 1,                         // charge: rounds until it fires
  effect: { stats: ['sleep'], stage: 1, turns: 2, chance: 0.5, limit: 3 },   // `chance` rolls rng only when present;
                                           // `limit`: at most N targets receive the ailment (in party order)
  minRound: 2, hpBelow: 0.5, cooldown: 2,  // selection gates
  fx: 'maw.ice_breath',                    // presentation choreography id (looked up by actionId, not sent in events)
  pose: 'special' }                        // optional sprite anim for the attack
```

**AI dispatch.** `_chooseEnemyAction` picks by `ai`:
- `'sentinel'` (the default only for a boss without `script`: the POC `sentinel` and `pro_sentinel`)
  runs the POC path unchanged: Overcharge once below 50%, Lock-On every few rounds, then
  `annihilator_beam` (or the lock-on action's `fires`).
- `'basic'` (everything else): the script's `chooseAction` first; else a weighted pick from actions
  whose gates pass (`minRound`, `hpBelow`, `cooldown`, a summon only with room, a heal only when an
  ally enemy is hurt, a buff only when `_canSelfBuff` passes; `_canSelfBuff` tolerates effects
  without `stats`). Pending lock-on, charge and `then` actions take precedence.
- `_resolveEnemyAction` branches by kind: `attack` and `debuff` deal damage when `power > 0`; `buff`
  and `heal` never damage the party (`heal` emits ordinary `heal` events on enemies); `summon`,
  `submerge`, `lockOn` and `charge` run their own branches. A `lockOn` or `charge` whose `fires`
  action does not exist reports `console.error` and falls back to a weighted pick.

New mechanics:

- **Ailments** (stored in `buffs` like `taunt`, stage 1, emitted as `status` events): `sleep` (the
  actor's turns are skipped with a `skip` event; any damage wakes it), `jam` (party skills unusable;
  menu shows them disabled), `marked` (single-target enemy attacks prefer the marked member; taunt still
  wins). Cleansed by `effect.cleanse` skills and items; blocked by `immune`; reduced by
  `ailmentResist`.
- **Untargetable**: `combatant.untargetable` hides an enemy from `validTargets` and multi-target hits;
  counted down at round start. `_checkAction` rejects attacks, offensive skills and damage items with
  the message "Nothing to target." when no valid target exists (no exception), and `_doAttack` never
  dereferences a missing target.
- **Lock-on and charge**: a `lockOn` telegraphs a target and fires `fires` at it in the boss's last
  slot of the next round; a `charge` telegraphs with `targetId: null` and fires `fires` after
  `chargeRounds`. A break cancels both and any pending `then`.
- **Summons** append combatants with monotonic ids `e<N>` (a counter that starts at the encounter's
  enemy count; ids are never reused) to `enemies`/`combatants`, rebuild `_byId`, set their jitter to 1
  in both the current and the next jitter map (no rng draw), and join the turn order from the next
  round.
- **Transform** swaps a combatant's def in place (kind, name, stats, maxHp, shield, weaknesses,
  revealed from the bestiary of the new kind, actions, actionsPerRound, art), sets HP to full (or keeps
  the fraction with `keepHp`), clears breaks, lock-ons, charges and buffs.
- **Skill and item effects**: `effect.cleanse` removes sleep, jam, marked and negative stat stages
  from each target; a `heal` skill or item with `effect.revive` also revives KO'd allies in its target
  set (for `allies`, KO'd members are included) at that HP fraction before healing.
- **Ultimates** (5.4), **equipment** mods, **item damage**, **party-size scaling and difficulty**
  (`BATTLE_RULES`), **winOn**, and `defeated:<encounterId>` on every boss victory (legacy
  `boss_defeated` still set; nothing new reads it).

Enemy numbers come from `content/balance.js`: content writes
`{ kind, name, art, ...statLine(12, 'brute'), shield: 5, weaknesses, actions, drops }`, where
`statLine(level, archetype) -> { level, maxHp, stats: { atk, def, mag, res, spd }, xp, credits }` and
archetypes are `swarm standard brute caster armored boss elite`. `applyBalance()` may still override
any field per kind.

### 7.2 New events (shapes binding; never emitted by base encounters)

```js
{ type: 'say', speaker, text, portrait? }
{ type: 'summon', targetId, kind, name, hp, maxHp, shield, maxShield, weakCount, revealed }
{ type: 'transform', targetId, kind, name, hp, maxHp, shield, maxShield, weakCount, revealed }
{ type: 'untargetable', targetId, on, style }              // style: 'submerge' | 'phase' | 'shield'
{ type: 'weakShift', targetId, weakCount, revealed }
{ type: 'skip', actorId, reason }                          // reason: 'sleep'
{ type: 'learn', memberId, skillId, name, ultimate? }      // after levelUp events from applyRewards, or mid-battle
{ type: 'ultimateReady', memberId, skillId }
{ type: 'cue', name, targetId?, value? }                   // presentation cue for arenas and fx (7.3)
// existing 'telegraph' events may carry targetId: null (charge); 'status' events may carry stat 'sleep' | 'jam' | 'marked'
```

### 7.3 Boss scripts (`battle/scripts.js`, PURE)

```js
export const BOSS_SCRIPTS = {};
export function registerBossScript(id, script)
// BossScript hooks (all optional). The model calls them only for enemies whose def has `script`.
{
  thresholds: [0.75, 0.5, 0.25],
  onBegin(api),
  onRoundStart(api, round),
  chooseAction(api, enemy) -> { actionId, targetId?, override?: { type, name, power } } | null,
                                           // null = default weighted AI; override changes this use only (Mirror)
  onPartyAction(api, actor, action),       // after a party action resolved; action.damageType is the element used
  onHit(api, hit),                         // { attackerId, targetId, type, amount, weak }
  onThreshold(api, enemy, fraction),
  onBreak(api, enemy), onRecover(api, enemy), onTransform(api, enemy),
  onDefeat(api, enemy) -> boolean,         // true prevents the KO (handled the defeat itself)
}
// api: every method appends events to the list being built
api.round; api.rng; api.mem /* per-battle scratch */
api.enemy(idOrKind); api.enemies(); api.party(); api.member(id)
api.say(speaker, text, { portrait, expr }); api.message(text)
api.cue(name, { targetId, value })                          // 'cue' event -> arena.react and fx 'cue.<name>' (7.4)
api.transform(enemyId, kind, { keepHp = false }); api.summon(kind, { count = 1 })
api.setUntargetable(enemyId, on, { rounds = 1, style = 'submerge' })
api.setResist(id, { [type]: mult }, { rounds = 1 })         // runtime resistances (Mirror, Firewall Golem); emits cue 'resist'
api.shiftWeaknesses(enemyId, list); api.heal(id, amount); api.status(id, effect)
api.cleanse(idOrParty, stats)                               // same events as effect.cleanse (Theo wakes the party)
api.protect(memberId, { hits = 1 })                         // the next lethal hit leaves 1 HP; emits cue 'protect'
api.telegraph(enemyId, targetId | null, text); api.useAction(enemyId, actionId, targetId)
api.grantUltimate(memberId); api.rechargeUltimates()        // 5.4; recharge emits cue 'ultimatesRecharged'
```

Example (`src/content/shoals/data.js`):

```js
bossScripts: {
  maw: {
    thresholds: [0.5],
    chooseAction(api, e) {
      if (api.round > 1 && api.round % 3 === 0 && !e.broken && !api.mem.dove) {
        api.mem.dove = true;
        api.telegraph(e.id, null, 'The ice groans beneath the squad...');
        return { actionId: 'submerge' };          // action has untargetable: 1, then: 'breach'
      }
      if (api.round % 3 !== 0) api.mem.dove = false;
      return null;
    },
    onThreshold(api, e) {
      api.say('NYX', 'Great-grandma fought worse than you. I read her log.');
      api.grantUltimate('nyx');
      api.status(e.id, { stats: ['atk'], stage: 1, turns: 3 });
    },
  },
},
```

### 7.4 Presentation (S4)

- **Dynamic party**: `PARTY_LAYOUTS = { 1: [[3.2, 0.3]], 2: [[4.0, -1.3], [2.8, 1.5]], 3: [[4.3, -2.2], [3.3, 0.3], [2.3, 2.8]], 4: POC PARTY_SLOTS }`;
  battleUI party panel, compact grid, results grid and turn bar sized to the party.
- **Boss with adds**: boss at `BOSS_SLOT`, adds at `[[-1.9, -2.9], [-1.7, 3.0], [-6.3, 2.4]]`;
  `EnemyDef.stage.slot` overrides. `_fit` uses each art's `fitBox` (7.6), so huge bosses (up to
  256x256 frames) may bleed off-frame without shrinking the party on phones.
- **Mid-battle changes**: `stage.addCombatant(c)` (spawn: holo flicker-in or rise from the floor),
  `stage.transform(id, art)` (white flash, shake, shard burst, sheet swap, re-warm aura),
  `stage.setUntargetable(id, on, style)` (submerge: sink and fade into the floor with frost
  particles; phase: glitch flicker and 35% opacity), `ui.addFoe(c)`, `ui.resetFoe(id, data)`,
  `ui.setUntargetable(id, on)` (plate dims, tag SUBMERGED / PHASED, not selectable). Plates are keyed
  by combatant id, which the model never reuses.
- **Telegraphs**: the Director shows a `telegraph` with `targetId: null` as a screen-wide warning
  band; lock markers are cleared by the `fires` action id (not by `annihilator_beam`).
- **Cues**: a `cue` event goes to the arena's `react(kit, event)` and, if registered, to the action fx
  `cue.<name>` (dome light, crown flood, Voss's shield, ultimates recharged).
- **Dialogue**: `ui.say({ speaker, text, portrait })` -> Promise: a battle dialog strip above the party
  panel; Confirm or tap advances; auto-advances after 3.5 s during autoplay. `say` events, encounter
  `intro.lines` / `outro.lines` and tips use it.
- **Boss intro**: `ui.bossCard({ title, subtitle })` (~1.6 s): the name slams in across the screen with
  a crimson rule, camera pushes from 1.25 to 1, then intro lines. Replaces the POC "blocks the way!"
  banner for encounters with `intro`.
- **Boss defeat**: the action fx `<boss>.defeat` (if registered) plays before the victory pose (the Maw
  sinks, MOTHER-7's vines fall away, Voss kneels, Echo calms, Warden folds).
- **Ultimates**: `ui.ultimateCut(memberId, skillName)` (~1.1 s): diagonal band with the portrait at 4x,
  name in the display font, `engine.hitStop(160)`, then the skill's fx. A mid-battle `learn` with
  `ultimate: true` plays an "awakening" variant of the cut-in (portrait `:determined`, the line from the
  boss script before it).
- **Ailments**: status icons `sleep`, `jam`, `marked`; `skip` shows a 'zzz' label on the actor.
- **Results**: only `levelUp` events count as level gains (`ups.filter((u) => u.type === 'levelUp')`);
  `learn` events are listed separately as "SERA learned Clarity"; party grid sized to the party. Item
  icons everywhere use `ITEMS[id].icon || id`.
- **Battle speed** setting (8.1): the Director's time scale 1 / 1.5 / 2.
- **autoAction** (battleState.js) picks targets from `validTargets(id, 'enemy')` and defends when the
  list is empty; `tests/policy.mjs` does the same (10.4).
- **Action fx registry** (`battle/actionfx.js`): `registerActionFx(id, async (d, act) => {})` where
  `d` is the Director (stage, effects, particles, ui, audio, engine, `strike(s, a)`, `results(post, a)`,
  `wait`) and `act = { actor, event, waves, post, def }`. The Director looks up
  `ENEMIES[actor.key].actions.find(a => a.id === event.actionId).fx` (and `SKILLS[event.skillId].fx`)
  and falls back to the POC anim-based choreography when absent. The fx must still play every strike
  and result it is given, in order.
- `ENEMIES[kind].tint` applies `sprite.setTint`; `art` selects the sheet.
- **Disposal**: `BattleStage.dispose` releases materials through `programs.release`, disposes the
  stage's SpriteActors (glow sheets are refcounted, 11.5) and arena textures.
- **Canned fixtures**: `preview-battle.js?events=summon|transform|submerge|phase|say|skip|cue|learn|charge|ultimate`
  plays recorded event lists against the stage and UI without the model, so S4 never waits for S3.

### 7.5 Arenas (S4, `battle/arena.js`)

```js
export function registerArena(name, { theme, build(kit), react?(kit, event), textures? })
export class ArenaKit   // the POC Kit plus the helper builders as methods:
// kit.floor(pick, opts), kit.wallRun(pieces, opts), kit.box(size, mats, pos, rotY), kit.crate(...),
// kit.consoleBox(...), kit.decalPlane(...), kit.floorDecal(...), kit.lamp(pos, color, { light, flicker }),
// kit.shaft(pos, opts), kit.space({ backdrop = 'space_backdrop', aimX, aimY }), kit.foreground(heavy),
// kit.mat(name, opts), kit.plain(color), kit.add(obj), kit.light(light), kit.updaters, kit.flickers,
// kit.rng, kit.quality, kit.X0 / X1 / Z1 / WALL_Z / WALL_H
```

`theme = { background, fog, fogDensity, hemi, key, rimParty, rimEnemy, fill }` as in the POC THEMES.
**Light budget by quality** (11.6): every arena has hemisphere 1, directional 3 (key with shadow, fill,
one spare), point lights 6 / 4 / 2 (high / medium / low: the two rims plus a pool of 4 / 2 / 0), spot 1
on high only, all created by the kit before `build` runs; the key's shadow map is 2048 / 1024 / off.
Builders get extra lights only through `kit.pointLight({ color, intensity, distance, decay, position })`
(the pool, in priority order), `kit.dirLight(...)` (the spare) and `kit.spotLight(...)`. Each returns
the pooled light, or an inert stand-in once the quality's pool is used up; asking beyond the high
budget reports `console.error` in every build. `kit.lamp(..., { light })` draws from the same pool.
So every arena on a given quality shares the same shader programs. `react(kit, event)` lets an arena
respond to `transform`, `untargetable`, `break` and `cue` events. The four POC arenas are ported
unchanged in look.

### 7.6 Enemy art registry (S4, `art/enemies.js`)

```js
export function registerEnemyArt(art, EnemyArtDef)
// EnemyArtDef = { w, h, bevel?, draw(rig, pose), anims: { idle, attack, hurt, break, ...extra:
//   { fps, loop, poses: [pose], order? } }, points: { center, muzzle, top, core? }, icon: { x, y, scale },
//   fitBox?: [x, y, w, h] }        // the core rect _fit frames (default: the whole frame)
export { Rig }                                     // drawing primitives: ball, seg, poly, ring, glow, beam, dot, rect, line, begin/end, save/restore/translate/rotate/scale
export const BUILTIN_ART                         // { drone, crawler, turret, sentinel } defs, so content can derive variants
export function enemyArtKinds() -> string[]
// ENEMY_KINDS stays the four POC kinds; buildEnemySprite/buildEnemyIcon/prebuildEnemySprites accept registered
// arts and fall back to a tinted placeholder with console.warn for unknown ones (3.12)
```

Frames up to 256x256, at most 12 frames per sheet; required anims `idle` (4+ frames with secondary
motion), `attack`, `hurt`, `break`; bosses add at least one extra (`special`, `submerge`, `cast`).
Sheets and icons are cached in the art cache (11.5).

### 7.7 Onboarding schedule and tips

Each mechanic is taught once, at its first appearance, by a tip (at most 3 boxes, BOLT's or a
traveler's voice). Global tips live in `common/story.js` `tips` (C1 writes all of them in C-alpha);
BattleState shows the first unseen tip whose key matches an event before the next command menu opens,
then sets its flag. Tip keys are any event type plus derived keys: `begin`, `playerTurn`, `reveal`,
`break`, `bp3`, `boost` (POC), `status:<stat>`, `telegraph`, `untargetable`, `summon`, `weakShift`,
`ultimateReady`, `learn`, `skip`, `cue:<name>`. Encounter `tips` override global ones.

| Mechanic | First appears | Tip key |
|---|---|---|
| Weakness and Break | `pro_tutorial` (at most 3 mechanics boxes before this first battle; the rest of the POC intro moves into these tips) | `reveal`, `break` |
| Boost | the second prologue fight | `bp3` |
| Healing and items | Sera joins (first fight with her) | `playerTurn` (encounter tip) |
| Area-of-effect skills | Orion joins | `playerTurn` (encounter tip) |
| Expose (debuffs) | Nyx joins | `playerTurn` (encounter tip) |
| Telegraph and Defend | Sentinel Mk-I charge (prologue) | `telegraph` |
| Equipment | Stimulus Chip pickup (field toast + menu hint) | field script |
| Shop and leader switching | Driftmarket arrival | field script |
| Untargetable | Void Eel | `untargetable` |
| Sleep and Stim | Spore Drone | `status:sleep` |
| Summons | Feral Caretaker | `summon` |
| Marked (and Provoke) | Security Trooper | `status:marked` |
| Jam | Riot Drone | `status:jam` |
| Phase | Data Wraith | `untargetable` (style phase line) |
| Shifting weaknesses | Glitch Swarm | `weakShift` |
| Ultimate ready | first ultimate (Maw) | `ultimateReady` |

### 7.8 Regular enemies: teach first, then test

Every regular enemy has one signature behaviour from the toolkit above, and every boss mechanic first
appears on a regular enemy of the same chapter. Each zone has at least 4 formations, including one
combination that makes two behaviours interact. At least 3 of each chapter's 4 regular enemies have a
new silhouette (not a tint of an existing sheet); the prologue reuses the POC trio by design, and the
finale's elites are remixes on top of its three new enemies.

| Chapter | Enemy | Signature | Teaches (boss) |
|---|---|---|---|
| prologue | `pro_drone`, `pro_crawler`, `pro_turret` | POC behaviour, prologue numbers | basics |
| prologue | `sentinel_mk1` | `charge`: "Charging..." then a heavy shot next round | Defend on telegraphs (Sentinel lock-on) |
| ch1 | `ice_mite` | packs of 4 with small shields | Boost on many foes |
| ch1 | `void_eel` | `submerge`: dives untargetable for a round | the Maw's Submerge |
| ch1 | `rime_golem` | big shield plus Frost Shell (self DEF up) | Break timing |
| ch1 | `salvage_bot` | self-repair `heal` | focus fire |
| ch2 | `spore_drone` | Pollen: sleep chance | the Gardener's Pollen, Warden's Lullaby |
| ch2 | `bloom_mantis` | two actions per round | multi-action bosses |
| ch2 | `rootling` | weak swarm, only summoned | adds |
| ch2 | `feral_caretaker` | summons and heals Rootlings | the Gardener (formation: Caretaker + Rootlings) |
| ch3 | `sec_trooper` | marks a target, then focuses it | Voss's Focus Fire (formation: Trooper + Riot Drone) |
| ch3 | `riot_drone` | jams skills | Stim and basic attacks |
| ch3 | `sentinel_mk3` | mini lock-on | Voss's escorts, Warden's Last Lullaby |
| ch3 | `laser_turret` | `charge`: piercing beam on all | Defend timing |
| ch4 | `data_wraith` | phases (untargetable 'phase') | Echo's Glitch Phase |
| ch4 | `firewall_golem` | resists the last element used against it (script + `setResist`) | Echo's Mirror |
| ch4 | `glitch_swarm` | weaknesses shift after recovery | Warden form 2 |
| ch4 | `corrupted_memory` | `charge` "Overwrite" (all), cancelled by a break | Echo's Severance |
| finale | `warden_seraph` | low-chance Lullaby on all, shields an ally | Warden form 1 |
| finale | `dream_eater` | drains HP, hits sleepers twice | cleanse priority |
| finale | `choir_guardian` | makes its allies untargetable ('shield') until broken; shield grows per break | Warden's shield growth |
| finale | elites `elite_rime_golem`, `elite_bloom_mantis`, `elite_sec_trooper`, `elite_firewall_golem` | base art + `tint`, stronger numbers, one extra move each (cut first, 14) | remix |

### 7.9 Bosses (mechanics are binding; numbers are C10's)

| Encounter | Boss kind(s) | Level | Mechanics | Must-have presentation |
|---|---|---|---|---|
| `pro_boss_sentinel` | `pro_sentinel` (art `sentinel`, `ai: 'sentinel'`) | 7 | POC: two actions, lock-on telegraph, Annihilator Beam, shield growth | existing; `intro` card "SENTINEL / Bridge Guardian"; `sentinel.defeat` (sparks, collapse); the wreck stays on the bridge for HALCYON's first appearance |
| `shoals_boss_maw` | `maw` (art `maw`, up to 256x192) | 12 | weak thermal, lance, rifle; 2 actions; Ice Breath (cryo, all), Tail Slam (one, DEF down), Submerge (telegraphed; untargetable 1 round) then Breach (void, all); a Defend tip follows the first Submerge telegraph; at 50% enrages and Nyx's ultimate awakens | arena `maw_lair` (frozen reactor hall); fx `maw.ice_breath` (frost sweeps the screen), `maw.breach` (floor cracks, burst from below), `maw.defeat`: it sinks back into the ice, wounded, not dead |
| `arb_boss_gardener` | `gardener` + summoned `rootling` | 17 | weak thermal, blade, void; Summon Rootlings (max 2), Pollen (all, sleep chance), Thorn Lash; the dome light opens every other round (`cue 'domeLight'`) and Photosynthesis (self heal) only works under it; a Break on a dome-light round cancels Photosynthesis and the arena dims the beam; at 50% summons 2 at once and Sera's ultimate awakens ("They're not seedlings. They're people."); `winOn: 'boss'` | arena `choir_gate` with a dome light beam that `react`s; fx `gardener.photosynthesis`; `gardener.defeat`: the vines fall away and MOTHER-7 is freed, not destroyed (she returns in the epilogue) |
| `spire_boss_voss` | `voss` + 2 `sentinel_mk3`, form `voss_overclock` | 22 | Voss weak blade, rifle, cryo, photon; Halberd Sweep (all), Command: Focus Fire (`marked` 2 rounds, escorts focus; first mark shows the Provoke tip), Execution Arc (heavy on marked); Kade's Provoke overriding a mark gets a Voss line; at 50% `phases` transform to `voss_overclock` (keepHp, new weaknesses, 2 actions, her upload shows through) and Kade's ultimate awakens ("Then we make somewhere."); escorts weak gauntlet, volt, void; `winOn: 'boss'` | human-sized art (~112x112) with cape and energy halberd; overclock art with cyan wireframe half; arena `spire_command`; fx `voss.execution`, `voss.defeat` (she kneels; the field Voss kneels for the aftermath) |
| `vault_boss_echo` | `echo` | 27 | weak blade, gauntlet, photon, volt; Mirror: after each party action, `setResist` to that element for a round and answer with it next turn (`override.type`); Glitch Phase every 4th round (untargetable 'phase'), then Severance as a `charge` (telegraphed, heavy, all; cancelled by a break); at 50% Orion's ultimate awakens ("Grief isn't an error.") | dark mirror of HALCYON (inverted hologram, magenta glitch); arena `vault_core`; fx `echo.severance`, `echo.defeat` (the glitch calms into HALCYON's colours) |
| `heart_boss_warden` (+ `heart_boss_warden_2`, form 2 only) | `warden_lock` -> `warden_unbound` | 31-32 | Form 1 weak lance, rifle, photon, void; shield grows each break (cap 16); Lullaby (all, sleep 50%, never twice in a row, at most 3 sleepers per cast via `effect.limit`), Cradle (one, sleep 2), Hymn of Rest (all, SPD down), lock-on Last Lullaby; the first lethal hit on Kade is stopped by Voss's voice from the Choir (`api.protect`, once); `onDefeat` transform. Form 2: all four ultimates recharge (`api.rechargeUltimates`); 2 actions; `weaknessPool` + `shiftOnRecover`; Choir Voices `say` lines at 75/50/25%; at 50% Theo's voice wakes the whole party (`api.cleanse('party', ['sleep'])`) and Sera answers; Unbound Requiem below 25%; `retryPhase` offers Retry from the second form | 256x256 angelic construct with cradle-arms (`fitBox` on the core), form 2 merged with choir light; arena `heart_crown` floods with choir gold on the transform cue; music `final_boss`, then **`final_boss_2` (mandatory, quotes the lullaby)** on transform; `warden.defeat` folds the construct down; the outro hands over to `dreams.crown`'s resolution |

Every boss also has:
- a field presence (FieldBossDef or scripted actor) that stays visible for the aftermath (3.8);
- a Med-Station or inn within one room before it;
- `intro` and `outro`, a defeat choreography `<boss>.defeat`;
- its mechanics taught by a regular enemy of the same chapter first (7.8);
- an aftermath script that queues `cs.save()` and **moves the party on** (no walking back): the Maw
  to `cs.goto('driftmarket', 'dock')` then `driftmarket.return`; the Gardener to the Choir Chamber;
  Voss to `spire:antechamber`; Echo to `halcyon:bridge`. Each dungeon also opens a one-way shortcut
  from its depths to its entrance for players who return (12.4).

---

## 8. UI (S5)

All new components follow the POC UI rules: DOM layers styled with `--vp-*` tokens, own CSS via
`injectCSS`, tap a row = select + confirm, keyboard and gamepad navigation, layouts from 390x844 to
1920x1080, input contexts pushed while open.

### 8.1 Pause menu tabs

`TABS = party, equip, items, journal, map, settings, controls`.
- **Party**: POC cards for the party (1-4); select a card for actions Make Leader (calls
  `ui.hooks.setLeader(id)`), Move Up / Move Down (`ui.hooks.moveMember(id, toIndex)`).
- **Equip** (`ui/equip.js`): member strip, three slots, candidate list (inventory filtered by
  `canEquip`), comparison arrows from `equipDelta`, effect tags (resist, boost, immune, sleep guard,
  start BP, encounter rate), Remove, and **Optimize** (`ui.hooks.optimize(memberId)` -> progression
  `optimize`).
- **Items**: POC behaviour plus `allies` targets, cleanse, and a Gear section (read-only counts).
  Icons from `ITEMS[id].icon || id`.
- **Journal** (`ui/journal.js`): chapter kicker, title and traveler portrait; current objective
  (large) and hint; side objectives (favours); done objectives of this chapter; chapter timeline
  (done / current / locked); "Story so far" with the recap of every finished chapter.
- **Map** (`ui/map.js`): the current map drawn from its grid as a clean schematic (walls, floors,
  water, pits, gates), visited areas only (`area:` flags), area names, exits labelled with their
  destination, opened and unopened chests in visited areas, the leader arrow and the objective marker
  (`objective.target` on this map, or an arrow to the exit toward it). Data from `ui.hooks.mapData()`.
- **Settings**: POC rows plus Difficulty (Story / Normal), Encounters (Normal / Low = x0.6), Battle
  speed (1x / 1.5x / 2x), Skip weak encounters (on: no random battles in zones whose level is 5 or
  more below the party's average; default on), Quality (with a note when it was lowered
  automatically, 11.6), and "Return to title" (confirm choice) -> `ui.hooks.quitToTitle()`.
  Settings are global (`voidpath.settings.v1`); the balance targets assume Normal.

```js
ui.setHooks({ setLeader(id), moveMember(id, toIndex), optimize(memberId), equipNow(memberId, itemId),
              journal(), mapData(), settings(patch), quitToTitle() })   // S2a wires in main.js
```

### 8.2 Shop (`ui/shop.js`)

```js
ui.shop.open({ shop /* ShopDef */, stock /* shopStock() */ }) -> Promise   // resolves on close
```

Buy / Sell tabs, credits, owned count, quantity stepper for consumables, per-member arrows for gear,
keeper portrait and greeting in a dialog strip, sfx `buy` / `sell` / `error`. After buying gear that
someone can wear and that beats their current piece, ask "Equip now?" with the member's portrait
(`ui.hooks.equipNow`).

### 8.3 Starchart (`ui/starchart.js`)

```js
ui.starchart.open({ destinations: [{ id, name, subtitle, desc, locked, lockedText, warn, current, isNew }] }) -> Promise<destId | null>
```

A holographic map (CSS/DOM): Tethys as a banded disc with rings, the Halcyon marker, destinations as
glowing nodes on orbit arcs with names, locked ones dimmed with a lock icon and their `lockedText`
("IONE: After the Heart"), a detail panel with `warn` in amber, "NEW" tags, the Moth route line
animating to the selection. Cyan on deep navy, scanline overlay.

### 8.4 Saves (`ui/saves.js`)

```js
ui.saves.open({ mode: 'save' | 'load', slots /* listSlots() */, storage: 'local' | 'memory' }) -> Promise<slot | null>
```

Rows: slot name (Autosave, File 1-3), chapter label, location, play time, party portraits with
levels, saved time, a star on cleared saves; empty and damaged states; overwrite confirmation in save
mode; 'auto' is read-only in save mode.

### 8.5 Dialog, cards and HUD (`ui/dialog.js`, `ui/cards.js`, `ui/hud.js`)

```js
ui.registerSpeaker(name, { portrait, accent, sigil?, textSpeed?, sfx?, mood? })
      // sigil: an icon shown instead of a portrait (WARDEN: 'warden_sigil', a gold iris); textSpeed: reveal
      // speed multiplier (WARDEN 0.6); sfx: per-box sound (WARDEN 'choir'); mood: runner preset (4.2)
ui.dialog.show(lines, { auto })        // Line.portrait may carry an expression ('sera:sad'); Line.offscreen shows
                                       // a small voice icon instead of a portrait; auto: debug fast mode
ui.cards.chapter({ kicker, title, traveler }) -> Promise   // ~4.5 s: black, kicker letters fade in, title
                                                           // with the amber rule, traveler portrait; input held
ui.cards.logo({ text = 'VOIDPATH', ms = 4000 }) -> Promise
ui.cards.caption(text, { ms }) -> Promise                  // centred caption over the scene
ui.cards.credits({ lines, transparent, onSkip }) -> Promise   // 8.6
ui.cards.end({ text = 'THE END' }) -> Promise              // waits for Confirm
ui.hud.showLocation(name, subtitle, objective?)            // big Octopath location banner; objective line under it
ui.hud.objectiveToast(text)                                // "New objective" toast
ui.hud.partyToast(memberId, 'join' | 'leave')              // portrait toast "SERA joined the party"
ui.hud.setPrompt(label, { badge })                         // badge '!' for available Party Talk
ui.hud.skipHint(on)                                        // "Hold to skip" (4.2)
ui.hud.letterbox(on, ms = 500)                             // cinematic bars for cutscenes
```

The dialog box fits 100 visible characters in at most four lines at 390x844 (the font may step down
one size) and sits low enough that speakers framed by `cs.camera.focus` remain above it on phones.
Speakers are registered once: the four travelers, BOLT, HALCYON and WARDEN by `common` (C1), others
by their location.

### 8.6 Credits

`REG.credits` lines (epilogue owner): `{ head: 'VOIDPATH' } | { role, name } | { cast: charId, name, role }
| { text } | { gap: 2 }`. `cast` lines show the character's portrait. With `transparent: true` the
credits scroll over the live field (the Ione dawn diorama with a slow camera pan; the party and BOLT
on the ice), at a readable pace, then "Everything you saw and heard was generated by code", then THE
END. Holding Confirm for 1 s skips. After THE END: `ui.screens.complete` with the copy "JOURNEY
COMPLETE", the stats tiles and two choices: Return to Ione (back to the field on the shore) and Title.

### 8.7 Title and game over

Title menu: Continue (when a save exists), New Journey, Load, Controls, Sound. Tagline "A 2D-HD RPG".
`ui.title.show({ onStart, onContinue, onLoad, hasSave })`. Game over: Retry (checkpoint), Retry from
the second form (when offered), Load, Title: `ui.screens.gameOver({ onRetry, onRetryPhase?, onLoad, onTitle })`.

New icons (`art/icons.js`, S5): `weapon`, `armor`, `accessory`, `credits`, `journal`, `map`, `star`,
`shard`, `lock`, `sleep`, `jam`, `marked`, `ultimate`, `shop`, `travel`, `gear`, `charge`, `talk`,
`voice`.

Emote bubbles are not DOM: they are pixel-art sprites in the diorama (`world.emote`, S1b, section 3.13)
so they sit at the right depth, receive the tilt-shift blur and need no per-frame DOM positioning.

---

## 9. Audio (C9 owns `src/core/audio.js` in Wave C)

Nobody edits `audio.js` in Wave S; S2a calls `audio.music(name, opts)` and `audio.sfx(name)` with the
names below before they exist (unknown names are ignored, extra options too). Track format: the
existing `TRACKS` data (`bpm, gain, delay, voices, mix, sends, intro?, loop, parts`; parts hold
`bars`, `chords` and instrument patterns in the token language documented in audio.js).

Engine changes (C9, C-alpha):
- `audio.music(track, { fade, restart })`: `restart: true` replays even when `track` is already
  wanted (the POC returns early on the same name).
- `once: true` tracks (stings) play as a one-shot layer: they duck the current track, play `intro` +
  `loop` once, then the current track resumes. The next sting always plays.
- A malformed track fails alone: `compileTrack` errors report `console.error` naming the track and
  that track is skipped; all other music keeps working.
- `export function compileTrack(def)` and `export const MOTIFS` are importable in node (no WebAudio at
  module top level) for `tests/audio.test.mjs`.

**Musical identity (binding).** Neighbouring locations never share key, tempo and lead together.

| Id | Use | Key / mode | Tempo, metre | Lead | Motif |
|---|---|---|---|---|---|
| `title` | title (exists) | keep | keep | keep | add one lullaby phrase (C9, C-gamma) |
| `explore` | Halcyon crew decks (exists) | keep | keep | keep | Halcyon theme |
| `battle` | battles, prologue to ch2 (exists) | keep | keep | keep | |
| `battle_2` | battles from ch3 on | E Phrygian | 148, 4/4 | driven saw lead, octave bass | |
| `boss` | Sentinel, Maw, Gardener, Voss, Echo (exists) | keep | keep | keep | |
| `victory` | (exists) | keep | keep | keep | |
| `driftmarket` | town | G Mixolydian | 92, swung 6/8 | plucked harp, bells | Ringborn folk motif |
| `shoals` | Shoals | C# minor | 70, 4/4 | glass bells, sub pulses | |
| `meridian` | Meridian wreck | F# Phrygian | 60, 4/4 | low drone, broken bells, distant metal | Ringborn motif, slow and broken |
| `arboretum` | Arboretum | D Dorian | 84, 3/4 | dripping arps, humming pad | lullaby fragment |
| `choir` | Choir Chamber | A (sus drone) | 56, free | choir pad | the Choir chord |
| `spire` | Security Spire | C minor | 112, 4/4 march | low strings, snare, alarm figure | WARDEN theme inverted in the alarm figure |
| `vault` | Memory Vault | B Lydian | 120, 7/8 | detuned digital arps, glitch stutters | lullaby, glitched |
| `heart` | the Heart | Ab major | 66, 4/4 | ascending choral pads | WARDEN theme |
| `warden` | WARDEN scenes, cold open | F minor | 72, 3/4 | music box, soft choir | WARDEN theme = the lullaby in F minor |
| `final_boss` | Warden form 1 | F minor | 132, 7/8 | organ-like pads, hymn | WARDEN theme |
| `final_boss_2` | Warden form 2 (mandatory) | F minor, ending in F major | 144, 6/8 | choir and organ | lullaby quote over the Choir chord drone |
| `lullaby` | HALCYON's lullaby | F major | 76, 3/4 | music box | the lullaby (canonical); memory shard 2, resolution |
| `ione` | Ione shore at dawn | D major | 80, 4/4 | warm pad, piano-like pluck | Ringborn motif and lullaby, resolved |
| `credits` | ending | F major to D major | varies | reprise | title, lullaby and Ringborn themes, 2+ minutes |
| `sting_chapter` | chapter cards | | | swell and strike | `once` |

`MOTIFS = { lullaby, ringborn, warden, choir }` are note sequences (the Choir motif is a chord); the
WARDEN theme is the lullaby in the parallel minor. Every track that the table says carries a motif
contains it (transposition allowed) in its compiled note data.

New sfx: `emote`, `splash`, `valve`, `laser_on`, `laser_off`, `shard`, `transform`, `summon`,
`submerge`, `emerge`, `sleep`, `wake`, `buy`, `sell`, `equip`, `travel`, `rumble`, `choir`, `glitch`,
`page`, `unlock`, `card`, `alarm`, `lift`, `pod_flip`, `awaken`, `skip`.

---

## 10. Debug, tests and lints

### 10.1 `__VP.debug` additions (S2a; perf and render hooks S2b)

```js
jumpTo(target, { play = false }) -> Promise<state>
   // target: chapter id | jump id from REG.jumps | 'poc' (2.9)
   // builds: newGame(); members of CHAPTER_START[ch].party joined at CHAPTERS[ch].levels[0] (jump.level wins);
   // flags = union of CHAPTER_FLAGS and every location's doneFlags of every earlier chapter + jump.flags
   // (ultimates follow from ult: flags); kit REG.kits[ch]; story chapter/objective; then arrive at map/spawn.
   // A missing map falls back to halcyon:bridge_starchart with a console.warn. play: run the 'load' triggers.
startBattle(enc, { seed, jump })   // jump: apply jumpTo(jump) first (party, levels, kit) without playing
goto(map, spawn); travel(destId); runScript(id, args); interact(id)
skip(on)          // fast mode: dialog auto-advance, waits x0.05, walks x6, engine.transitionTimeScale x5,
                  // cards, credits, emotes, camera tweens and the Moth flight collapse to <= 0.3 s
choices([indexes])  // answers for the next cs.choice calls; when empty, choices wait for input
autoResolve(mode)   // false | 'win' | 'lose' | 'policy': battles resolve with the model + tests/policy.mjs and no
                    // stage (SwiftShader runs only 1-6 fps); the result flows through the same promise and fades
godMode(on)         // party HP never drops below 1, EP costs 0
enemyHp(id, frac); forceAction(enemyId, actionId); ailment(memberId, stat)
flags(obj); setLevel(n); equip(memberId, slot, itemId); party(); credits(n); unlockAll()
save(slot); load(slot); listSaves(); loadSave(json); reloadAuto()   // reloadAuto: load 'auto' and wait for the field
renderInfo() -> { scene: { calls, triangles }, shadow: { calls, triangles }, post: { calls },
                  programs, compiles, textures, geometries, lights: { point, spot, dir }, canvasMB }
mapInfo() -> { map, areas, spawns, anchors, exits, interactables: [{ id, kind, x, z }], npcs, chests, gates }
visualLint(viewpoint?) -> { ok, lights, emitters, textures, untextured, problems: [] }   // 11.1 (S1b)
missingArt() -> [{ kind, key }]                       // fallbacks used (3.12)
pacing() -> { [chapter]: { field, battle, cutscene, menu, battles } }   // seconds per chapter (11.7)
state()   // POC fields + map, chapter, objective, cutscene, leader, partyIds, autosaves (count), music
```

`src/story/jump.js` exports PURE `buildJumpState(target, REG) -> { party, leader, flags, items, equip,
credits, story, map, spawn }` (unit-tested) and `applyJumpState(state)`.

### 10.2 Scenarios

`tests/scenarios/*.json`, run by `npm run scenarios` (strict), against the minified build.

| Files | Owner | Content |
|---|---|---|
| `01-boot`, `03-battle`, `05-defeat`, `06-mobile` | S2a (Wave S) | must keep passing through Wave S (start with `jumpTo('poc')` where they need it) |
| `01`, `02-explore`, `04-boss` rewrite | C1 | the story prologue: renamed flags (2.9), the Sentinel aftermath and CH1 card instead of the complete screen |
| `2N-dev-*.json` | S2a | dev_box flows: exits, saves, Continue, storage throwing, `dev.demo` |
| `1N-<loc>.json` and `1N-<loc>-alt.json` | each location owner | the chapter's critical path, then again with a different leader (11.3) |
| `90-critical-path.json` | I1 | New Journey to THE END in one run: `skip(true)`, `autoResolve('policy')`, `reloadAuto()` after every autosave, flags and chapter checked at every card |
| `91-retry.json` | I1 | loses every scripted battle once (`autoResolve('lose')`), retries, and checks nothing soft-locks |
| `92-human-pace.json` | I1b (and the G2/G3 directors for their chapters) | dialog at normal speed, a 2-3 s decision delay per battle action, `pacing()` report |

Location scenarios (`10-prologue`, `11-driftmarket`, `12-shoals`, `13-arboretum`, `14-spire`,
`15-vault`, `16-heart`, `17-dreams`, `18-epilogue`, `19-warden`): `jumpTo(chapter)` -> walk the critical
path with `interact` / `goto` / held keys -> every cutscene runs with `skip(true)` except one shown at
normal speed for screenshots -> regular battles with `autoplay` + `speed(3)` -> the boss via
`startBattle` with a seed, autoplay until a phase/transform event (`pauseOn`), screenshot, then lose it
once (`partyHp(1)` + `autoplay('defend')`), Retry (the pre-fight scene must auto-skip), and win with
`winBattle()` -> the chapter end card -> flags and journal asserted with `waitFor`.

### 10.3 Script dry-run and content lints (S2b)

**Script dry-run** (`tools/scriptcheck.mjs`, `npm run scriptcheck`, also run by
`tests/scripts.test.mjs`): node only. It registers all pure content and runs every script of every
`story.scenes` list in play order against a recording `cs` mock, starting each chapter from
`buildJumpState(chapter)` and accumulating the flags the scripts set. It enumerates choices (each
branch, up to 16 paths per script), returns `'victory'` from `cs.battle` (and also `'defeat'` when
`allowDefeat`), and treats every other call as instant. Output in `shots/scriptcheck/`: a play-order
transcript per chapter (speaker, expression, text, staging calls), box counts and characters per box
per scene, estimated reading time (1.2 s + 1 s per 18 characters per box), unregistered speakers and
expressions. It fails on: a box over 100 visible characters (emphasis markers not counted); a scene
over its budget (default 25 boxes or 150 s; the resolution 240 s); an unregistered speaker; more than
3 boxes tagged `mech` before the first battle; a `key` scene with fewer than two staging devices
(11.3); a chapter whose key scenes give no line to a traveler who is in the party at the time.

**Content lints** (`tests/content.test.mjs`) validate every registered pure location:
- maps pass `validateMap`; exits, destinations, anchors and jump targets point to existing maps and
  spawns; spawns stand on walkable cells (gate cells and draining water count as walkable, or the
  spawn declares `requires: cond`);
- every condition string in maps, `extends`, TalkSpecs, zones, destinations and objectives compiles;
- every script id referenced anywhere exists; encounter enemies exist (including `phases`,
  `onDefeat`, `summon` targets); zones list existing encounters with at least 4 formations; shops and
  chests list existing items; objectives referenced in `CHAPTER_START` exist;
- **soft-lock lint**: every flag read by a condition is written somewhere: a switch, shard or chest
  of an existing interactable, `defeated:<id>` of an existing boss encounter, `CHAPTER_FLAGS`,
  `doneFlags`, the auto-written prefixes (`visited:`, `area:`, `talk:`, `seen:`, `ptalk:`, `dest:`),
  or a `cs.flag('...')` literal in some `story.js` (static scan) or one the dry run recorded;
- every story trigger `when` and every `extends` entry `when` contains a `story:` or `chapter` term;
- no inline lines in maps without `poc: true` (outside `dev`); no id collisions.

**Art lint** (browser, run by I1 and the gates): `debug.missingArt()` empty after visiting every map
and starting every encounter once.

### 10.4 Balance simulator (C10)

`tests/campaign.mjs` (`npm run balance`, add `--check` to assert): node, imports `content/data.js`
and `registerAllData()`. For each chapter: party from `buildJumpState` at the chapter's start and end
levels with the chapter kit; N seeded battles per zone encounter; bosses after a rest; XP and credits
accumulated over the expected fight count (11.7).

The policy (`tests/policy.mjs`, moved from `tests/simulate.mjs`, which keeps working) plays like a
person: it starts with an empty bestiary for new enemy kinds and discovers weaknesses by trying them;
targets only `validTargets` and defends when there are none; defends on telegraphs; cleanses
sleepers; Provokes when an ally is marked; uses ultimates on Breaks. The report adds mechanic
frequencies (for example: Maw Submerge answered by Defend, Gardener heals cancelled, Severance
cancelled by a break) so bosses are tuned against human-like play.

Targets (`--check` fails outside them): regular fights at chapter level win >= 98% with median 2-4
rounds and 15-35% party HP lost; bosses at the chapter's end level after a rest win 85-95% in 6-10
rounds (Warden 10-14 across both forms); Severance cancelled by a break in 30-70% of casts and Gardener
heals cancelled in 30-70%; following the critical path with the expected fight count (8-12 per
chapter, 11.7) reaches the next chapter's start level +-1; each chapter's credits buy one weapon
upgrade per member plus a consumable restock.

---

## 11. Quality bar, performance and pacing

Every item in 11.1-11.3 and 11.7-11.8 is pass/fail. The gate reviewers (G2, G3, I1) judge them on
contact sheets, transcripts and pacing reports; authors do not grade their own work, and a failed
item is fixed, not explained.

### 11.1 Location checklist

Checked for every viewpoint of every new map at 1280x720 high and 390x844 medium. Tools:
`debug.visualLint(viewpoint)` (S1b) measures what can be measured; `tools/contact-sheet.mjs` (S2b)
lays each location's viewpoints next to the POC reference shots (`docs/screenshots/cryo.jpg`,
`corridor.jpg`, `engineering.jpg`) at both sizes, plus every key scene's frame on a phone with the
dialog box open.
- Every floor, wall and prop is 32 px/unit pixel art with a normal map; glowing details (signs,
  lamps, LEDs, crystals, screens, ribbons, data lines) are in emissive maps and bloom. visualLint:
  no untextured surface larger than 2 square units in view.
- Light pools: at least 3 coloured virtual lights in view (visualLint), one area mood (fog,
  hemisphere, key), and a focal set piece per map (POC reactor class: animated, lit, with particles).
- Atmosphere: at least one ambient particle emitter per area (visualLint), decals or texture mixes so
  tiling never shows, foreground silhouettes at the frame edges. 12-48 distinct textures per map
  (visualLint).
- Tilt-shift band on the leader, area `focus` on set pieces, fog depth.
- The palette of 12.1, visibly different from the neighbouring locations.
- Readable on a phone: the portrait pull-back works, prompts are visible, and in cutscene frames the
  speakers sit above the dialog box.
- Side by side with the POC references it does not look flatter.

### 11.2 Boss and enemy checklist

- Bosses: section 7.9, a 4+ frame idle with secondary motion, a bespoke arena with its own centerpiece
  and lighting, an intro card, at least one custom fx move with a telegraph, at least one mid-battle
  beat (say, summon, transform, untargetable, cue), the ultimate awakening in the four traveler
  chapters, a defeat choreography, the victory outro, and the field presence in the aftermath.
- Regular enemies: at least 3 of each chapter's 4 have a new silhouette; `preview-enemies.js?art=<a,b>&compare=drone&mobile=1`
  shows each next to the POC drone at the same scale at phone size; each has its signature behaviour
  (7.8). Driftmarket townsfolk show at least 6 distinct looks (registered with `base` inheritance).

### 11.3 Staging rules

- Every key scene (`key: true` in `scenes`) uses at least two staging devices besides text: movement,
  camera focus/view/pan, emote, pose or expression, a light or particle change, a music change,
  hologram actors. The dry run counts them (10.3).
- Show, not tell: Voss's flare report plays as a hologram of the star flaring; memory shards are acted
  by hologram actors with music; the Ione reveal is a new Starchart node, not a speech.
- Scripts never assume who leads (4.2): every speaking traveler is gathered, and `cs.say` reports a
  party speaker who is not visible. Each location scenario runs a second time with a different
  leader (`1N-<loc>-alt.json`).
- The chapter card makes that chapter's traveler the leader; every party member speaks in each
  chapter's key scenes (the dry run checks it).
- WARDEN is present before the finale and always recognisable: gold sigil instead of a portrait,
  slower text, choir sfx, soft-gold light and sigil screens while it speaks (4.2, 8.5, 12.3).

### 11.4 Shader programs and compiling (S2b `core/programs.js` and `engine.js`; used by S1a and S4)

three r170 frees a program when its last material is disposed, and the POC disposes every battle
material, so each battle and each map change recompiled. The fix:

```js
// core/programs.js
export function release(material)   // instead of material.dispose(): if no anchor holds this material's program
                                     // (renderer.properties.get(m).currentProgram.cacheKey), the material becomes the
                                     // anchor: its texture slots are nulled so canvases can be freed, and it is never
                                     // disposed; otherwise material.dispose()
export function anchorCount() -> number
// core/engine.js
engine.compileScene(scene, camera) -> Promise   // renderer.compileAsync (parallel compile where supported), else compile
```

- `loadMap` builds the new World, attaches the rig, awaits `compileScene`, switches the view, and only
  then disposes the old World (3.7). The shatter `onMidpoint` awaits `compileScene` on the battle stage.
- `World.dispose`, `BattleStage.dispose` and arena teardown release materials through `release`.
  Revision 1's zero-size keep-alive meshes are dropped (`World.dispose`'s traverse would dispose them).
- The field rig (3.7) and arena light budgets (7.5) are fixed per quality, so programs match across
  maps and arenas.
- `renderInfo()` is meaningful: `renderer.info.autoReset = false`, `info.reset()` at the top of
  `engine.render()`; the RenderPass and `renderer.shadowMap.render` are wrapped to attribute calls and
  triangles to `scene` and `shadow`; post passes are counted separately; `compiles` counts
  `gl.linkProgram` calls (wrapped once at engine start).
- Acceptance: a second visit to a map and a second battle in the same arena show `compiles === 0`; a
  quality change recompiles once.

### 11.5 Memory: art cache and prewarm

```js
// art/cache.js (S1b): used by tiles, characters, paint, spriteActor glow sheets, enemies and fx sheets (S4)
export const artCache = {
  get(key), set(key, value, { bytes, loc }), acquire(key), release(key),   // acquire: in use by a live World / BattleStage
  evictLocation(locId), trim(), get bytes(), budget,
};
export function releaseCanvas(canvas)    // width = height = 0, so WebKit frees the backing store
```

- Budget: 150 MB of canvases on touch devices, 400 MB otherwise. One 256-px boss form is about 14 MB.
  `trim()` runs after every map load and battle and drops least-recently-used entries that are
  neither acquired nor pinned (`core`, `common`, `prologue`, the current location) until under budget.
- Travel calls `evictLocation(loc)` for every location whose chapter is finished and which is not the
  destination or pinned. Evicted art repaints on demand behind covers.
- SpriteActor glow sheets are refcounted textures: `stage.warm()` and actors acquire them; the last
  release disposes the texture; `BattleStage.dispose` releases its actors.
- Prewarm (S2b `content/prewarm.js`): `collectArt(locId)` follows MapDef textures, props, NPCs,
  bosses and companions, every encounter's enemies through `art`, `phases[].transform`,
  `onDefeat.transform` and `actions[].summon.kind`, arena textures, portrait expressions used by the
  location's scripts, and `story.preload`. `prewarmLocation(locId)` paints it one job per macrotask,
  behind covers only (travel runs it during the Moth flight). Idle prewarm of the next destination
  runs light jobs (< 30 ms each) only.
- Boot paints the title, the Halcyon, the party, BOLT and HALCYON only: `prewarmWorld()` no longer
  paints every `TEXTURE_NAMES` entry. Boot to title <= 4 s on a laptop.
- Acceptance (I2a): after two full tours of all maps, `canvasMB` stays under the budget and textures and
  geometries are within 10% of the first tour.

### 11.6 Quality tiers and budgets

Touch devices start on medium (POC rule). Budgets depend on the tier, and the light counts are fixed
per tier so shader programs stay shared:

| | high | medium | low |
|---|---|---|---|
| pixel ratio cap | 2.0 | 1.5 | 1.0 |
| shadows | PCFSoft, field map 2048 | PCF, field map 1024 | off |
| arena shadow map | 2048 | 1024 | off |
| field point-light pool | 8 + hero | 4 + hero | 2 + hero |
| field spot light | on | off | off |
| arena point lights | 6 (2 rims + 4) | 4 (2 rims + 2) | 2 (rims) |
| arena spot light | on | off | off |
| particles | 100% | 75% | 50% |

Budgets (measured with `debug.renderInfo()`, scene pass, high tier at 1280x720):

| | Field | Battle |
|---|---|---|
| scene draw calls | <= 220 | <= 160 |
| shadow draw calls | <= 140 | <= 90 |
| scene triangles | <= 150k | <= 80k |
| particles | <= 2600 (1400 low) | <= 3600 |
| distinct textures | 12-48 per map, backdrops <= 2 (1024x512) | <= 32 per arena |
| compiles on a revisit | 0 | 0 (same arena) |

- Map switch behind the fade: <= 1.5 s first visit, <= 0.4 s revisit on a mid laptop.
- Phones: 30+ fps on medium, 45+ on low. SwiftShader numbers are not meaningful; I2a measures on at
  least one real phone (or states that none was available).
- `?stats=1` (S2b `perf.js`): an overlay with fps, frame ms, scene draw calls, programs, textures,
  compiles and canvas MB.
- **Automatic quality drop** (`perf.js`): 3 s after each map load and after the first battle of a
  session, if the average frame time over 3 s exceeds 33 ms on high or medium, drop one tier, toast
  "Graphics lowered for smoother play", and store it in settings. Only downward, at most once per
  60 s, never with `?q=` or after the player chose a quality in Settings.

### 11.7 Pacing and story budgets

A regular fight at human speed takes about 50-70 s, so fights, not walking, set the pace. Targets for
a first-time player on the critical path:

| Chapter | Fights (scripted + random) | Zone walking | Story | Total |
|---|---|---|---|---|
| Prologue | 8 (tutorial, rescue, squad, Sentinel + 4) | ~170 units | ~5 min (cold open included) | 18-22 min |
| Ch1 | 10-12 | ~200 units per dungeon map | 5-6 min | 22-26 min |
| Ch2 | 8-10 | 300-380 units | 4-6 min | 16-20 min |
| Ch3 | 8-10 | 300-380 units | 4-6 min | 16-20 min |
| Ch4 | 8-10 | 300-380 units | 5-6 min | 16-20 min |
| Finale | 8-10 (2 elites included) | 300-380 units | ~8 min (dreams included) | 20-24 min |
| Epilogue | 0 | none | ~5 min | 5-7 min |
| | | | | 113-139 min |

- Encounter rate: `ZONE_RATE_DEFAULT = { grace: 12, sigma: 24 }` (`balance.js`), about one encounter
  per 42 units of zone walking; the POC constants (8, 13.5) remain only for POC zones. C10 raises XP
  and credits per fight so the level targets hold with these fight counts.
- Story budgets: no scene longer than 2.5 minutes or 25 boxes before the player gets control back (the
  resolution may run 4 minutes); boxes of at most 100 visible characters (aim for 90); at most 3
  mechanics boxes before the first battle; memory shards at most 6 boxes; dreams at most 15 boxes
  each; Party Talks at most 10 boxes.
- Measured, not estimated: `debug.pacing()` reports seconds in field, battle, cutscene and menus per
  chapter. The G2 and G3 directors and I1b run `92-human-pace.json`; a chapter more than 20% outside
  its total fails.

### 11.8 Puzzle rules

- Flipping a switch pans the camera to the gate it opens and back (`reveal`); `guide` strips link each
  switch to its gate.
- At most 3 puzzle elements per room; no encounters in puzzle areas (`puzzle: true`); no fail states
  (switches toggle, nothing locks for good).
- The Journal hint follows the puzzle state (one objective per step, or hints keyed by flags).
- Each chapter escalates: introduce, twist, combine.
  - Ch1: two levers restore the Meridian's emergency power and open the reactor hall
    (`story:meridian_power`).
  - Ch2: valves drain the channels: one valve; then a valve that floods another channel; then two
    valves in order (`story:channels_drained`).
  - Ch3: laser grids switched by terminals: one grid; then a terminal that toggles two grids; then
    grids combined with Kade's security override (leader-gated).
  - Ch4: the three crystals in any order (the Nth collected plays the Nth memory: launch, lullaby,
    Severance), plus light bridges opened by data switches.
  - Finale: light bridges and lifts only.

---

## 12. Content briefs (binding ids per location)

### 12.1 Palette and mood

Neighbouring areas contrast. Owners match this table; the gates check it on contact sheets.

| Location | Base palette | Accents | Fog and mood | Particles | Track |
|---|---|---|---|---|---|
| Halcyon crew decks (POC) | steel blue, amber work lamps | cyan instruments | cool blue | dust, steam | `explore` |
| Exterior (cold open) | Tethys amber and cream bands, black space | starlight on the hull | none | stars | `warden` |
| Driftmarket | warm lantern amber, patched copper plates | red prayer ribbons, teal Tethys light through viewports | warm haze | drifting ice crystals, lantern sparks | `driftmarket` |
| Shoals | glowing cyan ice, deep blue | white rime highlights | dense cold blue | snow, drip | `shoals` |
| Meridian wreck | black ice, rusted gunmetal | sodium-orange emergency light, faded prayer ribbons | dark, low hemisphere, orange pools | frost flakes, sparks | `meridian` |
| Arboretum | deep green, bioluminescent teal and violet | warm Tethys light through the domes, pink blooms | humid green haze | firefly, spore, rain, petal | `arboretum` |
| Choir Chamber | black with white-gold pod glow | the gold WARDEN sigil | soft gold haze | mote | `choir` |
| Security Spire | red and black, stark white floodlights | gold sigil propaganda screens | hard, thin fog, high contrast | ash, alarm strobes | `spire` |
| Memory Vault | cyan and violet on a black data starfield | magenta glitches | deep violet | data, glitch | `vault` |
| Heart | gold choir light over black, receding pod lights below | dawn white at the crown after the resolution | vast, thin gold | mote, light streams | `heart` |
| Dreams | each dream's place in saturated gold-hour light | over-bright bloom, soft vignette | low contrast, "too perfect" | petal, mote | `lullaby` variants |
| Ione | dawn pink and pale blue ice, Tethys rising | warm sunrise rims | thin cold mist | snow, breath | `ione` |

### 12.2 Lore fixes, callbacks and canon (binding; WRITING.md holds the full tables)

- POC lines are replaced, not ported: "Thessaly IV" is Tethys; Kade is a **Lieutenant**, not a
  Commander; "Chief Engineer Osei" gets a name from WRITING.md's crew list; HALCYON never says "we are
  moving" (the jump drive is cold, its coil was ejected); Nyx does not speak in BOLT's intro (she has
  not joined).
- Setups and payoffs (setup owner -> payoff owner):
  - the POC aft-sensor "unidentified signal, repeating" becomes the Ringborn beacon (prologue ->
    driftmarket);
  - Sera's forced-open pod: BOLT tried to wake her (prologue -> vault);
  - Ruse's ch1 reveal stays partial ("Ask your ship what it carries."); in ch4 HALCYON combines the
    Ringborn data and the Arboretum seed vault into "Ione can be home" (driftmarket -> vault);
  - the legend of "the Lock that sings ships to sleep" (driftmarket) -> Nyx names WARDEN with it at
    the crown (dreams);
  - the Moth flight explains why the party flies between decks of their own ship: WARDEN sealed the
    internal transit (prologue);
  - the lullaby Orion taught HALCYON (vault, shard 2) -> Warden form 2 quotes it (warden, audio) ->
    the resolution plays it (dreams);
  - Voss swearing Kade in (spire) -> Kade's dream (dreams) -> Voss's voice shields Kade (warden) ->
    the halberd at the memorial wall (epilogue);
  - MOTHER-7 tending her "seedlings" (arboretum) -> freed -> tending the garden (epilogue);
  - Theo's voice at Warden's 50% (warden) -> "Did I miss anything?" (epilogue);
  - WARDEN's "Sleep is not death. Sleep is shelter." opens the game (prologue); Kade's "Then we make
    somewhere." (spire) -> "Then we'll build a world worth waking for." is the last line before the
    VOIDPATH logo (epilogue).
- Canon facts: Earth's Conclave; Elysia; Tethys and its moon Ione; 143 years since launch; 412 days
  since the Severance; the Meridian arrived 80 years ago; 12,000 sleepers, 4,000 moved to the
  Arboretum; Theo is in pod 2271.

### 12.3 The world reacts

- `extends` carries `lights`, `ambient`, `props`, `npcs` and `talk`, all chapter-bounded.
- Every chapter owner adds 3-5 updated Driftmarket NPC lines (`extends.driftmarket.talk` on the stable
  NPC ids C2 lists in WRITING.md) and 1-2 visible Halcyon hub changes at the prologue's anchors: a
  Ringborn trader stall after ch1 (`hub_stall`, driftmarket), seedling planters after ch2
  (`hub_planters`, arboretum), Voss's empty security post after ch3 (`hub_voss_post`, spire), and
  HALCYON's bridge hologram steadier each chapter (`hub_halcyon`; whole after ch4, vault).
- WARDEN is present before the finale: its voice over the speakers at the end of ch1, the sigil glow
  on the Choir pods (ch2), the Spire's propaganda screens and looped voice (ch3), the memories (ch4).

### 12.4 Per-map quotas (M1 unless marked)

- Treasure: at least 1 gear chest on the critical path, at least 1 off-path secret, and at least 1
  leader-gated interaction per map (Nyx cracks a lockbox, Orion coaxes a terminal into extra lore,
  Sera treats a wounded NPC, Kade uses a security override). The balance simulator assumes the chests'
  gear, so they exist from M1.
- People: Driftmarket 12+ NPCs (6+ looks, 3+ walking paths); Arboretum MOTHER-7 log terminals and a
  pair of harmless drones that "tend" the party; Spire holding cells with imprisoned cadets (freeing
  them, `story:cadets_freed`, opens the `quartermaster` shop and a Med-Station); Vault 6-10 talkable
  crew "memory echoes" replaying voyage moments.
- Party Talks: two per chapter (one in the prologue), pairs and subjects from WRITING.md, for example
  Kade and Nyx (ship versus Ringborn), Nyx and Orion (trusting AI), Kade and Sera (promises), Orion and
  Sera ("you taught it to grieve").
- One-way shortcuts back to the entrance: Meridian reactor hall to the Shoals mouth, Choir gate to the
  Arboretum dock, command deck lift to the Spire dock, Vault core to the entry.
- M3 delights (data only): one rare encounter per chapter with big drops; 2-3 Ringborn favours posted
  in Driftmarket (side objectives) and completed in later maps; one optional elite per chapter
  guarding its top accessory (5.5).

### 12.5 Location briefs

Spawns and anchors listed here are binding (other owners travel to them).

**prologue** (C1): maps `halcyon` (POC crew decks extended), `moth` (Moth cockpit, tiny,
`transit: true`), `exterior` (`scene: true`: the Halcyon drifting over Tethys; spawn `view`).
- `halcyon` spawns: `start`, `cryo`, `medbay`, `corridor`, `engineering`, `engineering_reactor`,
  `antechamber`, `berth`, `bridge`, `bridge_starchart` (S1a defines all but `medbay` and `berth`,
  which C1 adds with the rooms). Existing coordinates never move; new rooms (cryo medical bay, reactor
  control room behind shutters, the Moth berth airlock by the bridge) are appended (new rows at the
  bottom or columns on the right only). Anchors `hub_stall`, `hub_planters`, `hub_voss_post`,
  `hub_halcyon`, `memorial` (a memorial wall on the Cryo Deck). Interactables: `starchart` on the
  bridge and at the berth, `fabricator` shop in the antechamber, Med-Stations. Cryo pods are `pod`
  props with `status: 'story:revival_authorized'`.
- `moth` spawn `cockpit`; script `travel.flight` (3-5 s; explains WARDEN's sealed internal transit).
- `story.newJourney` points at `exterior:view` and `prologue.new_journey`: the cold open (20-30 s of
  the Halcyon over Tethys, WARDEN's "Sleep is not death. Sleep is shelter."), the PROLOGUE card,
  `cs.goto('halcyon', 'start')`, Kade waking, BOLT. The card's save lands at `halcyon:start` when the
  script ends.
- Story: STORY prologue beats 1-6; BOLT's tutorial battle `pro_tutorial` (3 mechanics boxes at most
  before it); `pro_orion_rescue`, `pro_sentinel_squad`, `pro_boss_sentinel`; the HALCYON fragment over
  the Sentinel's wreck; the CH1 card; BOLT and HALCYON fallback hub talk.
- Owns `common/story.js` in C-alpha: the shared speakers (KADE, NYX, ORION, SERA, BOLT, HALCYON, and
  WARDEN with its style), every global tip (7.7), the BOLT companion, `common.bolt_talk`,
  `common.leader_hint`.
- Enemies `pro_drone`, `pro_crawler`, `pro_turret` (POC art, prologue numbers), `sentinel_mk1` (new
  silhouette by CA-alpha), `pro_sentinel` (boss). Zones `pro_corridor`, `pro_engineering` (+ `pro_late`
  after ch1: Mk-I patrols tighten their hold).
- Objectives `pro.*`; one Party Talk. Owns `tests/scenarios/0*-*.json`, `10-prologue.json`,
  `10-prologue-alt.json`, and redefines the `poc` jump (2.9).

**driftmarket** (C2): map `driftmarket` (spawns `dock`, `from_shoals`; anchors `ruse_stall`,
`viewport`). Ring-station town: lantern-lit stalls on wreck plates, prayer ribbons, Tethys filling
the windows (`bd_tethys_close`), drifting ice crystals, an inn (`med` labelled Rest), Ruse's shop
(`ruse`), a Moth berth with a Starchart, a favours board (M3), the legend of "the Lock that sings ships
to sleep"; exit to `shoals:from_driftmarket`. Characters `ruse` (with expressions) and Ringborn
townsfolk. Ch1 beats 1, 2, 5, 6: the arrival (shop and leader-switching tips), Ruse and the Maw,
`driftmarket.return` (after the Maw: the partial seeding reveal, Nyx joins for real),
`driftmarket.coil_install` on the Halcyon through `extends.halcyon` (WARDEN speaks, the manifest, CH2
card), the hub stall. Two Party Talks; objectives `ch1.go_driftmarket`, `ch1.*`; recap `ch1`. No
battles.

**shoals** (C3): maps `shoals` (spawns `from_driftmarket`, `from_meridian`) and `meridian` (spawns
`from_shoals`, `reactor_hall`). Ice tunnels with glowing blue ice and frozen Meridian cargo; the
Meridian's broken spine in black ice with sodium-orange emergency light and prayer ribbons; Captain
Varo's quarters (log, Nyx weapon); the emergency-power puzzle. Enemies (data and AI) `ice_mite`,
`void_eel`, `rime_golem`, `salvage_bot` (art by CA-alpha); boss `maw` (data, art, arena, fx by C3).
Arenas `shoals`, `meridian`, `maw_lair`. Zones `shoals_tunnels`, `shoals_deep`, `meridian_spine`.
Gives `lattice_coil`. The Maw aftermath: `cs.goto('driftmarket', 'dock')`, then `cs.run('driftmarket.return')`.

**arboretum** (C4): map `arboretum` (spawns `dock`, `channels`, `stasis`, `choir`; anchor `glass`).
Biodome deck: bioluminescent flora over steel, water channels drained by valves (`switch.valve`,
`water` cells), sprinkler rain, glass domes, fireflies, MOTHER-7 log terminals and tending drones;
Stasis Gardens; the Choir Chamber of humming, sigil-lit pods (Theo's pod). Enemies `spore_drone`,
`bloom_mantis`, `rootling`, `feral_caretaker`; boss `gardener`. Characters `theo` (sleeper, with
expressions), `mother7` field presence. Arenas `arboretum`, `choir_gate`. Zones `arb_gardens`,
`arb_stasis`. Sera's ultimate; hub planters; CH3 card; two Party Talks; recap `ch2`.

**spire** (C5): map `spire` (spawns `dock`, `barracks`, `cells`, `quarters`, `training`, `command`,
`antechamber`, `from_vault`). Red-alert tower: barricades, holding cells with cadets, armory, laser
grids switched by terminals (`gate.laser`), turrets, WARDEN propaganda screens (`screen` props with
the sigil), Kade's quarters (Oathkeeper), the training hall, the holo-recording of Voss swearing him
in, the command deck (the flare report as a hologram of the star flaring), the core antechamber with
the neural interface (exit to `vault:entry`, `when: 'story:core_open'`). Enemies `sec_trooper`,
`riot_drone`, `sentinel_mk3`, `laser_turret`; boss `voss` (+ `voss_overclock`). Character `voss`
(field, poses `kneel` and `collapse`, portrait expressions). Shop `quartermaster`. Arenas `spire`,
`spire_command`. Zones `spire_barracks`, `spire_upper`. Gives `command_key`; Kade's ultimate; Voss's
empty hub post; CH4 card; two Party Talks; recap `ch3`.

**vault** (C6): map `vault` (spawns `entry`, `core`). Cyberspace: glowing grid floors over a data
starfield (`underlay`), floating platforms (`pit` cells), data pillars, light bridges, corrupted
magenta glitches, 6-10 crew memory echoes, three crystals (`shard:vault:a|b|c`) whose Nth pickup plays
the Nth memory (`vault.memory_launch`, `vault.memory_lullaby`, `vault.memory_severance`, setting
`story:memory_*`). Enemies `data_wraith`, `firewall_golem`, `glitch_swarm`, `corrupted_memory`; boss
`echo`. Arenas `vault`, `vault_core`. Zones `vault_grid`, `vault_core`. The BOLT reveal (with the
pod payoff), Orion's ultimate, HALCYON restored, the Ione node, the FINAL CHAPTER card on the bridge,
post-ch4 hub talk; two Party Talks; recap `ch4`.

**heart** (C7): map `heart` (spawns `dock` with a Moth berth and Starchart, `tier2`, `tier3`,
`crown`). Vertical reactor-cathedral: ring platforms over an `underlay` of receding pod lights, a
steeper camera (`view: { pitch: 48 }`), lifts between tiers (`lift`: the camera rises while light
streams fall), light bridges (`gate.bridge`), slowly rotating rings, choir pods as stars (`bd_choir`).
One dream trigger per tier in this order: Kade (dock tier), Nyx (tier 2), Orion (tier 3), Sera (crown
approach), each running `dreams.<member>`. The crown lift confirms "Beyond this point there is no way
back." and the crown trigger runs `dreams.crown`. Enemies `warden_seraph`, `dream_eater`,
`choir_guardian` (art by CA-gamma), elites `elite_rime_golem`, `elite_bloom_mantis`,
`elite_sec_trooper`, `elite_firewall_golem` (base art + `tint`, stronger kits). Arena `heart`. Zones
`heart_ascent`, `heart_crown`.

**dreams** (C8): map `dreams` (`scene: true`; spawns `kade`, `nyx`, `orion`, `sera`): four sets built
from other locations' registered textures and props in gold-hour light: Kade, the Spire training hall
in gold with Voss; Nyx, the Meridian green and whole; Orion, a flawless, silent HALCYON on the bridge;
Sera, golden fields with a grown Theo (`theo_grown`, `base: 'theo'`).
- `dreams.<member>`: `cs.goto('dreams', member, { scene: true })`, the temptation, `cs.choice('', ['Stay.', 'Wake up.'])`
  (Stay plays one extra beat, then the traveler refuses anyway), the refusal in their own words, the
  keepsake accessory, `story:dream_<member>`, and back to the tier.
- `dreams.night_before` (the Heart destination's `before`): "Spend the night aboard first?"; if yes,
  four 4-6-box vignettes on the Halcyon (Kade on the Cryo Deck, Nyx at the Moth berth, Orion at the
  reactor, Sera in the medbay), then the flight.
  It is one optional montage before the flight rather than four NPCs left around the ship, so it
  never depends on who leads.
- `dreams.crown`: the approach, Nyx naming "the Lock that sings ships to sleep",
  `cs.battle('heart_boss_warden')`, then the resolution beat by beat: (1) the battle outro; (2) Warden's
  construct folds down to HALCYON's size; (3) HALCYON steps out of BOLT; (4) "I was so afraid for
  them." / "I know. Me too."; (5) Orion's line; (6) the merge flash; (7) the Choir light turns from gold
  to dawn white; (8) the lullaby plays. Then `story:warden_merged`, `story:finale_done`, the EPILOGUE
  card, and `cs.goto('halcyon', 'cryo')` so the post-battle save lands on a real map.
- Also owns `epilogue/**` (below), `17-dreams.json` and `18-epilogue.json` (+ `-alt`).

**warden** (C11): no maps. EnemyDefs `warden_lock`, `warden_unbound`; encounters `heart_boss_warden`
(with `retryPhase`) and `heart_boss_warden_2` (form 2 only); the boss script (7.9); 256x256 art for
both forms with `fitBox`; arena `heart_crown` (reacts to the transform and the cues); fx
`warden.lullaby`, `warden.cradle`, `warden.requiem`, `warden.defeat`, `cue.protect`,
`cue.ultimatesRecharged`; `19-warden.json` (form 1, transform, form-2 beats, Retry from the second
form). Music is C9's.

**epilogue** (C8): map `ione` (spawn `shore`; a Moth berth with a Starchart; `sky` `bd_ione_dawn` with
Tethys rising; `view` for low shots). Destination `ione`. A flag trigger added to `halcyon` through
`extends` (`when: 'chapter>=epilogue & !story:game_clear'`) runs `epilogue.main`:
1. the Cryo Deck: pods flip from REVIVAL DEFERRED to REVIVAL AUTHORIZED (`story:revival_authorized`),
   Kade sets Voss's halberd before the memorial wall;
2. Theo wakes ("Did I miss anything?"), Sera and Theo at the Arboretum glass, MOTHER-7 tending;
3. Nyx and Ruse at Driftmarket ("Ship-people. Always late.");
4. Orion teaching HALCYON to paint on the bridge;
5. Ringborn skiffs escorting the Halcyon toward Ione (`exterior`);
6. Ione's shore at dawn, the four travelers and BOLT on the ice, Kade's "Then we'll build a world
   worth waking for.", the VOIDPATH logo, `story:game_clear`, `unlock:ione`, `cs.ending()` (credits
   over the live diorama with a cast roll, THE END, stats).
Vignettes 1-5 use scene gotos; the last goto, to `ione:shore`, is an ordinary one so the queued save
can land there (6.2). After a clear the travelers, BOLT and Theo stand on the shore with one
last line each. `REG.credits` with cast lines; recaps `finale` and `epilogue`; `bd_ione_dawn` also
feeds the title variant (4.4).

**common** (C10 data, C1 story): items, equipment, kits per chapter, `fabricator` shop data;
`story.js` as listed under prologue.

**dev** (Wave S): `dev_box` map (S1a): two rooms joined by a door exit, a water channel with a valve, a
laser gate with a switch and a linked guide strip, a pit with underlay, a chest, an NPC on a path, an
open-sky edge (`sky`), a lift, a leader-gated interactable, a `screen` prop, a `pod` with `status`,
exits to and from `halcyon:start`. Scripts `dev.demo` (exercises every `cs` call), `dev.npc_talk`,
`dev.shard` (S2a). Encounters `dev_party1`..`dev_party3` scaling tests, `dev_summon`, `dev_transform`,
`dev_submerge`, `dev_sleep`, `dev_winon`, `dev_charge`, `dev_cue`, `dev_ultimate` (S3, POC art); fx
`dev.beam` (S4). Reachable only through debug hooks.

---

## 13. Work breakdown

Owners work file-disjoint inside a wave. "Files" are exclusive to that task for the wave; new files
in a listed folder belong to its owner. Everything else is read-only. Each task's final report lists
API deviations, known issues and screenshot paths.

**Early stubs.** Parallel tasks import each other's modules. In its first minutes every task creates
each file in its list that others import (valid empty default exports, or functions that return
neutral values with the signatures in this plan), so the build always resolves. In Wave C the same
rule covers binding ids: each owner first registers stubs for every script, spawn, anchor, character
and art id that this plan says others use (for example C8 registers `dreams.kade` before C7's
triggers reference it). Code against the contracts here, not against another task's work in
progress; test in isolation with previews, fixtures and unit tests; the gates wire the real pieces
together.

**Schedule.** "A few agents at a time": each line below may run in parallel; arrows are binding.

```
Wave S    step 1: S1a, S2b, S3, S5        step 2: S1b, S2a, S4, W          -> G1
Wave C    C-alpha: C1, C2, C3, CA-a, C9a, C10a                           -> G2 review
          C-beta:  C4, C5, C6, CA-b1, CA-b2, C9b, C10b  + alpha fix tasks  -> G3 review
          C-gamma: C7, C8, C11, CA-g, C9g, C10g          + beta fix tasks
Wave I    I1 -> I1b -> I2a, I2b, I2c, I2d -> I3
```

Step 1 of Wave S lays the foundations others code against (world core, registry and engine, rules,
UI); step 2 builds on them. If more agents can run at once, the two steps of Wave S may merge. C-alpha
is the golden chapter: nobody starts C-beta before G2 has played it and set the bar.

### Wave S: systems (8 tasks in two steps, then gate G1)

**S1a `world-core`: multi-map world, field and camera**
- Files: `src/world/{world,explore,camera,lighting,geometry,player,mapdef,cond,maps}.js` (`maps.js` as a
  re-export shim), `src/content/prologue/maps/halcyon.js`, `src/content/dev/maps/**`,
  `src/content/dev/props.js`, `src/tools/preview-world.js`, `tests/cond.test.mjs`, `tests/mapdef.test.mjs`.
- Builds: sections 3.1, 3.2, 3.4, 3.5, 3.7, 3.8, 3.10, 3.11, 3.13; the companion follow logic; the POC
  map converted to `halcyon.js` (`poc: true`, the POC lines inline, the spawns of 12.5, identical
  look); the persistent lighting rig with the tier counts of 11.6; `dev_box` (12.5);
  `preview-world.js?map=<id>&view=<viewpoint>` and `__PREVIEW.cycle(n)` (loads maps back and forth n
  times and returns `renderInfo` before and after).
- Depends on S1b (props, actors, emotes, water, sky) and S2b (`programs`, `compileScene`, registry)
  through the contracts. Until the registry lands, previews normalize the map files directly.
- Acceptance: `npm test` green (51 POC tests + cond + mapdef, including rejected W/D/L fixtures);
  `halcyon` screenshots at the 5 POC viewpoints match `docs/screenshots/{cryo,corridor,engineering}.jpg`
  in look; `dev_box` screenshots: water before and after the drain, laser gate closed and open, pit
  edge over the underlay, NPC mid-walk with an emote, the sky edge at the default pitch and at 12
  degrees, a lift ride; `cycle(10)` shows `compiles === 0` after the first cycle, one shadow map, and
  textures and geometries within 5%.

**S1b `world-art`: props, actors, art registries and caches**
- Files: `src/world/{props,actors,emotes,water,sky,paint,lint}.js`,
  `src/art/{tiles,characters,painter,palette,cache}.js`, `src/core/{particles,vfx,spriteActor}.js`,
  `src/content/dev/art.js`, `src/tools/preview-{tiles,characters,vfx}.js`.
- Builds: sections 3.3 (built-in props and LivingProps: chest, switches, gates, shard, starchart,
  `screen`, `pod` status, linked `guide`), 3.6 (NpcActor, poses, expressions), 3.9, 3.12 (registries,
  fallbacks, presets, the `warden_sigil` texture), 11.5 (art cache, refcounted glow sheets),
  `visualLint`.
- Acceptance: preview pages show every new preset, the poses and expressions of the four travelers,
  BOLT's eyes and HALCYON's variants, and the new prop types; unknown ids render placeholders with one
  `console.warn` each; a cache page (`preview-tiles.html#cache`) shows eviction and `releaseCanvas`
  working under a forced 20 MB budget.

**S2a `flow`: game flow, story, cutscenes, travel, saves flows, debug hooks**
- Files: `src/main.js`, `src/core/{game,titleScene,input,util}.js`, `src/story/**`,
  `src/content/dev/{pure,index,story}.js`, `tests/story.test.mjs`, `tests/jump.test.mjs`,
  `tests/scenarios/**`.
- Builds: sections 4 (all), 6.2, 10.1, the UI hook wiring (8.1), speaker registration, the title
  variant; `game.newJourney/continue/load/startBattle/retry/finish`; `ctx.story`, `ctx.cutscenes`,
  `ctx.travel`, `ctx.content`.
- Depends on S1a, S1b, S2b, S3 and S5 through the contracts.
- Acceptance: `npm test` green, including `story.test.mjs` (runner with a fake ctx: nesting, no
  queue deadlock with a nested flight, `abortAll`, `seen:` only after completion, deferred saves,
  forced leader restored) and `jump.test.mjs` (`buildJumpState` with `doneFlags`); scenarios 01, 03,
  05, 06 still pass (New Journey shows no blocking dialog in Wave S); `2N-dev-*.json`: the `dev_box`
  exit and back with fades and banners; `cs.battle` right after `cs.goto` starts once the transition
  ends and the script resumes only after the fade-in; losing a scripted dev battle and choosing Retry
  replays its trigger with the pre-fight part auto-skipped; Med-Station save, reload and Continue
  restore map, position, party, inventory, flags and play time; the autosave count rises only when the
  outermost script ends; localStorage forced to throw (`Storage.prototype.setItem = () => { throw new
  Error() }`) still plays with the memory notice; `debug.runScript('dev.demo')` runs every `cs` call
  without errors (screenshot each step); `jumpTo` of every chapter lands somewhere valid.

**S2b `pipeline`: registry, prewarm, engine instrumentation, lints and tools**
- Files: `src/content/{registry,data,index,chapters,prewarm}.js`, the stub files of the ten Wave C
  folders (2.1), `src/core/{engine,postfx,programs,perf}.js`, `tests/content.test.mjs`,
  `tests/scripts.test.mjs`, `tools/**` (`play.mjs`, `scenarios.mjs`, `scriptcheck.mjs`,
  `contact-sheet.mjs`), `build.mjs`, `package.json` (scripts `scriptcheck`, `balance`, `contact`),
  `src/tools/preview-{engine,foundation}.js`.
- Builds: sections 2.1 (stubs), 2.6, 4.1 (`chapters.js`), 10.3, 11.4, 11.5 (prewarm), 11.6 (tiers in
  the engine, `perf.js`).
- Acceptance: content and script lints pass on `dev` and the stubs and fail on seeded fixture
  violations (a spawn on a wall, a flag nobody writes, a 101-character box, a missing script, an
  unbounded `extends` entry); `registerAll()` twice is a no-op; `renderInfo()` reports separate scene,
  shadow and post counts and a working `compiles` counter in `preview-engine`; `?stats=1` shows the
  overlay; `perf.simulate(45)` triggers one automatic drop with its toast; `npm run contact -- halcyon`
  produces a contact sheet next to the POC references.

**S3 `rules`: battle rules, state, progression, equipment, shops, save format**
- Files: `src/battle/{model,data,scripts}.js`, `src/core/{state,progression,shop,save}.js`,
  `src/content/common/**` (including the `story.js` stub), `src/content/balance.js`,
  `src/content/dev/data.js`, `tests/simulate.mjs`, `tests/policy.mjs`, new `tests/progression.test.mjs`,
  `tests/save.test.mjs`, `tests/model-ext.test.mjs`.
- Builds: sections 5, 6.1, 7.1-7.3; new party skills in `SKILLS`; `BATTLE_RULES`; the `balance.js`
  skeleton with `statLine`, `ZONE_RATE_DEFAULT`, `overrides`, `applyBalance`; common items, equipment
  ids (5.5, 5.7), kits per chapter, the `fabricator` shop; dev encounters (12.5).
- Depends on nothing outside this plan (pure modules; tests run in node).
- Acceptance: the 51 POC tests unchanged and green; new tests cover statsAt anchors, learnsets and
  `ult:` ultimates, `newGame`/`joinParty`/leader/formation, party entries identical to roster entries
  and the party array kept across `deserialize`, equip/unequip/delta/optimize and every mod, the gear
  personality lint, buy/sell edge cases, save round trip with `keep`, v0 migration, corrupt JSON,
  throwing storage, party sizes 1-3 and difficulty scaling, sleep/jam/marked and `ailmentResist`
  (rng drawn only when present), `effect.limit`, untargetable and "Nothing to target.", AI dispatch (a
  scripted boss with a stat-less buff and a `heal` action neither crashes nor damages the party),
  lock-on and charge with `fires` and their break cancel, a mid-round summon (finite priorities,
  monotonic ids, joins next round), transform, weakShift, `setResist`, `override`, `cue`, `protect`,
  `cleanse`, grant and recharge of ultimates, the 3-BP ultimate rule, `winOn: 'boss'`, item damage,
  determinism of every dev encounter, and the new event shapes; `node tests/simulate.mjs` still runs.

**S4 `battleview`: battle presentation**
- Files: `src/battle/{battleState,stage,director,battleUI,arena,effects,actionfx}.js`,
  `src/art/{enemies,fx}.js`, `src/content/dev/{fx,arena}.js`, `src/tools/preview-{battle,enemies}.js`.
- Builds: sections 7.4-7.6; fx and cut-ins for the four ultimates and the awakening variant; the canned
  event fixtures; `preview-battle.js?enc=<id>&party=<n>&seed=<s>` and
  `preview-enemies.js?art=<a,b>&compare=drone&mobile=1` for any registered content.
- Depends on S3's event shapes through section 7.2 and the canned fixtures, never on S3's progress.
- Acceptance: POC battle screenshots unchanged in look (menu, break, boss lock-on, phone); screenshots
  at 1280x720 and 390x844 of: party of 1, 2, 3; a boss with two adds; a summon arriving; a transform
  mid-flash; a submerged and a phased foe with dimmed plates; a charge warning band; the battle dialog
  strip; the boss intro card; an ultimate cut-in and an awakening; sleep and marked icons; results
  with a learned skill and no false LEVEL UP; a 256x192 test art with `fitBox` that leaves the party
  full size on a phone; `compiles === 0` on a second battle in the same arena; 2 point lights on low.

**S5 `ui`: menus and screens**
- Files: `src/ui/**`, `src/art/icons.js`, `src/index.template.html`, `src/tools/preview-ui.js`.
- Builds: section 8.
- Depends on: S3's `core/progression.js`, `core/shop.js` and `core/save.js` (`listSlots` summaries);
  data for every page arrives as arguments or through `ui.setHooks`.
- Acceptance: `preview-ui.html#<page>` for `menu-party-formation`, `menu-equip` (with Optimize),
  `menu-journal` (recaps, side objectives), `menu-map`, `menu-items-gear`, `menu-settings`, `shop-buy`,
  `shop-sell`, `shop-equip-now`, `starchart` (locked Ione node, Heart warning), `saves-save`,
  `saves-load`, `card-chapter`, `caption`, `credits` (cast lines), `end`, `title-continue`,
  `gameover-load`, `gameover-phase`, `party-toast`, `objective-toast`, `location-banner`, `letterbox`,
  `dialog-warden`, `dialog-expressions`, `dialog-100chars` at 1280x720 and with `--mobile`; every page
  operable by keyboard, gamepad mapping and taps; POC pages unchanged.

**W `writing`: the writers' bible**
- Files: `WRITING.md`.
- Builds:
  - a voice sheet with five sample lines per speaker: BOLT (anxious honesty, "Mostly."), Nyx
    ("ship-people", "tin can"), Orion (addresses machines as friends), Sera (clinical, funny when
    scared), Kade (clipped military speech), WARDEN (soft, apologetic, no exclamation marks), HALCYON
    (fragments), Ruse (sardonic), Voss, Theo;
  - the canon facts and lore replacements of 12.2, and a crew name list;
  - the callbacks table (setup, payoff, owner of each);
  - a scene inventory per chapter: script id, trigger, purpose, speakers, box budget, staging devices,
    music, using the binding ids of 4.1, 7.9 and 12.5;
  - Party Talk pairs and subjects; the Driftmarket NPC roster (ids, looks, one line idea per chapter);
    voice notes for tips, BOLT hints and recaps.
- Acceptance: every binding script id in this plan appears in the inventory with a budget inside
  11.7; G1 reads it.

**Gate G1 (single agent, any file; fixes only, no new features)**: wire the eight tasks together,
resolve contract mismatches, delete the shims (`world/maps.js`, `world/script.js` once nothing imports
them), make `npm run build`, `npm test`, `npm run scriptcheck`, scenarios 01, 03, 05, 06 and `2N-dev-*`
and every preview pass strict, and confirm the S-task acceptance items in the real game page. Output:
a short list of contract deviations for Wave C, appended to the end of this file under "Wave S
deviations".

### Wave C: content (three sub-waves with review gates)

Each location owner owns `src/content/<loc>/**` except `enemyart.js`, its scenarios
`tests/scenarios/1N-<loc>.json` and `1N-<loc>-alt.json`, an optional `src/tools/preview-<loc>.js` and
`tests/<loc>.test.mjs`. Location owners depend on each other only through the binding ids in sections
4, 5, 7 and 12 and the stubs rule. All dialogue follows WRITING.md. Deliver in three milestones and
report each:
- **M1** critical path playable: maps with final floor and wall textures, exits, triggers, every story
  script with final text, chests and the quotas of 12.4, enemies (placeholder art allowed until the
  bestiary task delivers), boss mechanics including the ultimate awakening, tips.
- **M2** art and atmosphere: props, lights, particles, boss art, arenas, fx, the palette of 12.1.
- **M3** polish: NPC idle paths, the world-reacts additions (12.3), M3 delights, secrets.

**Bestiary tasks** (CA-*) own the `enemyart.js` files of their sub-wave's locations and paint the
regular enemies of 7.8 (art key = kind unless the location's data says otherwise), meeting 11.2.
Location owners write those enemies' data and AI.

**C-alpha** (after G1):

| Task | Owns | Scenario | Delivers |
|---|---|---|---|
| C1 | `prologue` and `common/story.js` | `01`, `02`, `04` rewrite, `10-prologue`(+alt) | 12.5 prologue; New Journey -> CH1 card, party of 4 at level 6-7 |
| C2 | `driftmarket` | `11-driftmarket`(+alt) | `jumpTo('ch1')` -> Starchart -> town -> Ruse -> Shoals exit; `jumpTo('ch1.return')` -> CH2 card |
| C3 | `shoals` (incl. the Maw's art) | `12-shoals`(+alt) | Shoals -> Meridian -> power puzzle -> Varo log -> Maw (submerge, ultimate) -> Driftmarket |
| CA-alpha | `prologue/enemyart.js`, `shoals/enemyart.js` | `preview-enemies` | `sentinel_mk1`, `ice_mite`, `void_eel`, `rime_golem`, `salvage_bot` |
| C9-alpha | `src/core/audio.js`, `src/tools/preview-audio.js`, `tests/audio.test.mjs` | preview bench | the engine changes of 9, `MOTIFS`, `driftmarket`, `shoals`, `meridian`, `lullaby`, `warden`, `sting_chapter`, new sfx |
| C10-alpha | `src/content/balance.js`, `src/content/common/**` except `story.js`, `tests/{campaign,policy,simulate}.mjs` | `npm run balance -- --check` (prologue, ch1) | kits, prices, equipment, the policy of 10.4 |

**Gate G2 (single director agent).** Files: `WRITING.md`, `docs/gates/G2.md`; any tool may run. It
builds the game, plays the prologue and ch1 with `92-human-pace.json` and reports `pacing()` against
11.7, produces the contact sheets, reads the script transcripts, and judges every item of 11.1-11.3,
11.7 and 11.8 pass or fail with screenshots, plus `missingArt()` and `poc: true` leftovers. It writes
a fix list per task to `docs/gates/G2.md` and may amend WRITING.md for later chapters. The C-alpha
owners then run their fixes as file-disjoint tasks beside C-beta; C9 and C10 fold theirs into their
next sub-wave.

**C-beta** (after G2):

| Task | Owns | Scenario | Delivers |
|---|---|---|---|
| C4 | `arboretum` | `13-arboretum`(+alt) | valves (before/after) -> Gardener (summon, dome light, ultimate) -> Theo -> CH3 card |
| C5 | `spire` | `14-spire`(+alt) | laser grids -> cadets freed -> quarters -> recording -> flare hologram -> Voss (overclock, ultimate) -> CH4 card |
| C6 | `vault` | `15-vault`(+alt) | crystals in two different orders -> BOLT reveal -> Echo (phase, Severance cancelled by a break) -> FINAL card |
| CA-beta1 | `arboretum/enemyart.js`, `spire/enemyart.js` | `preview-enemies` | 8 regular enemies |
| CA-beta2 | `vault/enemyart.js` | `preview-enemies` | 4 regular enemies |
| C9-beta | audio files | preview bench | `arboretum`, `choir`, `spire`, `battle_2`, `vault` |
| C10-beta | balance files | `--check` (ch2-ch4) | |

**Gate G3** does for ch2-ch4 what G2 did, in `docs/gates/G3.md`; the C-beta owners fix beside
C-gamma.

**C-gamma** (after G3):

| Task | Owns | Scenario | Delivers |
|---|---|---|---|
| C7 | `heart` | `16-heart`(+alt) | the ascent, lifts, light bridges, elites, dream and crown triggers |
| C8 | `dreams` and `epilogue` | `17-dreams`, `18-epilogue`(+alt) | the four dreams, the night before, the crown and resolution, the epilogue, credits, the post-game shore |
| C11 | `warden` | `19-warden` | Warden, both forms, its arena and fx, Retry from the second form |
| CA-gamma | `heart/enemyart.js` | `preview-enemies` | `warden_seraph`, `dream_eater`, `choir_guardian` |
| C9-gamma | audio files | preview bench | `heart`, `final_boss`, `final_boss_2`, `ione`, `credits`, the lullaby phrase in `title` |
| C10-gamma | balance files | `--check` (whole campaign) | |

Acceptance for the location tasks (C1-C8, C11): `npm test` and `npm run scriptcheck` green; scenario
and `-alt` strict pass; screenshots under `shots/<loc>/` of every viewpoint (desktop high and mobile
medium), every regular enemy in its arena, the boss intro card, one mid-battle beat and its signature
fx, every key scene's frame; the location's contact sheet; `visualLint` ok at every viewpoint;
`renderInfo` within budget and `compiles === 0` on a revisit; `missingArt()` empty for the
sub-wave's content. The gate, not the author, judges section 11.

C9: `tests/audio.test.mjs` compiles every `TRACKS` entry, checks that loops are whole bars, that every
motif in the table of section 9 is present and that stings are `once`; every track renders in the
preview bench with RMS within 2 dB of `explore` and `battle`; loops of 32+ bars (credits 2+ minutes);
the report includes a piano-roll image per track (rendered by the preview bench); every new sfx
renders; nothing throws before `init()`. C10: `--check` passes on the content present at the end of
the sub-wave (report which chapters were still placeholder); the mechanic-frequency report; kits and
prices complete; every equipment id defined.

### Wave I: integration

**I1 integration and critical path (single agent, any file)**: merge fixes across locations;
`90-critical-path.json` and `91-retry.json` (10.2); all scenarios, tests, `scriptcheck` and
`balance -- --check` green; `missingArt()` empty after visiting every map and encounter.

**I1b human-pace review (single agent; writes only `shots/` and `docs/gates/I1b.md`)**: runs
`92-human-pace.json` over the whole game and reports minutes per chapter against 11.7, the G2/G3
review for the C-gamma content, and a pass/fail list for the I2 tasks.

**I2 (four parallel tasks after I1b, file-disjoint)**
- **I2a performance and visuals**: `src/core/{engine,postfx,programs,perf,particles,vfx,spriteActor}.js`,
  `src/world/**`, `src/battle/{stage,arena,effects,director,actionfx}.js`, `src/art/**` except
  `icons.js`, `src/content/prewarm.js`, every `src/content/*/{art,enemyart,props,arena,fx}.js` and
  `src/content/*/maps/**`, `src/tools/preview-{world,tiles,characters,vfx,engine,foundation,battle,enemies}.js`,
  every `src/tools/preview-<loc>.js`, `tests/{cond,mapdef}.test.mjs`. Meet the budgets of 11.4-11.6 (per viewpoint, map switches, two-tour memory,
  a real phone), fix the visual items from the gate lists.
- **I2b story, text and music**: every `src/content/*/story.js`, `WRITING.md`, `src/core/audio.js`,
  `src/tools/preview-audio.js`, `tests/audio.test.mjs`. Read every line in play order from the transcripts against STORY.md
  and WRITING.md: voice, typos, scene pacing, objective texts, hints and recaps, motifs.
- **I2c balance and rules**: `src/content/balance.js`, every `src/content/*/data.js`,
  `src/battle/{model,data,scripts}.js`, `src/core/{state,progression,shop,save}.js`, `tests/campaign.mjs`,
  `tests/policy.mjs`, `tests/simulate.mjs` and the S3 test files. Tune on the complete content until
  `--check` passes.
- **I2d UX and flow**: `src/ui/**`, `src/art/icons.js`, `src/battle/{battleUI,battleState}.js`,
  `src/story/**`, `src/core/{game,input,titleScene,util}.js`, `src/main.js`,
  `src/content/{registry,data,index,chapters}.js`, every `src/content/*/{pure,index}.js`,
  `tests/scenarios/**`, `tools/**`, `src/index.template.html`, `src/tools/preview-ui.js`,
  `tests/{story,jump,content,scripts}.test.mjs` and every `tests/<loc>.test.mjs`. Fix flow, menu and
  onboarding items from the gate lists.

**I3 release (single agent, any file)**: full regression (`npm test`, `npm run scriptcheck`,
`npm run scenarios`, `npm run balance -- --check`), README (play guide, new controls, saves), a
CONTRACTS.md pointer to this plan and the new modules, MODULE_NOTES.md consolidated from the task
reports, fresh `docs/screenshots/`, final `dist/` build under 16 MB, the cut list status.

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Phones below 30 fps** | Quality tiers with fixed light counts (11.6), PCF on medium, smaller arena shadows, the automatic one-step drop, `?stats=1`, a real-device check in I2a. |
| **Shader recompiles** | Program anchor (`programs.release`), compile before disposing the old scene, persistent field rig, fixed arena budgets, `compiles` counted and required to be 0 on revisits (11.4). |
| **Memory leaks and iOS canvas limits** | One shadow map for the whole field (persistent rig), mandatory disposal, the byte-budgeted art cache with eviction by chapter and `releaseCanvas`, refcounted glow sheets, the two-tour check (11.5). |
| **Long loads and hitches** | Prewarm follows transforms, summons and `story.preload`; heavy jobs only behind covers; the destination paints during the Moth flight; boot paints only the title and the Halcyon. |
| **Soft-locks and broken saves** | `seen:` set only on completion, Retry from an in-memory snapshot, deferred saves (never mid-script, never on transit or scene maps), the soft-lock lint, `91-retry`, `reloadAuto()` after every autosave in `90-critical-path`. |
| **Flow bugs between scripts, battles and travel** | No cutscene queue (nested `cs.run`), `abortAll()`, battle promises that resolve after the fade-in, locks as a Set, `enter({ resume })` that leaves a running script alone, pending triggers discarded on map change. |
| **Balance across 32 levels** | Linear growth anchored on tuned POC stats; `statLine` archetypes; party-size scaling; chapter kits; the human-like policy and mechanic frequencies; targets checked in every sub-wave and again in I2c; difficulty and encounter settings centralized. |
| **Pacing drift** | Fight counts and encounter rates sized from measured fight length (11.7), story budgets linted by the dry run, `pacing()` and human-pace runs at G2, G3 and I1b. |
| **Many writers, one voice** | WRITING.md before any line is written, script transcripts, director gates, I2b's full read. |
| **Breaking the POC tests** | Section 2.8; content merges only at registration; new event fields only on new event types; the two POC test files are read-only. |
| **Parallel agents diverging** | Binding ids and shapes in this plan, stubs for files and ids, content and script lints, canned battle fixtures, gates G1-G3 and reported milestones. |
| **Artifact sandbox** | No storage reliance (memory fallback), no network beyond three.js and fonts, audio unlocked on gesture (POC), bundle well under 16 MB. |

**Scope control.** Never cut: the four chapters, the finale and every boss with its ultimate
awakening, chapter cards, saves with Continue, the Journal, credits, the epilogue vignettes (at minimum
narrated on the Ione shore), the four dreams, `final_boss_2`, BOLT following the party, and the story
budgets. The separate memorial map is gone for good: Kade's memorial is staged on the Cryo Deck.
If time runs short, cut in this order:
1. Extra manual save slots (keep autosave and one file).
2. `jam`, element charges, selling in shops.
3. Ruse's stock tiers (one stock list) and the elites' extra moves (tint and numbers only).
4. The Moth cockpit flight (a still image and a caption).
5. Vault pit platforms (a flat grid floor).
6. Optional sfx (`alarm`, `glitch`) and `battle_2`.
7. M3 delights: rare encounters, favours, optional elites and their accessories.
8. Party Talks beyond one per chapter, and the night-before scene.
9. NPC walking paths (idle only).
10. Heart lifts (one tall map with ramps).
11. The separate `meridian` map (merged into `shoals`).

---

## Wave S deviations

Where the code differs from the sections above after Wave S (S1a-S5, W) and gate G1. Where this list
and the plan disagree, this list wins. The header comment of each file named here documents its
full API; read it before calling into that file.

### Content registration and lints (2.x, 10.3)

- `registerAll()` lives in `content/index.js` and `registerAllData()` in `content/data.js` (both
  re-export the registry API); `registry.js` itself only has `registerData`, `registerLocation`,
  `finishRegistration`, `getMap`, `locationOfMap`, `locationOfArt`, `ownerOf`, `createRegistry`.
- `getMap` merges `extends`: arrays append in chapter order; plain objects (`spawns`, `anchors`,
  `viewpoints`, `legend`, ...) merge shallowly; `talk: { id: [entries] }` is prepended to the
  TalkSpec of the NPC **or interactable** with that id and also lands in `map.talk[id]`. BOLT (a
  companion, no NpcDef) speaks `map.talk.bolt` entries first, then `REG.companions.bolt.talk`: hub
  lines for BOLT go in `extends.halcyon.talk.bolt` (and the same for any map's companion talk).
- Content you write is unchanged, but the registry stores `REG.preload[map]` as `[{ key, loc }]`,
  `REG.extends[map]` as `[{ loc, chapter, ext }]`, and stamps `loc` on `REG.scenes[i]` and
  `REG.destinations[i]`. `scenes` entries may carry a numeric `order` to fix play order inside a
  chapter across locations (dry run and transcripts).
- Lint scope (`tests/content.test.mjs`, `tools/contentlint.mjs`): a "story trigger" (needs a
  `story:` or `chapter` term in `when`) is a `once` trigger or any trigger that runs a scene script.
  Unbounded `extends` `lights`/`ambient` entries are warnings, not errors. Script ids must start with
  `<loc>.` (prologue may also own `travel.flight`). Encounter and zone ids use the 2.7 prefixes; the
  `warden` folder uses `heart_`. Maps with `poc: true` and the `dev` location are exempt from the
  bounded-`when` and inline-lines rules.
- Script dry run (`npm run scriptcheck`): budgets are checked per stretch between `cs.battle` calls;
  boxes of a nested `cs.run` count toward the caller's stretch; a `cs.choice` prompt counts as one
  box; `cs.wait` adds its seconds. Scripts that no `scenes` entry lists are run once afterwards for
  the per-box checks only, so list every story beat and every Party Talk in `scenes` (Party Talks get
  the 10-box cap only when listed) and keep talk, terminal and hub scripts out. KADE, NYX, ORION,
  SERA, BOLT, HALCYON and WARDEN count as registered speakers even before `common/story.js`
  registers them. Expressions outside `neutral smile sad determined surprised` (plus BOLT's
  `happy worried determined`, HALCYON's `calm flicker` and a speaker's own `expressions` list) are
  reported, not failed.
- The CSS class `.vp-perf-stats` belongs to the `?stats=1` overlay; do not reuse it.

### Maps and the field (3.x)

- The shims are gone: import the Halcyon map from `src/content/prologue/maps/halcyon.js`;
  `world/script.js` (POC lines) is deleted, so the prologue's lines exist only as inline `talk` on
  `halcyon.js` (`poc: true`) until C1 replaces them with scripts. Inline lines on a `poc: true` map
  skip the 4.2 staging check; once converted to scripts, gather the speakers or mark lines
  `{ offscreen: true }` (`halcyon`'s BOLT intro has a NYX line, its HALCYON intro an ORION line).
- `halcyon.js` in Wave S: field boss `sentinel` uses encounter `boss_sentinel` and areas use the POC
  zones `corridor` / `engineering` (C1 renames them to `pro_boss_sentinel`, `pro_corridor`,
  `pro_engineering`, `pro_late`); the BOLT NPC has `when: '!story:kade_awake'` so the companion can
  take over; anchors `hub_stall`, `hub_planters`, `hub_voss_post`, `hub_halcyon`, `memorial` are
  placeholders C1 may move. There is no exit from `halcyon` to `dev_box`.
- MapDef extras (header of `world/mapdef.js`): `map.mood` (default area mood); door CellSpec
  `lockedTex` and `floor`, `lock: { flag, item?, id, label?, toast?, talk? }` (`talk` runs while
  locked); floor `roughness`, `metalness`, `emissive`; wall `upper`; pit `emissive`; water `bed`
  (default texture `water_bed`); chests `talk` (runs after opening) and `propFields`; bosses `talk`,
  `name`, `radius`; `med` interactables `prompt` and `restoreLabel`; `when` on `lights` and `ambient`
  entries; `area.focus.whileBoss` may be a boss id.
- `validateMap` also fails a door in a cutaway wall (rooms only to its north) without a divider on
  its row (door leaves are full height). Once `setChapterOrder` has run (importing
  `content/chapters.js` does it), an unknown chapter id in a condition throws at compile time.
- The World builds props for chests (`{ t: chest.prop || 'chest', id }`), for interactables with a
  `prop` or of kind `switch` (`switch.panel`), `shard` (`shard`) or `starchart` (`starchart`), with
  `propFields` merged, and for gates (`{ t: gate.prop || 'gate.laser', id, x, z, w, d, cells }`).
  Only chests, gates and `switch`/`shard`/`starchart` interactables pass their `id`: to reach a
  registered prop with `cs.prop(id)` / `W.living(id)`, put it in `map.props` with an `id`. Builders
  never call `W.addInteractable` for these entries (the World registers every interactable). A
  LivingProp's `update(dt, t)` is called by the World automatically (`buildProp` registers it).
- Interactables are picked within `reach` (default 1.3) of their `box` when given, else of a circle
  of radius `r` (default 0) around `x, z`, and only while the leader roughly faces them. Give an
  interactable on a large or solid prop a `box` or `r` that reaches past its collider (the
  `starchart` kind defaults to `r: 1.05` for its 2x2 table; Med-Stations use a `box`).
- Props with `when` are built into their own group with their own colliders and emitters and are
  shown or hidden by `syncFlags`. A texture a builder shares between Worlds must set
  `texture.userData.shared = true`, or `World.dispose` disposes it and it re-uploads on the next map.
- Only map NPCs (`map.npcs`) get a collider; `cs.spawn` actors, companions, stepped-out party members
  and the leader stand-in never block the Player. Field bosses are NpcActors with sprite
  `'enemy:<art>'`, listed in `world.npcs` under their id, so scripts address them like NPCs.
- Companions (`REG.companions`, `{ sprite, name, talk, follow }`) appear on maps with
  `companions !== false` that are not `scene` or `transit` (so `moth`, `exterior` and `dreams` need no
  flag); set `companions: false` on any other map BOLT must stay away from.
- `visited:<map>` and `area:<map>:<area>` are written straight into `gameState.flags` (no
  `story.set`, so no `onChange` for area flags). A non-`once` `flag` trigger re-fires on every map
  build while its condition holds (its edge state resets on arrival): use `once: true` (or a
  `when` that turns false) for anything that must run once.
- Med-Station choices are Restore (`restoreLabel`), Save (the saves UI), Party Talk (only when one
  is available; the prompt gets a `!` badge) and Leave; Party Talk runs `cs.run(script, { ptalk })`.
  A `leader`-gated interactable used by another leader runs `common.leader_hint` with
  `{ member, interactable }` if registered, else the line "*NAME* could handle this."
- Encounters: rate `REG.zoneRates[zone]`, else the POC rate for the POC zones `corridor` and
  `engineering`, else `ZONE_RATE_DEFAULT`. Hazard x the lowest party `mods.encounterRate`, x 0.6 on
  the Low setting. Skip weak (default on): a zone whose highest enemy `level` is at least 5 below the
  party's average level rolls nothing, so every EnemyDef needs `level` (`statLine` sets it). Areas
  with `puzzle: true` and `scene`/`transit` maps roll nothing.
- Field sheets are 48x48 frames (the 32-px figure centred, 8 px padding): an NPC/party SpriteActor
  quad is 1.5 units wide; figure size and pivot are unchanged. Custom character painters
  (`custom.field`) may return 32- or 48-wide frames (centred into 48x48).
- Poses are sheet anims `<pose>_down` / `<pose>_side` (side flips for left); `cs.anim(id, 'kneel')`
  and NpcDef/`cs.spawn` `pose: 'kneel'` take the pose name. `NpcActor.play(pose)` holds it until the
  next walk or `play(null)`.
- BOLT and HALCYON accept the party expression names without a warning (bolt: smile->happy,
  sad->worried, surprised->worried; holo: smile/sad->calm, determined->neutral,
  surprised->flicker). `'halcyon'` is an alias of the `holo` sheet and portrait.
- A CharDef's `portrait` slots `{ bust, collar, behind?, after?, over }` merge over its `base`'s
  (`{ after: null }` drops Sera's halo, `{ over: [] }` Kade's visor).
- Emotes: kinds `! ? ... note heart anger sweat idea zzz` (`EMOTE_KINDS` in `world/emotes.js`);
  `cs.emote(id, kind)` takes an actor id or `'leader'`. Bubbles are unlit `THREE.Sprite`s.
- `registerTexture(name, def)` also accepts `{ w, h, image: () => ({ map, emissive?, normal? }) }`
  (canvas painters); `registerPreset(name, ...layers)` accepts `shape` and `blend` as strings
  (`'plus'`, `'add'`); `registerProp(type, { build(W, p), textures, sprites })`. Helpers for lints:
  `hasTexture`, `hasCharacter`, `hasPreset`, `hasProp`, `hasEnemyArt`.
- `world/sky.js`: where a map has a `sky`, its `underlay` stops at the sky edge and fades, so a pit
  near that edge blends into the vista. `debug.visualLint(viewpoint)` (now async: it teleports to the
  viewpoint and renders two frames first) counts as lights only non-`decorative` `map.lights`
  entries with chroma > 0.12 whose position is in view (so put at least 3 coloured lights in every
  viewpoint's frame).

### Story, cutscenes and flow (4.x, 6.x)

- `cs.say` lines on a `poc: true` map are exempt from the staging check only when inline (not a
  registered script). Staging errors name the innermost script.
- `cs.battle(enc, { allowDefeat, canFlee, seed })` passes `script: <outermost script id>` to
  `game.startBattle`. After a lost battle, Retry runs that **outermost** script in instant mode up to
  its first `cs.battle`: keep the pre-fight part of a scripted fight in the same outermost script.
- `cs.ending()` resolves `'ione'` (Return to Ione: the script continues on the current map and
  should move the party to the shore) or `'title'` (the title fade has begun and the script is
  aborted).
- `travel.arrive(map, spawn, { transition, scene, kind, duration, caption, wait, onCover })`;
  `transition: 'none'` exists. The Moth flight runs only when map `moth` and script `travel.flight`
  are registered, and lasts at least 3 s. A destination's `isNew` (Starchart NEW tag and the table's
  amber beacon) is false while the party stands on its map; `dest:<id>` is set only by `travel.go`,
  so the prologue should set `dest:halcyon` itself if the Halcyon must never read NEW.
- `story` extras: `complete(id)` (code only; scripts have no `cs.complete`), `partyTalks()`,
  `ObjectiveDef.when` (optional: a side objective shows in the journal while its `when` holds and it
  is not done). To retire a finished side objective from a script, give it `when: '!<flag>'` and set
  that flag.
- `jumpTo` always sets the checkpoint at its arrival; `jumpTo('ch1' ... 'finale')` lands on the
  chapter's `CHAPTER_START` spawn, and a missing map (ch4's `spire:antechamber` until C5) falls back to
  `halcyon:bridge_starchart` with a `console.warn`. `buildJumpState` throws on an unknown target.
- Settings live in `ctx.settings = { encounters, skipWeak, battleSpeed }` and `ui.getSetting(id)`;
  Difficulty calls `setDifficulty('story' | 'normal')` (`battle/model.js`).
- Saves (`core/save.js`): v0 = the POC gameState; migration renames `crate_<id>` ->
  `chest:halcyon:<id>`, `bridge_unlocked` -> `story:bridge_unlocked`, `talked_bolt` ->
  `talk:halcyon:bolt`, drops `rested`, and adds `defeated:pro_boss_sentinel` to `boss_defeated`.
  `deserialize` returns `{ pos, checkpoint }` (`pos` may be `{ map, spawn }` for a dock fallback) or
  `null` without touching gameState. `latestSlot()` skips damaged slots.

### Battle rules (5.x, 7.1-7.3)

- AI: `ai` defaults to `'sentinel'` only for a boss **without** `script`; every other enemy is
  `'basic'`. Give a scriptless boss that should use gates and summons `ai: 'basic'`. A
  `lockOn`/`charge` whose `fires` id is not one of its actions reports `console.error`; set
  `cooldown` on telegraphing actions to avoid spam.
- Durations: action `untargetable: N`, `api.setUntargetable(id, on, { rounds })` and
  `api.setResist(id, map, { rounds })` last the rest of the current round **plus N more** (a foe that
  dives in round R with `untargetable: 1` surfaces at the start of round R+2).
- `api.setResist` values are **damage multipliers** (`{ cryo: 0.5 }` = half damage); `EnemyDef.resist`
  and gear `resist` are reductions (damage x (1 - value)). `setResist` emits cue `resist` with
  `value` = the map (`null` when it wears off).
- `charge` fires in the charger's last slot of the first round at or after `round + chargeRounds`;
  while a lock-on or charge is pending, further `lockOn`/`charge` actions are not picked. Break
  messages: "<name>'s charge was disrupted!" / "<name>'s lock-on was disrupted!".
- New rule (beat guard): a lethal blow on an enemy that still has an unfired `phases` entry or
  script threshold leaves it at 1 HP so the beat plays (awakenings, the overclock). Not for POC
  enemies; `forceVictory` bypasses it.
- Boss-script hooks without an enemy argument (`onBegin`, `onRoundStart`, `onPartyAction`, `onHit`)
  run once per distinct script id among living enemies; the others per enemy. `onRoundStart` also
  runs for round 1 (after `onBegin`). `api.mem` is one object per script id per battle. A throwing
  hook is caught (`console.error`); hook nesting is capped at depth 4.
- `api.say(speaker, text, { portrait, expr })`: with `expr` and no `portrait`, the portrait is
  `<lower-case speaker>:<expr>`; pass `portrait` when the portrait id differs from the speaker name
  (`MOTHER-7` -> `portrait: 'mother7'`). Without `expr`/`portrait` the battle strip uses the
  speaker's registered portrait or sigil.
- Enemy `heal` actions: `heal: fraction` heals that fraction of the target's max HP, else a MAG-based
  amount from `power`; enemy targets `'ally'` / `'allies'` exist; a heal is picked only when an enemy
  is hurt. New EnemyDef `untargetableStyle` (and action `style`) choose `'submerge'` / `'phase'` /
  `'shield'`; `shieldGain` defaults to `BOSS_SHIELD_GAIN` for bosses, 0 otherwise.
- `marked`: single-target enemy picks prefer the marked member after taunt (also the lock-on
  fallback). `effect.cleanse: true` removes sleep, jam, marked and negative stages; an array removes
  only the listed statuses. Damage items: fixed damage (no roll, no crit), the action event carries
  `damageType` and `hits: 1`.
- `weaknessPool` cycles in order starting from the set equal to `weaknesses`; a shift resets
  `revealed` and its `weakShift` event follows the `recover` event. Summons are named
  "<Name> A/B/..." by how many of that kind the battle holds. A transform keeps action cooldowns and
  script thresholds; the new kind's `phases` start fresh.
- Ultimates cost `BATTLE_RULES.ultimateBp` BP and always resolve at Boost 3; `getMenu` marks them
  `ultimate: true` with reason `'Needs N BP'` / `'Used'`; a jammed member's skills get `'Jammed'`.
  `api.grantUltimate` emits `learn` only when the member is in the battle. Ultimate fx ids are
  `ult.oathblade`, `ult.ringfire_barrage`, `ult.singularity`, `ult.lifebloom` (built in).
- Gear-personality lint: effect signatures must be unique **within a slot pool** (tier 3-4 weapons in
  one pool, non-keepsake accessories in another); each such item carries exactly one effect.
- `balance.js`: `overrides = { party, enemies, rules, zoneRate }`; `overrides.party[id].base/.growth`
  merge into `PARTY_DEFS` in place; enemy overrides deep-merge (`stats` per stat). Archetypes:
  `swarm standard brute caster armored boss elite`.
- Shops (`core/shop.js`): `buy` refuses key items, unpriced items and stacks over 99; `sell` refuses
  key items, unpriced items (keepsakes) and worn-only gear; `shopStock` counts `owned` = held + worn.
  `useItemOutOfBattle`: `allies` items heal every living member.

### Battle presentation (7.4-7.7)

- `stage.transform(id, kind)` takes an ENEMIES kind (its `tint`, `stage.scale`, `stage.hover` apply;
  art = `EnemyDef.art ?? kind`) or a bare art id. `EnemyDef.stage = { slot, scale, hover, spawn }`,
  `spawn: 'holo' | 'rise'` (summon entrance, default `'holo'`).
- `ui.setUntargetable(id, on, style)`: tags SUBMERGED / PHASED / SHIELDED.
  `ui.ultimateCut(memberId, skillName, { awakening })`; the awakening variant plays from a `learn`
  event with `ultimate: true`, and the line before it comes from the preceding `say` event.
- Boss defeat fx lookup: `${EnemyDef.script}.defeat`, `${kind}.defeat`, `${art}.defeat`, then
  `${kind.split('_')[0]}.defeat`, first registered wins. A foe with a defeat fx stays on stage after
  its KO until the victory, which dissolves remaining adds, plays the fx, then the victory pose.
- Lock / charge `fires` come from the action def's `fires` (lock-on default `annihilator_beam`). A
  scripted `api.telegraph` with no pending lock-on/charge makes a threat whose `fires` is the `then`
  of that enemy's next action; with no `then` it clears after that action.
- `fitBox`: the core rect may rise above the fit band (up to 12% from the top on phones, 10% wide);
  frame only the glowing core of huge bosses. With no `fitBox` the POC fit is unchanged.
- Battle dialog strip: above the party panel on phones, short landscape and below 1000 px; on wide
  screens it sits bottom-left beside the party panel.
- Tips: `encounter.tips: [{ on, lines, flag? }]` override `REG.tips[key] = { lines, flag? }`; the
  flag defaults to `tut:<key>` and is set in `gameState.flags` when shown. Keys: the event type,
  `status:<stat>`, `cue:<name>`, `bp3`, plus `begin` and `playerTurn`.
- `encounter.phaseMusic[<transform kind>]` switches the track on a `transform` event; battle music
  starts two frames after the battle enters.
- `buildArena(scene, name, { quality })`: an unknown arena warns, records `missingArt` and builds
  `corridor`. Arena lights only through `kit.pointLight`, `kit.dirLight`, `kit.spotLight` and
  `kit.lamp(..., { light })` (pooled per quality, 7.5). `actionfx.js` exports `playWaves(d, act,
  { spacing, before })`; `d` also has `sfx(name, opts)`, `actor(id)`, `pos(id, point)`.
- The `dev_colossus` test art and the fixture speaker styles exist only in `preview-battle.js`.
- Sfx names requested by the Director that C9 must add: `summon transform submerge emerge glitch
  sleep awaken` (silent until then).

### UI (8.x)

- `ui.hooks.mapData()` shape: header of `src/ui/map.js` (`{ map, leader, objective: { text, target },
  flags, visited?, area?, test?, mapName? }`); the Map tab pans on phones and big maps.
- `ui.cards.chapter / logo({ hold })`, `ui.cards.end({ text, ms })`, `ui.screens.complete({
  continueLabel })`, `ui.hud.setPrompt(label, icon | { icon, badge })`, `ui.hud.setArea(name)`.
  Objective toasts and the location banner accept `*emphasis*`. Chapter cards cannot be skipped by
  Confirm.
- Credits: `REG.credits` lines render as given; `ui.cards.credits` appends the closing line
  "Everything you saw and heard was generated by code." itself; THE END is `ui.cards.end()`. Do not
  put either in `REG.credits`.
- A dialog line takes `portrait: 'sera:sad'` or `expr: 'sad'`. Register WARDEN with
  `{ sigil: 'warden_sigil', accent: '#ffd27a', textSpeed: 0.6, sfx: 'choir', mood: 'warden' }`.
- `ui.setHooks` immediately reports every stored game setting once (so settings apply at boot).
- Title `onContinue` refuses (title stays) when no readable save exists; game over "Load journey"
  keeps the screen until a journey actually loads (G1).

### Debug and tools (10.x)

- `debug.runScript(idOrFn, args)` also runs an inline `async (cs) => {}`; `debug.startBattle` returns
  `true`/`false` and does not wait; `debug.jumpTo` arrives with kind `goto` (or `load` with
  `{ play: true })` under a 0.4 s fade.
- `ctx.prewarm = { location(loc), evict(loc), arrived(loc), trim() }`: every arrival sets
  `artCache.current` and trims, and so does every battle end (G1, 11.5).
- Touch: during a script the player has already completed, the B button shows in the `dialog`
  context so a finger can hold it to skip (`input.setSkippable`, G1).
- Headless SwiftShader runs the game at 0.3-2 fps under load: scenarios must `waitFor` state, hold
  keys in `until` loops, and never assume a fixed number of frames per second. Boss `intro` lines,
  phase `say` lines and tips wait in the battle dialog strip for Confirm (they auto-advance only under
  `debug.autoplay`), the results panel and THE END wait for Confirm, and `debug.autoplay(...)` stays
  on across battles until `debug.autoplay(false)`: press Enter while `.vb-say.is-on.is-done`,
  `state().battle.results` or `.vp-end-p.is-on` shows.
- `dev_box` (test content) now also has a `fabricator` shop console (`dev_box` Sky Deck, id
  `fabricator`) and a Starchart table (id `starchart`, viewpoint `chart`) to exercise those
  interactable kinds from the field.

### WRITING.md decisions that change this plan

- The ch4 card plays on the Halcyon bridge: `vault.echo`'s aftermath runs `cs.goto('halcyon',
  'bridge')`, shows the Ione node at the Starchart, then `cs.card('finale')` (4.1's "vault core" row
  is superseded; 12.5 and 7.9 hold).
- Kade's "Then we make somewhere." is split: "Then..." before the Voss fight (Voss cuts him off), the
  full line at the overclock right before the awakening.
- The finale's two Party Talks (`fin.kade_orion`, `fin.nyx_sera`, scripts `heart.pt_*`) and the
  finale's `extends.driftmarket.talk` lines belong to `heart` (C7); post-game Driftmarket lines to
  `epilogue` (C8).
- Budgets: `shoals.maw` 16 boxes / 120 s (its post-battle stretch counts the nested
  `driftmarket.return`); `dreams.crown` is one script (approach, battle, resolution) at 18 / 240 s;
  `epilogue.main` 150 s.
- Proposed cross-owner ids are in WRITING.md: trigger ids, `extends` ids and local flags in section 5
  (scene inventory), Driftmarket NPC ids and looks in section 7, objective ids in section 9; use them
  as written so references line up.

### C-alpha cross-file fixes (after the C-alpha sub-wave)

Applied from the requests in `docs/gates/C-alpha-reports.md`; these extend the contracts above.

- Actor ids in scripts: an id names a world NPC first (map NPC, field boss, `cs.spawn` actor) and a
  party member only when no world NPC holds it. A script may `cs.spawn('orion', ...)` as a stand-in
  before Orion joins (and despawn it after), but a **map NPC must never use a party member id**: even
  hidden by its `when` it would take the member's place in `cs.move`/`cs.face`/`cs.anim`. The content
  lint rejects it (rule `id`); use ids like `orion_ctrl`.
- Field bosses re-arm on every arrival that runs `load` triggers (exits, travel, loads and the Retry
  respawn, also on the same map): arming is re-seeded from the new position, so a Med-Station
  checkpoint may sit anywhere outside `triggerRadius`.
- `debug.skip(true)` (and the player's hold-to-skip) also lands camera tweens already in flight
  (`FieldCamera.hurry()`) and speeds up walks in flight (`NpcActor.hurry(k)`) of the script's actors.
- An abort (`abortAll`) of a cs call the script did not await (a background letterbox, pan or card)
  is a handled rejection: no `AbortError` pageerror. Awaiting scripts still see the AbortError.
- `api.grantUltimate(member)`: a member in the battle with less EP than the ultimate's cost is raised
  to that cost (an `ep` event after the `learn`).
- `debug.autoplay('policy')`: the human-like policy of `tests/policy.mjs` drives the party (like
  `autoResolve('policy')`), for human-length fights in pacing runs; `'auto'` stays the peeking
  heuristic. An autoplay pick the model refuses falls back to Defend.
- Chapter cards and the logo close at `ms` only once their entrance animations have ended (then hold
  0.8 s): on software GL they no longer close before the title has faded in.
- Prewarm: NPC, spawned and companion sprites named `'enemy:<art>'` prewarm as enemy sheets; a
  script's expressions pair with the speaker named before them and are painted only when that
  portrait draws them (`characters.hasExpression`), so prewarm records no missingArt like `kade:worried`.
- `scenes` entries may carry `jump` (a jumpTo target: a chapter or a `jumps` id) and `at`
  (`'map:spawn'`) for the contact sheet's key-scene frames staged away from the chapter's start map
  (linted as `ref`).
- Tools: `tools/scenarios.mjs --timeout <ms>` (default 7200000, or `VP_SCENARIO_TIMEOUT`),
  `--shot-timeout <ms>` and `--jobs <n>` (parallel browsers); `tools/play.mjs --shot-timeout <ms>`
  (default 300000) and a per-shot `"timeout"`.
- The prologue's `doneFlags` include `tut:equip`, so `jumpTo('ch1')` and later no longer replay
  Orion's equip tip (the ch1+ kits wear the Stimulus Chip).
