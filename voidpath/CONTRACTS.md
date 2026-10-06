# VOIDPATH: module contracts

Single source of truth for how modules talk to each other. Read `DESIGN.md` first for the vision.
Exported names and signatures below are **binding**: implement them exactly. You may add extra
exports, options and internal helpers freely. If you truly need a contract change, implement the
contract as written anyway and describe the change you want in your final report.

Plain JavaScript ES modules, no TypeScript, no build-time JSX. Import three.js as
`import * as THREE from 'three'` and addons as `import { X } from 'three/addons/<path>.js'`
(three r170). No other runtime dependencies. No network fetches at runtime (everything is
procedural: art, audio, data). Fonts come from the template's Google Fonts link (with fallbacks).

## Build, preview, test

```
npm run build            # minified -> dist/index.html, dist/artifact.html, dist/tools/*.html
npm run build:dev        # unminified (readable stack traces)
node build.mjs --dev --only preview-art     # build a single preview entry
node tools/play.mjs dist/tools/preview-art.html --full-page          # screenshot
node tools/play.mjs dist/index.html --steps-json '[{"waitFor":"window.__VP&&window.__VP.ready"},{"key":"Enter"},{"wait":1500},{"shot":"explore"}]'
npm test                 # node --test tests/
```

- Every `src/tools/<name>.js` becomes `dist/tools/<name>.html` (same HTML template as the game:
  `#app > canvas#view, #ui-root, #touch-layer`). Use these **preview entries** to develop and look
  at your module in isolation. A preview sets `window.__PREVIEW = { ready: true }` once it has
  rendered, so tests can `{"waitFor": "window.__PREVIEW && window.__PREVIEW.ready"}`.
- `tools/play.mjs` runs Chromium headless (SwiftShader, so expect ~5-20 fps; that is normal) and writes
  PNG screenshots you can open with the Read tool to **look at your work**. Do this. Iterate on
  what you see.
- The page shows a red error box (`#vp-fatal`) on uncaught errors; play.mjs also prints
  `[pageerror]` lines and writes `report.json`.

## Coordinates and units

- 1 world unit = 1 map tile = 32 texture pixels (`PX_PER_UNIT` in `art/painter.js`).
- +X east (screen right), +Z south (toward the camera), +Y up. Floor at y = 0.
- Map grid cell (col c, row r) has its center at (c + 0.5, 0, r + 0.5).
- Field sprites stand on the floor; their mesh pivot is at the feet (bottom center).

## Directory ownership

| Path | Owner | Notes |
|---|---|---|
| `src/art/painter.js`, `src/art/palette.js`, `src/core/util.js` | foundation | shared, already written; do not break their APIs (adding is fine) |
| `src/core/engine.js`, `src/core/postfx.js` | engine | renderer, low-level pipeline, post FX, transitions |
| `src/core/spriteActor.js`, `src/core/particles.js`, `src/core/vfx.js` | vfx | sprite planes, particles, glows, light shafts |
| `src/art/characters.js` | art-party | party + NPC sprites, portraits |
| `src/art/enemies.js`, `src/art/icons.js` | art-enemies | enemy sprites, UI icons |
| `src/art/tiles.js`, `src/art/fx.js` | art-env | environment textures, effect textures |
| `src/core/audio.js` | audio | all sound and music |
| `src/core/input.js`, `src/ui/*` | ui | input, DOM UI (field), title/menu/screens |
| `src/core/state.js`, `src/battle/data.js`, `src/battle/model.js`, `tests/*.test.mjs` | battle-model | game data, rules engine |
| `src/world/*` | world | maps, diorama builder, player, ExploreState |
| `src/battle/stage.js`, `src/battle/battleUI.js`, `src/battle/battleState.js` | battle-view | battle presentation |
| `src/main.js`, `src/core/game.js`, `src/core/titleScene.js` | integration | boot, state machine, title scene, debug hooks |
| `src/tools/preview-<module>.js` | each owner | preview entries |

---

## core/engine.js (engine)

```js
export class Engine {
  constructor(canvas, { quality = 'high' } = {})   // quality: 'low' | 'medium' | 'high'
  renderer        // THREE.WebGLRenderer (shadowMap enabled except on 'low')
  scene; camera   // currently rendered view (set via setView)
  time            // seconds since start (advances only while running)
  dt              // last frame delta in seconds (clamped to <= 1/20)
  quality
  size            // { width, height, aspect } CSS pixels of the canvas
  setView(scene, camera)                // switch what is rendered (camera aspect is kept in sync on resize)
  setFx(partial)                        // deep-merge post FX params (see below)
  getFx()                               // current params (object, do not mutate)
  setQuality(q)
  onUpdate(fn)                          // fn(dt, t) every frame before render; returns unsubscribe
  start()                               // begins the requestAnimationFrame loop
  shake(intensity = 0.12, duration = 0.3)   // camera shake in world units, decays
  flash(color = '#ffffff', duration = 0.25, strength = 0.8)  // full-screen additive flash
  hitStop(ms = 90)                      // freezes dt (game time) briefly for impact; render continues
  timeScale                             // 1 normally; slow-motion when < 1
  transition(type, { duration = 1.0, color, onMidpoint } = {}) -> Promise<void>
        // 'shatter' : Octopath-style encounter transition. The current frame cracks into glass shards
        //             that fly apart / swirl, flash white, cut to black; onMidpoint() runs at full cover
        //             (switch scenes there); then the new view fades/irises in.
        // 'fade'    : fade to `color` (default black), onMidpoint, fade back in.
        // 'iris'    : circular wipe closing then opening.
  projectToScreen(vec3) -> { x, y, visible }   // CSS pixel position of a world point in the current view
}
```

Render pipeline (EffectComposer, HalfFloat targets):
`RenderPass -> UnrealBloomPass -> TiltShift (2-pass separable, screen-Y based) -> OutputPass (ACES tone map + sRGB) -> Grade (vignette, contrast, saturation, split toning, edge chromatic aberration, grain) -> Flash/Transition`.
Render resolution: CSS size x min(devicePixelRatio, cap) where cap = 1.0/1.5/2.0 for low/medium/high, and
never more than 1440 physical pixels tall. Texture pixel art stays crisp because textures are nearest-filtered.

FX params (all optional in `setFx`; these are the defaults):
```js
{
  tiltShift: { enabled: true, focusY: 0.5, band: 0.14, falloff: 0.30, maxBlur: 1.0 },   // focusY 0=bottom 1=top; maxBlur ~1 => ~7px at 1080p
  bloom:     { enabled: true, strength: 0.85, radius: 0.55, threshold: 0.78 },
  grade:     { exposure: 1.0, contrast: 1.08, saturation: 1.08, vignette: 0.42, vignetteSoftness: 0.55,
               shadowTint: [0.92, 0.97, 1.08], highlightTint: [1.06, 1.0, 0.92], aberration: 0.0015, grain: 0.035 },
  fog:       null   // scenes own their THREE.Fog / FogExp2; engine does not touch it
}
```

## core/spriteActor.js (vfx)

A pixel-art sprite plane in 3D that is lit by scene lights.

```js
export class SpriteActor {
  constructor(sheet, {
    pxPerUnit = 32,            // world size = frameW/pxPerUnit x frameH/pxPerUnit
    tilt = 0.32,               // radians the plane leans back (top away from camera) around the feet
    shadow = true,             // soft blob shadow on the floor
    shadowScale = 1,
    castShadow = true,         // casts a real shadow from shadow-casting lights (alpha-tested)
    emissiveIntensity = 2.2,   // multiplier for sheet.emissive (bloom)
    lit = true,                // false => MeshBasicMaterial (holograms, UI-like sprites)
    anchor = [0.5, 0],         // pivot within the frame (0.5,0 = bottom center)
  })
  object3d                     // THREE.Group to add to a scene (position it at the feet)
  mesh                         // the plane mesh
  play(animName, { restart = false, onEnd } = {})   // anim from sheet.anims; non-looping anims call onEnd once
  setFrame(index)              // show a raw frame index (stops animation)
  currentAnim
  flipX                        // boolean, mirror horizontally (handled in UVs so normal maps stay correct)
  update(dt)                   // advance animation + effects; call every frame
  flash(color = '#ffffff', duration = 0.12)   // tint toward color briefly (hit flash)
  setTint(color | null)        // persistent multiply tint
  setOpacity(a)                // 0-1 (fade in/out, KO)
  setGlow(color | null, strength = 1)         // additive outline/aura glow (e.g. boost aura, target highlight)
  hologram                     // boolean: cyan scanline flicker look (used for the HALCYON AI)
  dispose()
}
```

`sheet` is the object returned by the art builders (see "Sprite sheet object").

## core/particles.js (vfx)

```js
export class Particles {
  constructor(scene, { max = 4000 } = {})
  emit(preset, position /* THREE.Vector3 */, opts = {})          // one-shot burst; opts: { count, color, spread, speed, size, life, direction }
  addEmitter(preset, { position, area = [1, 1, 1], rate = 10, color, ...opts }) -> emitter  // continuous; emitter.position, emitter.rate, emitter.active, emitter.remove()
  update(dt)
  dispose()
}
// presets: 'dust' (slow drifting motes, catches light), 'spark' (gravity, orange-white, streaky), 'steam',
// 'frost', 'ember', 'holo' (cyan glitter squares), 'hit' (white burst), 'break' (magenta/white glass shards),
// 'boost' (amber motes rising around an actor), 'heal' (green-cyan rising plus-motes),
// 'thermal' | 'cryo' | 'volt' | 'photon' | 'void' (element bursts), 'smoke'
```
Additive presets use additive blending; steam/smoke use normal alpha blending. Pixel-square or soft-round
particles per preset (the soft-round ones read more "HD"). Particles must not write depth.

## core/vfx.js (vfx)

```js
export function makeGlow(color, size = 1, intensity = 1) -> THREE.Sprite        // additive soft halo for lamps/LEDs (camera-facing)
export function makeLightShaft({ width = 2, height = 6, color = '#9fd8ff', opacity = 0.18 }) -> THREE.Mesh   // additive gradient beam with slow animated dust noise; call .userData.update(dt) or vfxUpdate
export function makeBlobShadow(radius = 0.5, opacity = 0.45) -> THREE.Mesh
export function makeHologramMaterial(texture, color = '#6fe9ff') -> THREE.Material   // scanlines + flicker + additive
export function makeFlicker(light, { base, amount = 0.5, speed = 8, mode = 'flicker' | 'pulse' | 'strobe' }) -> { update(dt, t) }
export function updateVfx(dt, t)   // advances every animated vfx object created by this module (shafts, holograms, flickers)
```

## art: sprite sheet object (art-party, art-enemies)

All sprite builders return the same shape (cache results; builders may be called repeatedly):
```js
{
  canvas,          // HTMLCanvasElement sheet, frames row-major
  normal,          // canvas, same size (painter.makeNormalMap with frameW/frameH)
  emissive,        // canvas, same size, black except glowing pixels (or null)
  frameW, frameH, cols, rows, count,
  anims: { name: { frames: [indices], fps: 8, loop: true } },
  pxPerUnit: 32,   // texel density to display at (always 32)
  facing: 'right' | 'left' | 'down',   // which way the art faces by default
}
```

### art/characters.js (art-party)

```js
export const PARTY_IDS = ['kade', 'nyx', 'orion', 'sera']
export function buildFieldSprite(id)    // 32x48 frames, facing 'down' by default.
     // anims: idle_down, walk_down, idle_up, walk_up, idle_side, walk_side   (side = facing RIGHT; mirror for left)
     // walk cycles: 4 frames @ 8 fps; idles: 2 frames @ 2 fps (subtle breathing/blink)
export function buildBattleSprite(id)   // 64x64 frames, facing LEFT (toward enemies), character ~46-54 px tall
     // anims: idle (4f loop), ready (2f loop, weapon raised), attack (4f once), shoot (3f once, nyx at least),
     //        cast (3f once), item (2f once), hurt (1f), defend (1f loop), ko (1f, lying down), victory (2f loop)
export function buildPortrait(id)       // canvas 40x40 bust (face + shoulders), facing right, for UI
export function buildNpcSprite(kind)    // kind: 'bolt' (small maintenance robot, hover bob) | 'holo' (humanoid AI hologram, cyan mono)
     // same layout as field sprites (32x48 frames, same anim names; bolt may reuse frames)
```

### art/enemies.js (art-enemies)

```js
export const ENEMY_KINDS = ['drone', 'crawler', 'turret', 'sentinel']
export function buildEnemySprite(kind)  // faces RIGHT (toward the party). anims: idle (loop), attack (once), hurt (1f), break (loop, sparking/stunned)
     // frame sizes: drone 48x48, crawler 80x56, turret 56x64, sentinel 160x160 (boss)
export function buildEnemyIcon(kind)    // canvas 24x24 face/silhouette for the turn-order bar
```

### art/icons.js (art-enemies)

```js
export function iconCanvas(name, scale = 1) -> HTMLCanvasElement   // 16x16 base pixel icon
export function iconURL(name, scale = 2) -> string                  // data: URL (cached) for <img>/CSS
// names: the 9 damage types ('blade','lance','rifle','gauntlet','thermal','cryo','volt','photon','void'),
// 'unknown' ('?'), 'shield', 'shield_broken', 'bp', 'bp_empty', 'bp_boost', 'medigel', 'ether', 'revive',
// 'keycard', 'cursor' (amber pointer triangle), 'attack', 'skill', 'item', 'defend', 'flee', 'save', 'talk', 'inspect'
```

### art/tiles.js (art-env)

```js
export function buildTexture(name) -> { map, normal, emissive, w, h, frames = 1 }   // canvases; animated textures lay frames out horizontally
export function textureSet(name, { repeat = null } = {}) -> { map, normalMap, emissiveMap, frames }  // THREE textures (cached canvases; new texture objects per call so repeat/offset can differ)
export const TEXTURE_NAMES = [...]
```
Required names (32 px = 1 unit; floors 32x32 unless noted; walls tile at 32 px per unit):
- floors: `floor_plate`, `floor_plate_worn`, `floor_grate` (emissive glow beneath slats), `floor_hazard` (yellow-black edge stripe),
  `floor_bridge` (dark polished panels, cyan inlay lines, emissive), `floor_cryo` (frosted pale tiles)
- walls (front faces): `wall_panel` (32x96, 3 units tall: base kickplate, panel seams, rivets, top trim),
  `wall_panel_vent`, `wall_panel_screen` (emissive monitor, 4 animation frames), `wall_pipes` (exposed pipe runs),
  `wall_cap` (32x32 top-down cap for wall tops), `wall_low` (32x24 low cutaway wall face, south walls)
- `door` (32x96 sliding door leaf, emissive status strip), `door_frame` (side trim 8x96)
- `window_frame` (64x96, frame + mullions, transparent glass area), `space_backdrop` (1024x512 painted space: nebula,
  stars, ringed gas giant; emissive-ish, used on an unlit plane), `stars_layer` (256x256 tileable transparent stars)
- props: `console_front` (32x32, emissive buttons/screen, 4 frames), `console_top`, `crate_side`, `crate_top`,
  `locker` (32x64), `cryo_pod` (32x64, emissive frost-blue window), `pipe` (32x32 tileable), `reactor_core`
  (64x64 tileable vertical energy bands, emissive, 4 frames), `holo_table` (64x64 top, emissive star map, 4 frames),
  `ceiling_lamp` (16x16 fixture, emissive), `alarm_light` (16x16, red emissive), `bench` (32x32),
  `sign_cryo`, `sign_spine`, `sign_engineering`, `sign_bridge` (64x16 emissive signage with pixel glyphs),
  `decal_grime`, `decal_oil`, `decal_arrow`, `decal_scorch` (32x32 transparent overlays)

### art/fx.js (art-env)

```js
export function fxSheet(name) -> sheet object (anims: { play: {frames, fps, loop:false} })   // additive effect sprites, white-core + colored edges
// names: 'slash' (arc, 6f), 'thrust' (5f), 'impact' (burst, 5f), 'muzzle' (3f), 'tracer' (1f streak), 'punch' (4f),
// 'shards' (4 glass shard variants, 1f each), 'ring' (shockwave 5f), 'glint' (cross sparkle 4f),
// 'thermal' (flame burst 6f), 'cryo' (ice crystal burst 6f), 'volt' (lightning 5f), 'photon' (light pillar 6f),
// 'void' (dark implosion 6f), 'heal' (rising plus 6f), 'buff' (up-arrow chevrons 5f), 'debuff' (down chevrons 5f)
export function softGlowCanvas(size = 64, color = '#ffffff') -> canvas   // radial gradient (not pixel) for glows/particles
```

## core/audio.js (audio)

```js
export const audio = {
  init()                    // create/resume AudioContext; safe to call repeatedly; call on first user gesture
  sfx(name, opts = {})      // opts: { volume, pitch, pan }
  music(track)              // 'title' | 'explore' | 'battle' | 'boss' | 'victory' | null; crossfades; same track = no-op
  setMuted(bool); toggleMute(); muted
  setVolume({ master, music, sfx })   // 0-1
}
// sfx names: cursor, confirm, cancel, error, menuOpen, menuClose, step, door, pickup, talk, text (typewriter tick),
// save, heal, encounter, slash, thrust, shot, punch, cast, impact, crit, weak, shieldCrack, break, recover,
// buff, debuff, boost, boostDown, enemyShot, enemyMelee, enemyBeam, charge, ko, defend, flee, victory, levelup, gameover
```
Unknown names must be ignored silently. Nothing may throw before `init()`.

## core/input.js (ui)

```js
export class Input {
  constructor({ touchLayer /* #touch-layer element */, target = window })
  update()                       // once per frame, before game logic: computes edges
  down(action) -> bool           // held
  pressed(action) -> bool        // went down this frame
  repeat(action) -> bool         // pressed, or auto-repeat while held (after 280 ms, every 85 ms) for menus
  released(action) -> bool
  axis() -> { x, y }             // movement in [-1,1], y+ = south/down; keyboard, stick, touch joystick
  consume(action)                // clear this frame's pressed/repeat for an action (avoid double handling)
  setContext(ctx)                // 'title' | 'explore' | 'menu' | 'dialog' | 'battle' (touch buttons adapt: boost +/- only in battle)
  lastDevice                     // 'keyboard' | 'gamepad' | 'touch'
  onAny(fn)                      // fn(action) on any press (first-gesture audio init); returns unsubscribe
}
// actions: 'up','down','left','right','confirm','cancel','menu','boostUp','boostDown','run','mute'
```

## ui/ (ui)

```js
// ui/ui.js
export class UI {
  constructor({ root /* #ui-root */, input, audio, state /* gameState */, engine })
  dialog; hud; menu; title; screens
  update(dt)                     // every frame; components read input here
  isBlocking() -> bool           // dialog/menu/screen open: field movement must pause
}
// ui.dialog (ui/dialog.js)
show(lines, { onClose } = {}) -> Promise   // lines: string | Array<string | { speaker, text, portrait /* canvas or dataURL */ }>; typewriter; confirm skips/advances
choice(prompt, options /* string[] */, { speaker, portrait, cancelIndex } = {}) -> Promise<number>
isOpen
// ui.hud (ui/hud.js)
showArea(name, subtitle)         // Octopath-style area title banner, fades out after ~2.6 s
setPrompt(text | null, icon)     // contextual interaction prompt ("Talk", "Inspect", "Open") near bottom center
toast(text, { icon })            // "Obtained Medi-Gel x2" (stacked, auto-dismiss)
setDanger(level /* 0..1 */)      // encounter danger indicator (small pulsing dot, colour shifts blue->amber->red)
setVisible(bool)
// ui.menu (ui/menu.js): pause menu (Tab/C/Start): Party (portraits, HP/EP, stats, weapons), Items (use Medi-Gel/Ether
// on a party member outside battle), Settings (sound on/off, music/sfx volume, graphics quality -> engine.setQuality),
// Controls (key/pad/touch help). open(), close(), isOpen
// ui.title (ui/title.js): show({ onStart }) / hide(); title logo "VOIDPATH", tagline, "Press Start", small credits line.
// ui.screens (ui/screens.js): gameOver({ onRetry }), complete({ stats, onContinue }), fadeBlack(bool)
```
All UI is DOM over the canvas, styled with the CSS tokens in `src/index.template.html` (`--vp-*`).
Every UI module injects its own CSS via `injectCSS(id, css)` from `core/util.js`. Pointer/touch on menu
items must work (tap a row = select + confirm). Layouts must work from 390x844 (phone portrait) to 1920x1080.

## core/state.js (battle-model)

```js
export const gameState = {
  party: [ PartyMember ],        // runtime party (order = formation)
  inventory: { medigel: 3, ether: 1, revive: 1 },   // item id -> count; key items too ('keycard')
  credits: 0,
  flags: {},                     // world flags, e.g. 'crate_eng_2': true, 'boss_defeated': true
  checkpoint: null,              // { x, z, facing } saved at Med-Stations
  stats: { battles: 0, breaks: 0, maxDamage: 0, steps: 0, playTime: 0 },
}
export function resetGame()                    // fresh party (full HP/EP), starting inventory, clear flags/stats
export function healParty()                    // full HP/EP, revive KO'd
export function addItem(id, n = 1); export function removeItem(id, n = 1); export function hasItem(id) -> bool
export function useItemOutOfBattle(itemId, memberId) -> { ok, message }   // Medi-Gel / Ether / Revive in the field menu
export function saveCheckpoint(pos); export function loadCheckpoint() -> pos | null
// PartyMember: { id, name, cls, level, xp, xpNext, hp, maxHp, ep, maxEp,
//                stats: { atk, def, mag, res, spd }, weapons: [types], skills: [skillIds], alive }
```

## battle/data.js (battle-model)

```js
export const DAMAGE_TYPES = ['blade','lance','rifle','gauntlet','thermal','cryo','volt','photon','void']
export const PHYSICAL = ['blade','lance','rifle','gauntlet']
export const ELEMENTAL = ['thermal','cryo','volt','photon','void']
export const PARTY_DEFS   // id -> { id, name, cls, weapons, level, base: {maxHp,maxEp,atk,def,mag,res,spd}, skills, accent /* UI hex */ }
export const SKILLS       // id -> { id, name, user, cost, type /* damage type or null */, power, hits, target, kind, anim, desc }
                          //   target: 'enemy'|'enemies'|'randomEnemies'|'ally'|'allies'|'self'|'koAlly'
                          //   kind:   'attack'|'heal'|'buff'|'debuff'|'revive'|'taunt'
                          //   anim:   'slash'|'thrust'|'shot'|'punch'|'cast'|'heal'|'buff'
export const ITEMS        // id -> { id, name, desc, target: 'ally'|'koAlly'|null, battle: bool, key: bool, effect: { heal, ep, revive } }
export const ENEMIES      // kind -> { kind, name, maxHp, stats, shield, weaknesses, actions: [{ id, name, power, type, target: 'one'|'all', anim, weight, desc }], xp, credits, drops, boss }
                          //   enemy anim: 'enemyShot'|'enemyMelee'|'enemyBeam'|'enemyCharge'|'enemySpit'
export const ENCOUNTERS   // id -> { id, enemies: [kinds], backdrop: 'cryo'|'corridor'|'engineering'|'bridge', boss, canFlee, music }
export const ENCOUNTER_TABLES // zone -> [encounterIds]   zones: 'corridor', 'engineering'
```
Required encounter ids: `drone_single`, `drone_pair`, `crawler_drone`, `crawler_pair`, `turret_squad`, `boss_sentinel`.

## battle/model.js (battle-model)

Pure rules engine: no DOM, no three.js, deterministic with an injected RNG, unit-tested with `node --test`.

```js
export class BattleModel {
  constructor({ party /* gameState.party: mutated in place (hp/ep/alive) */, encounterId, rng = Math.random })
  party; enemies               // Combatant[]
  combatants                   // all, party first
  round                        // 1-based
  order; nextOrder             // arrays of combatant ids: remaining actors this round (front = current) / predicted next round
  current                      // Combatant whose turn it is, or null
  phase                        // 'idle'|'playerInput'|'enemyTurn'|'victory'|'defeat'|'fled'
  result                       // null | 'victory' | 'defeat' | 'fled'
  encounter                    // the ENCOUNTERS entry
  get(id) -> Combatant
  begin() -> Event[]           // sets up round 1 (everyone 1 BP) and returns [roundStart, ...]
  nextTurn() -> Event[]        // advances to the next actor (starting a new round when needed: BP gain, break recovery,
                               //   buff expiry); sets current + phase; returns events incl. 'turnStart'
  getMenu(actorId) -> { weapons: [types], skills: [{ id, name, cost, type, target, kind, desc, usable }],
                        items: [{ id, name, count, target, desc, usable }], canFlee }
  maxBoost(actorId) -> number  // min(3, bp)
  validTargets(actorId, targetKind) -> [ids]
  act(action) -> Event[]       // party action: { actorId, kind: 'attack'|'skill'|'item'|'defend'|'flee', weapon, skillId, itemId, targetId, boost }
  enemyTurn() -> Event[]       // resolve the current enemy's action (AI)
  isOver() -> bool
  rewards() -> { xp, credits, items: [{ id, n }] }
  applyRewards() -> Event[]    // adds xp/credits/items to gameState; returns 'levelUp' events
}
// Combatant: { id ('kade' | 'e0','e1',...), side: 'party'|'enemy', key (party id or enemy kind), name, level,
//   hp, maxHp, ep, maxEp, bp, maxBp: 5, stats, buffs: { atk: { stage, turns }, ... }, weaknesses, revealed: [types],
//   shield, maxShield, broken, breakRounds, alive, defending, boss, boostedLastRound }
```
Events (presentation plays them in order; each is a plain object):
```js
{ type: 'roundStart', round, order, nextOrder }
{ type: 'turnStart', actorId }
{ type: 'bp', actorId, bp, delta }
{ type: 'boost', actorId, level }                       // emitted at the start of a boosted action
{ type: 'action', actorId, kind, name, anim, damageType, targets: [ids], hits }   // announces the move (anim cue)
{ type: 'hit', actorId, targetId, damageType, amount, crit, weak, broken, hpAfter, hitIndex, hitCount }
{ type: 'reveal', targetId, damageType }                // weakness discovered
{ type: 'shield', targetId, shield, maxShield }
{ type: 'break', targetId }
{ type: 'recover', targetId, shield }                   // shield restored after a break
{ type: 'heal', targetId, amount, hpAfter }
{ type: 'ep', targetId, amount, epAfter }
{ type: 'status', targetId, stat, stage, turns }         // buff/debuff applied (stage -2..+2)
{ type: 'revive', targetId, hpAfter }
{ type: 'ko', targetId }
{ type: 'defend', actorId }
{ type: 'telegraph', actorId, targetId, text }          // boss lock-on warning
{ type: 'message', text }
{ type: 'flee', success }
{ type: 'orderUpdate', order, nextOrder }
{ type: 'victory' } | { type: 'defeat' }
{ type: 'levelUp', memberId, level, gains }
```

## world/ (world)

```js
// world/explore.js
export class ExploreState {
  constructor(ctx)
  enter(params = {})     // first call builds the world; { resume: true } returns from battle without rebuilding;
                         // { respawn: true } places the player at gameState.checkpoint (after game over)
  exit()
  update(dt, t)
  world; player
}
```
Explore hands battles to the game: `ctx.game.startBattle(encounterId, { onEnd })`. The boss fight:
`ctx.game.startBattle('boss_sentinel', { boss: true })`; the game handles victory/defeat flow.
Explore reads `ctx.ui.isBlocking()` and pauses movement while true; calls `ctx.ui.hud.*`, `ctx.ui.dialog.*`,
`ctx.audio.*`, and mutates `gameState` (items, flags, checkpoint, stats.steps).

## battle/ (battle-view)

```js
// battle/battleState.js
export class BattleState {
  constructor(ctx)
  enter({ encounterId, boss = false, onEnd })   // builds stage + UI, runs the battle; when finished calls onEnd(result)
  exit()                                        // tear down DOM + dispose scene
  update(dt, t)
}
```
`onEnd(result)` with result `'victory' | 'defeat' | 'fled'` is called **after** the result screen is
dismissed. The game owns what happens next (return to field, game over, ending).

## core/game.js + main.js (integration)

```js
// ctx: the object every state/module receives
ctx = { engine, input, audio, ui, state: gameState, game }
// game
game.change(name, params)              // 'title' | 'explore' | 'battle' (calls exit/enter)
game.startBattle(encounterId, { boss = false, onEnd } = {})   // shatter transition -> BattleState -> back to explore (or game over / ending)
game.current                            // current state instance
// debug hooks for headless tests (always present):
window.__VP = { ready, ctx, debug: { skipTitle(), startBattle(encId), teleport(x, z), winBattle(), setQuality(q), state() } }
```
States implement `enter(params)`, `exit()`, `update(dt, t)`. The game loop each frame:
`input.update(); ui.update(dt); game.current.update(dt, t); (engine renders)`.
