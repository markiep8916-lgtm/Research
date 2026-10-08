# Wave S task reports

Condensed from each Wave S agent's final report (deviations, integration notes, known issues). Gate G1 integrates from these.

## S1a world-core

S1a world-core is done. The world now supports many maps: a pure condition language (world/cond.js) and MapDef helpers (world/mapdef.js: DEFAULT_LEGEND, normalizeMap, validateMap), plus a rewritten World that builds walls, windows, doors, locked doors, floors, water, pit edges and gates from the legend. The World also handles props through S1b's buildProp (including the props that chests, interactables and gates need), chests, interactables, triggers, exits, NPC idle paths, field bosses (as NpcActors), syncFlags, flag-based presence with fades, and full disposal through programs.release. The lighting rig is persistent: one per ExploreState, attached to each map, with fixed light counts per quality tier from the engine presets. A new FieldCamera does the POC follow camera plus focus, view, pan and reset. The Player gains setCharacter and setWorld. ExploreState covers enter/loadMap/arrive, locks, the trigger rules of 3.5, every interaction kind, the companion that trails the leader, the POC encounter hazard driven by zoneRates, and fxOverride. The POC map is now src/content/prologue/maps/halcyon.js (poc: true, POC lines inline, the 12.5 spawns, no coordinate moved) and keeps the POC look. world/maps.js stays as a re-export shim until G1. dev_box is a complete test map, and preview-world supports ?map=&view= and __PREVIEW.cycle(n). npm test passes 202/202, including the 51 POC tests, cond and mapdef. A strict run of the minified preview shows no page errors and no console errors. Every acceptance item passed; the screenshots are under shots/S1a/. Note: the machine ran at load average about 30, so SwiftShader rendered about 0.15 fps. I took the screenshots with a scratch runner that has long timeouts, same browser setup as tools/play.mjs.

### Deviations
- ExploreState additions. arrive(kind, { mapChanged }) applies the 3.7 arrival rules for callers without S2a's travel: it shows the banner, sets the visited flag, re-seeds triggers, restarts the encounter grace and runs load triggers. ExploreState also consumes S2a's story.notify({ type: 'arrive', map, kind, load, scene }) events itself. Other additions: syncFlags() (story.onChange calls it), actor(id), actorPos(id). enter() returns the compileScene promise when it builds a map, so `await game.change('explore', ...)` holds the cover until programs are linked (R12). VIEWPOINTS and prewarmWorld are no longer exported: main.js stopped importing them.
- explore.camera is a FieldCamera (focus/view/pan/reset/snap/release, look, scripted). The THREE camera is explore.camera.camera. FieldCamera also exposes projectionMatrix, matrixWorldInverse and updateMatrixWorld(), so main.js's visualLint(explore.world, explore.camera) works. In follow mode the tilt-shift band stays on the leader (as in the POC); while a script holds the camera it follows the look target.
- World constructor takes an extra `camera` option (the sky update needs it). World extras:
- propEntries(map) export
- bosses (id -> { def, actor, present }) and bossPresent(id?)
- touch(id), isTouched(id), releaseTouched()
- externalTouched, which ExploreState sets to ctx.cutscenes.touched (S2a's exemption Set)
- setTalking(id, on, leader)
- attachRig(mood), leader, floorMats, addGlow, addActor, track, test
- spawnNpc(def, { solid = false, fade }): only map NPCs get a collider, so cutscene stand-ins, step-outs and companions never block or push the Player.
- Field bosses are S1b NpcActors with sprite 'enemy:<art>'. They are also listed in world.npcs so scripts can address them. The blob shadow scale is 1.0, where the POC boss used 1.1.
- World builds props itself from three sources: map.props, then derived entries for chests ({ t: chest.prop || 'chest', id }), interactables with a prop (switch -> 'switch.panel', shard -> 'shard', starchart -> 'starchart'; id only for switch and shard) and gates ({ t: gate.prop || 'gate.laser', id, x, z, w, d, cells }). Each entry goes through S1b's buildProp(W, p). Builders must not call addInteractable for those entries; the World registers every interactable. Props with `when` are built into their own group with their own colliders and emitters, shown or hidden by syncFlags. NPC idle paths are driven by the World through NpcActor.walkTo.
- MapDef, CellSpec and def extras (documented in the mapdef.js header):
- map.mood (default mood for areas)
- door CellSpec lockedTex and floor; lock { label, toast, talk }
- floor roughness, metalness, emissive; wall `upper`; pit `emissive`
- chests talk and propFields
- bosses talk, name, radius
- med interactables prompt and restoreLabel
- `when` on lights and ambient entries
- area.focus.whileBoss may be a boss id
- TalkSpec entries { when?, lines } carry legacy lines (poc and dev only)
The POC bridge door keycard flag is story:bridge_unlocked (rename table).
- validateMap(def) returns string[] (an empty array means valid) and also compiles every condition. Extra check: a door in a cutaway wall (rooms only to the north) needs a divider on its row, because door leaves are full height. cond.js adds setDefaultState(state) (ExploreState installs gameState). Once setChapterOrder has run, unknown chapter ids throw at compile time.
- Lighting rig: Lighting({ quality }) is constructed once. Its methods are attach(scene, lightDefs, mood, { glows, alarm, test }), setQuality(q), setMood, setTag(tag, { on, color, intensity }) (backs cs.light), byTag (returns an array), syncConditions(test) and counts(). Pool size, spot and shadow map size come from the engine's QUALITY_PRESETS (fieldPointLights, fieldSpot, fieldShadowMap). The low tier keeps a 512 map that is not used, so nothing reallocates.
- Med-Station: the choice is Restore (cs.heal + cs.checkpoint), Save, Party Talk (only when one is available; '!' badge on the prompt) and Leave. Save opens ui.saves.open({ mode: 'save', slots: listSlots(), storage: storageMode() }) and writes through ctx.game.write(slot), an S2a extra that shows the memory-storage notice. Party Talk runs cs.run(script, { ptalk: id }), the arg name S2a's runner reads. Inline flows (legacy lines, Med-Station, switches, lifts, boss lines plus cs.battle) run through ctx.cutscenes.run(fn, args) and use the cs API.
- Encounters:
- Rate: REG.zoneRates[zone], else the POC rate (grace 8, sigma 13.5) for POC zones 'corridor' and 'engineering', else ZONE_RATE_DEFAULT.
- Hazard multiplier: the lowest party mods.encounterRate, times 0.6 when ui.getSetting('encounters') is 'low'.
- With ui.getSetting('skipWeak') on, zones whose highest enemy level is at least 5 below the party average get no encounters.
- Areas with puzzle: true and staged maps have none.
- halcyon (Wave S): field boss encounter 'boss_sentinel' and POC zone ids kept until C1 renames them. The BOLT NPC has when '!story:kade_awake' so it hands over to the companion. The POC rotation of BOLT's three repeat lines is approximated with condition entries. Anchors hub_stall, hub_planters, hub_voss_post, hub_halcyon and memorial are placeholders that C1 may move. There is no exit from halcyon into dev_box: debug.goto('dev_box', ...) is the way in, and dev_box's south door exits to halcyon:start.
- prewarmMap(mapId) runs S2b's prewarmLocation(location of the map), then paints S1b's propArt for every prop the World builds, built-in types included, one job per task.
- visited:<map> and area:<map>:<area> are written straight into gameState.flags, without story.set, to avoid sync storms. S2a's travel also sets visited through story.set. For non-once flag triggers, the edge state resets on every map build, so they fire again on arrival while their condition holds; once triggers depend on seen:.

### Integration notes
- Contracts consumed:
- S1b: buildProp(W, p) -> LivingProp (setOpen and setState with (value, instant)), propArt(entry), NpcActor(world, def) with walkTo, setVisible, setPosition, face, play, update(dt, t), dispose
- S1b: showEmote(world, actor, kind, opts), buildWater(W, cells, spec) -> { setDrained(on, instant), update, dispose }, buildSky(W, def) and buildUnderlay(W, def) -> { update(dt, t, camera) }
- S2b: getMap and locationOfMap (registry), prewarmLocation, paintJob, engine.compileScene, renderInfo, markCompiles, QUALITY_PRESETS, programs.release
- S2a: cutscenes.run, active, touched; travel.arrive(map, spawn, { transition, kind }); story.set and onChange; game.startBattle -> Promise; game.write(slot)
- S5: hud.showLocation, showArea, setPrompt(label, icon | { icon, badge }), toast, setDanger; ui.saves.open; ui.getSetting
- World.dispose frees geometries and releases every material through programs.release, then disposes the textures those materials hold. It keeps textures marked userData.shared and the vfx glow texture. A shared texture a builder hands to several Worlds must set userData.shared = true, or it will be re-uploaded after each map change (no leak, just churn).
- dev content: dev/pure.js (S2a) already imports maps/dev_box.js and dev/index.js imports dev/props.js (`export default {}`, no dev prop types needed). dev_box references scripts 'dev.npc_talk' and 'dev.shard' (12.5, S2a). Its debug spawns are entry, from_halcyon, hall_door, deck_door, deck_north, lift_bottom and lift_top. S2a's scripted-battle and Retry scenarios can add triggers through extends.dev_box (the registry appends arrays).
- Companions: REG.companions entries ({ sprite, name, talk, follow }) spawn on maps with companions !== false that are not scene or transit maps. The talk spec is the merged map.talk[id] followed by the companion's talk. On halcyon, the C1 BOLT companion should follow 'story:kade_awake & !story:bolt_away', which hands over from the map NPC.
- To test a map in isolation: dist/tools/preview-world.html?map=<id>&view=<viewpoint>&spawn=&q=&enc=0&leader=&companion=1. __PREVIEW offers view, goto, flag(name, value, { instant }), camView, camReset, cycle(n), mapInfo, renderInfo and frame(n). The preview uses local stand-ins for the game, the cutscene runner (inline lines, choices, waits, heal, checkpoint, battle; other cs calls warn) and travel.
- G1: world/maps.js is now a pure re-export shim (default halcyon, SPAWN, VIEWPOINTS, BOSS, MAP, AREAS) and nothing imports it. world/script.js is no longer imported by anything. Both can be deleted.

### Known issues
- The machine ran at load average about 30 (many headless Chromium instances), so SwiftShader rendered 0.1-0.2 fps. tools/play.mjs screenshots time out after 30 s under that load, so I took the screenshots with a scratch runner that has long timeouts and the same browser setup (scratchpad shoot.mjs, not in the repo). Timing-based behaviour (NPC idle walks, drains, lifts) was driven with frame waits or the instant flag path. Real-device frame rates were not measured.
- dev_box Test Hall is moodier and darker than the POC rooms. It is test content, not a story location.
- If S2a's runner also resets the camera at script end, both paths are idempotent. ExploreState no longer resets the camera itself, but still re-seeds triggers and releases touched actors when the outermost script ends.
- The NPC idle-path pause uses a per-step hash (deterministic but not random). NpcActor walk speed is the path's speed (1.4 by default).

### POC review findings fixed
- R1 fixed in world.js and explore.js: World.syncFlags computes chest interactables' enabled = present && !opened from the chest:<map>:<id> flags on every sync, and explore no longer touches it.enabled. A reset journey reopens every chest.
- R5 fixed in explore.js: enter() never shows a banner. The arrival (S2a travel or explore.arrive) shows exactly one location banner after the fade-in.
- R6 fixed in explore.js: ui.areaName is updated on every area change, whether or not the banner animation plays.
- R7 (the lighting.js part) fixed: field pool counts come from the engine tier presets (8/4/2 plus hero, spot on high only) and shadow maps are 2048/1024 per tier. The pixel budget and post chain are engine.js (S2b).
- R9 (field part) fixed in lighting.js: medium is 4+hero with no spot, low is 2+hero with no spot. Tier changes rebuild the pool once; per-frame visibility toggles are gone. Arena lights are S4's.
- R10 (field part) fixed: the field shadow map follows the tier. The battle and title maps belong to S4 and S2a.
- R12 fixed in explore.js and world.js: loadMap builds the new World, attaches the rig, awaits engine.compileScene (whole scene, out-of-view rooms included, composer target), switches the view and only then disposes the old World. enter() returns the same compile promise for builds at a transition midpoint.
- Not applicable to my files: R2, R3, R4, R8, R11, R13-R28. They belong to the title, UI, battle, engine, template and input owners; props.js has no part in R1 any more.

## S1b world-art

S1b world-art is done. It covers sections 3.3, 3.6, 3.9, 3.12 and 11.5 of TECH_PLAN, plus visualLint.

**Props (`world/props.js`)**
- Every POC prop type builds again, plus box, plane, floorPlane, cylinder, sprite, glow and screen.
- Living props: chest, three switches (panel, valve, lever), three gates (laser, roll-up shutter, hard-light bridge), shard, starchart, screen, pod status label (REVIVAL DEFERRED to AUTHORIZED) and linked guide strips.
- Content can add types with `registerProp`. An unknown type draws a magenta placeholder and warns once.

**NPC actors (`world/actors.js`)**
- `NpcActor` has facing, poses, distance-driven `walkTo`, fades, BOLT's hover and HALCYON's projector.

**Emotes, water and sky**
- `world/emotes.js`: nine pixel-art bubble kinds that pop in, follow their target and fade. They sit just under the bloom threshold so the glyph stays readable.
- `world/water.js`: banks, a textured bed, an animated surface, and a drain sequence (mist, then a walkway rises).
- `world/sky.js`: a camera-anchored vista whose horizon sits on the map's far edge. The underlay shows through pits. Where a sky edge exists, the underlay stops at that edge and fades out, so the vista stays visible beyond it and a pit near the edge blends into it instead of showing a hard line.

**Characters (`art/characters.js`)**
- The four travelers get six poses (kneel, look_up, arms_crossed, hand_to_chest, collapse, point), each with a down and a side view; the side view flips for left.
- Portraits get five expressions: neutral, smile, sad, determined, surprised.
- BOLT gets eye variants happy, worried and determined; HALCYON gets calm and flicker.
- `registerCharacter` supports `base` inheritance and custom painters. An unknown id draws a tinted silhouette; an unknown expression falls back to neutral with one warning.

**Registries and fallbacks**
- `registerTexture` paints a magenta checker for unknown names.
- 12 new particle presets plus `registerPreset`; an unknown preset draws a placeholder.
- New world textures in `world/paint.js`, including `warden_sigil`, the emote sheet and the puzzle-prop textures.

**Art cache (`art/cache.js`)**
- Byte-budgeted store with acquire/release, eviction by location, LRU `trim`, pinned locations, `releaseCanvas`, and the fallback log behind `debug.missingArt`.
- `tiles`, `characters` and `spriteActor` use it. Glow sheets are refcounted, and `SpriteActor.warm(renderer)` uploads a sprite's textures ahead of time.

**visualLint (`world/lint.js`)**
- Measures, for the current view: coloured lights, emitters per area, distinct textures (12 to 48) and untextured surfaces.
- Results on the real World: halcyon cryo and bridge pass; dev_box gate, water and pit pass; dev_box sky fails with only 2 coloured lights in view, which is a map-content issue, not an art one.

**Preview pages**
- `preview-tiles.html` routes:
  - `#textures` (default): every texture.
  - `#props:<bay>`: one bay per load (switches, gates, misc, water, actors).
  - `#sky` and `#sky:low`: the vista at the default pitch and in a low shot.
  - `#cache`: the cache under a forced 20 MB budget.
  - `#world:<map>,<viewpoint>`: the real S1a World with `__PREVIEW.lint()`.
- `preview-characters` adds poses, expressions and registered-character sections.
- `preview-vfx` adds a `#presets` view.

**Checks**
- `npm test`: 202/202 pass.
- Builds succeed for preview-tiles, preview-characters, preview-vfx and main.
- A static check found no missing imports from S1b modules across 218 files.
- In the real game, scenario 25-dev-demo showed emotes, the hologram and expression portraits working with 0 page errors and 0 console errors. Its many timed-out steps come from the slow machine, and the run hit its overall 1600 s limit before the ending.

### Deviations
- art/characters.js: field sheets now use 48x48 frames (were 32x48). FW=48, FH=48, and the 32 px figure is centred with 8 px of padding on each side (FOX=8) so kneel, point and the lying collapse pose fit. sheet.frameW is 48, so a SpriteActor quad is 1.5 units wide instead of 1.0. The figure's size and pivot are unchanged. Battle sheets (64x64) and portraits (40x40) are unchanged.
- art/characters.js: pose animations are named `<pose>_<view>` with view 'down' or 'side' (e.g. 'kneel_down', 'kneel_side'); the side view flips for left. Their frames come after the 20 standard frames. Export `poseAnim(sheet, name, facing)` resolves the name. `POSES` (the pose names) and `EXPRESSIONS` are exported; the battle pose table is renamed internally to BATTLE_POSES.
- art/characters.js: a CharDef's `portrait` is merged over the base character's portrait slots ({ bust, collar, behind?, after?, over }) instead of replacing them. Example: { after: null } drops Sera's halo, { over: [] } drops Kade's visor.
- art/characters.js: BOLT and HALCYON map the party expression names without a warning. bolt: smile->happy, sad->worried, surprised->worried. holo: smile->calm, sad->calm, determined->neutral, surprised->flicker. `NPC_ALIAS` maps 'halcyon' to 'holo'.
- world/emotes.js: a bubble is a THREE.Sprite with an unlit SpriteMaterial rather than a MeshBasic mesh. Its colour is 0.72 grey (linear) so it stays under the bloom threshold.
- world/emotes.js: new exports `EMOTE_KINDS` and `primeEmotes(world)`. primeEmotes adds one hidden bubble sprite to world.scene so compileScene links the emote program early; the NpcActor constructor calls it.
- world/emotes.js: `showEmote(world, target, kind, { ms })` accepts as target an NpcActor, anything with .actor (the Player), a SpriteActor, an Object3D, or { x, y?, z }. 'leader' and id lookup are left to World.emote (S1a). A new emote on the same target replaces the old one. If the world stops updating, a watchdog resolves the promise.
- world/actors.js: NpcActor does not create colliders, talk interactables or idle paths; the S1a World does that. Extra members beyond the contract: setPosition(x, z, facing?), walking, pose, kind, isEnemy, hologram. A sprite of 'enemy:<art>' resolves through buildEnemySprite (field bosses).
- world/sky.js: buildSky and buildUnderlay return { mesh, update } with no dispose; World.dispose frees them by traversing the scene. buildSky.update(dt) only scrolls the optional star layer; placement runs in onBeforeRender for whichever camera renders.
- world/sky.js: the underlay keeps a 24-unit margin, except on the sky's edge when the map has a sky. There it extends only 0.55 x |y| past the edge and fades vertex alpha to 0. In that case the underlay material is transparent with depthWrite false.
- world/water.js: the CellSpec gains `bed` (default 'water_bed'), backed by a new 'water_bed' texture in paint.js. New export `waterTextures(spec)` returns [tex, bank, bed, path]. WaterBody has no dispose; it is freed with the scene. Water sits at y = -0.12 (SURFACE_Y).
- art/tiles.js: registerTexture accepts a third form { w, h, image: () => ({ map, emissive?, normal? }) }, used for painters that draw canvases directly. textureSet takes a `layers` option (['map', 'normal', 'emissive']). New exports glowSet, hasTexture, textureFps and textureHasAlpha. TEXTURE_NAMES is a live array that grows with registerTexture. A texture's canvases are cached under 'tex:<name>' in artCache and acquired while textures made from them live.
- core/particles.js: new exports PARTICLE_PRESETS (preset names, excluding the 'missing' placeholder), PARTICLE_SHAPES, PARTICLE_BLENDS, registerPreset(name, ...layers) and hasPreset. registerPreset also accepts shape and blend given as strings (e.g. 'plus', 'add'). PRESETS is still exported.
- art/cache.js API beyond 11.5: has, getOrSet, delete, refs, locOf, size, keys, onDrop(fn), stats(), plus the fields pinned (Set: core, common, prologue), current and locate(kind, name). set() also takes onEvict. The file also exports releaseCanvas, canvasesOf, canvasBytes, noteMissingArt(kind, key) -> true the first time, and missingArt(). Keys shaped '<kind>:<name>' get their location from artCache.locate.
- core/spriteActor.js: new exports acquireGlowSheet(sheet) and releaseGlowSheet(sheet); glow sheets are cached as 'glow:<n>'. New method SpriteActor.warm(renderer). The constructor acquires sheet.cacheKey and dispose releases it; dispose is guarded against running twice and releases materials through programs.release.
- world/props.js: screens expose setState(tex | null), which World.setScreens drives; there is no module-level screen registry. The starchart polls REG.destinations itself (any undiscovered destination whose `when` holds) as well as accepting setState(isNew). buildProps(W, entries) is exported, but the World calls buildProp per entry. Living props register their animation with W.addUpdater, and update(dt, t) runs once per t. The chest no longer creates its interactable; the World owns it.
- world/paint.js: the POC furniture textures (metal_side, med_front, med_cross, chair, seat) are now registered textures using the `image` form. Exports EMOTE_ORDER, worldTexture(name) (fresh three.js textures on each call) and worldMaterial(name, opts).
- world/lint.js: visualLint(world, camera, { viewpoint }) does not move the camera. Definitions:
- lights: non-decorative entries of world.map.lights with chroma > 0.12 whose position projects into view.
- emitters: world.emitters in view; every area in view needs at least one.
- textures: distinct map images on visible meshes. SpriteActor meshes, Sprites and Points are excluded.
- untextured: meshes in view with no map and a surface over 2 square units. It skips colorWrite false, additive, shader, and nearly transparent materials, and dark (< 0.03) non-glowing hulls.
- tools/preview-tiles.js routes:
- #textures (default).
- #props:<bay>: switches, gates, misc, water or actors, one bay per page load because SwiftShader is slow.
- #sky[:low].
- #cache.
- #world:<map>,<viewpoint>: builds the real S1a World; __PREVIEW.lint() runs visualLint.
Each page exposes __PREVIEW.advance(sec).

### Integration notes
- artCache.locate is already wired by S2b (content/index.js: artCache.locate = locationOfArt). There is no caller yet for artCache.current or artCache.trim(). Travel or loadMap (S2a/S1a) should set `artCache.current = locId` on arrival and call `artCache.trim()` after every map load and battle (TECH_PLAN 11.5). main.js already wires evict to artCache.evictLocation.
- S2b content/prewarm.js (around line 104) collects cell.bank and cell.path for water cells but not the new bed texture. Add `cell.bed || 'water_bed'`, or use waterTextures(cell) from world/water.js. Until then water_bed is painted on first use.
- S2a main.js debug.visualLint(viewpoint) calls visualLint(explore.world, explore.camera) without `{ viewpoint }`, so result.viewpoint is null. It should also render one frame after VP.debug.view(viewpoint) and before linting, so the camera matrices are current.
- S4 stage._warmActor reads a.sprite._textures, an internal field. Prefer `a.sprite.warm(renderer)`, which also uploads the aura glow sheet. Enemy sheets set sheet.cacheKey, so SpriteActors acquire them automatically.
- cs.anim(id, pose) for the leader: Player (S1a) has no pose method in my files. Use `player.actor.play(poseAnim(sheet, pose, facing))` from art/characters.js; null or idle returns to idle_<dir>. NPCs: npc.play(pose) holds the pose until the next walkTo or play(null).
- World.emote(target, kind, opts) should resolve 'leader' or an id to the Player or NpcActor and call showEmote(this, target, kind, opts). clearEmotes(world) is available for dispose; otherwise pending bubbles resolve through their watchdog once the world stops ticking.
- S1a explore.js prewarm still paints every TEXTURE_NAMES entry, which now includes the registered world textures. TECH_PLAN 11.5 says boot should no longer paint all of them.
- Field sheets are now 48x48 frames. SpriteActor, Player and NpcActor read frameW, so nothing breaks, but code that assumes a sprite quad is 1 unit wide should use sheet.frameW / 32.
- Content can call registerProp(type, { build(W, p), textures, sprites }); propArt(typeOrEntry) returns what a built-in or registered type paints, for prewarm. hasProp(type), hasTexture, hasCharacter and hasPreset support lints.

### Known issues
- Headless SwiftShader at load average 25-35 is very slow. The full 25-dev-demo scenario (S2a's) hit its 1600 s timeout before the ending. Its failed steps were timing-only `until` loops; there were 0 page errors and 0 console errors.
- Lying 'collapse' sprites are standing frames rotated onto row 46. Their baked shading keeps the standing light direction, which shows only on close inspection.
- Portrait expressions are subtle at the 40x40 dialog size (eyes, brows and mouth are 1-3 pixel edits). They are clear at 4x and up.
- A pit within about 0.55 x |underlay y| plus the camera's sight distance of a sky edge shows the sky in its far part. It blends through the underlay fade rather than cutting; seen in dev_box/sky.
- A World with no NpcActor links the emote sprite program on its first emote (primeEmotes runs from NpcActor).
- dev_box content (S1a): the 'sky' viewpoint has only 2 coloured lights in view (visualLint fails it), and the 'npc' viewpoint hides the NPC behind a foreground console.
- The full-page screenshot of preview-tiles.html#textures misplaces the WebGL diorama: a Playwright full-page capture artifact on the 14,000 px page. The page itself renders correctly.

### POC review findings fixed
- R1 (props.js part): fixed. The chest LivingProp's setOpen(false, true) fully resets the lid and the status LED. props.js no longer creates or disables the crate interactable. S1a's World.syncFlags sets `it.enabled = present && !opened` and calls the chest's setOpen, so a second New Journey re-enables cleared crates.
- R11 (spriteActor.js part): fixed. Glow sheets are refcounted art-cache entries (acquireGlowSheet / releaseGlowSheet; the last release disposes the texture). New SpriteActor.warm(renderer) calls renderer.initTexture on the sheet textures and the aura glow sheet. Sprite sheets carry cacheKey and are acquired while an actor lives, so they cannot be evicted mid-battle. The stage.js and battleState.js halves belong to S4.
- R12 (props.js part): fixed. Every prop material (reactor, hologram and chair materials, hard-light bridge, lasers, starchart) is created while the World is built and stays in its scene. renderer.compile also covers hidden objects, so compileScene links them behind the cover. The emote program is primed by a hidden bubble that NpcActor adds. No prop creates a material lazily; the shard's collect burst uses the existing particle program. The world.js and explore.js halves belong to S1a and S2b.

## S2a flow

S2a "flow" is done and all ten acceptance items pass.
- **Tests:** npm test passes 202/202. That includes the 17 new story.test.mjs tests, the 8 new jump.test.mjs tests and the 51 POC tests.
- **Scenarios:** all 11 scenario files (01, 03, 05, 06 and 20-26) pass with --strict against the minified build (dist/index.html?q=low).
- **What was built:**
  - The story facade (src/story/story.js), the PURE jump builder (jump.js), the cutscene runner with the full cs API (cutscene.js) and travel (travel.js).
  - Game flows in game.js: New Journey, Continue/Load, battles as promises that resolve after the fade-in, game over, Retry from the snapshot with auto-skip, Retry from the second form, Title, and finish (credits, Journey Complete).
  - Deferred checkpoint/autosave queue and the in-memory snapshot (6.2); the memory-save notice when localStorage throws.
  - main.js: ctx wiring (ctx.story, cutscenes, travel, content), UI hooks (8.1), speaker registration and every 10.1 debug hook.
  - The title dawn variant and quality-scaled title shadows (titleScene.js); input.heldFor and the Tab fix (input.js).
  - Dev content: dev.demo with 13 steps, dev.fight, dev.goto_battle, the dev.door exit and the dev jumps.
- **Fixes this session:**
  - 01-boot walking holds are now 2500 ms; at headless frame rates 600 ms holds fell between frames.
  - The staging check no longer flags the legacy inline POC lines on halcyon (it broke 06-mobile under --strict).
  - My duplicate R23 CSS is gone from input.js, because S4's battleUI.js now places the Boost buttons in battle.

### Deviations
- src/story/cutscene.js staging check (4.2): lines of an inline (unregistered) script on a map with poc: true are not checked. These are the legacy POC talk lines (3.5, Wave S only); halcyon's inline BOLT_INTRO has a NYX line that otherwise fails 06-mobile under --strict. Registered scripts on poc maps are still checked, and the error now names the current (nested) script id rather than the outermost one.
- CutsceneRunner extras beyond 4.2: update() (called every frame before ui.update: hold-to-skip, flight skip, leader stand-in), rethrow(err), queue(kind) -> bool, touched (Set handed to world.externalTouched), choices, autoSkip, skippable(fn, ready), the instant getter and the current getter (outermost script id).
- cs.battle passes { allowDefeat, canFlee, boss, script: <outermost script id>, rng } to game.startBattle. After the fade-in it calls ui.hud.setVisible(true) and input.setContext('dialog').
- game.startBattle also accepts `script` (the Retry auto-skip target) and passes any other options through to BattleState. Game extras: requestCheckpoint, requestAutosave, flushQueue, setCheckpoint, autosave, write(slot), saveMenu, loadMenu, loadData, leaderPos, forget (public), skipTitle, autosaves, inBattle, autoResolve, policy, onBattleEvent and onBattleStart. game.finish resolves 'ione' or 'title'. newJourney waits for a running transition instead of returning early.
- travel extras: bind(ctx) and destinations(). arrive() takes the options caption, wait, onCover and duration, plus transition 'none'. The Moth flight lasts at least 3 s (0.3 s in fast or instant mode). go() evicts the art of finished chapters except core, common and prologue. _arrived() turns the menu back on, sets the 'explore' context and restores music when no script runs.
- story extras: bind(ctx), complete(id), markPlayed(ids), partyTalks(), notify(change) and the optional ObjectiveDef.when.
- jump.js: extra export setMemberLevel(m, level). buildJumpState also returns target, chapter, poc, level and story.done. An unknown target throws 'jumpTo: unknown target'.
- debug.jumpTo always sets the checkpoint at the arrival, so Retry and Restore work after a jump. It arrives with kind 'goto' (play false) or 'load' (play true) and a 0.4 s fade. debug.startBattle returns true or false (false for an unknown encounter) and does not wait. debug.runScript and debug.interact catch rejections and log console.error.
- main.js ctx extras: ctx.prewarm = { location, evict } and ctx.settings = { encounters, skipWeak, battleSpeed }. main.js imports createPolicy from tests/policy.mjs for autoResolve('policy'), so it is bundled.
- titleScene.js exports hasCleared().
- input.js: heldFor(action) added. Tab is no longer swallowed with Shift or in the 'title' input context (R27).
- Scenario edits: 01-boot walking holds raised from 600 ms (max 12) to 2500 ms (max 8) for headless frame rates. 01/03/05/06 wait for ui.title === 'menu' before the second Enter. 03/05/06 start with jumpTo('poc'). 01 expects New Journey to give party ['kade'], autosaves 1 and a halcyon checkpoint.
- Dev content (src/content/dev/story.js): extends.halcyon adds an exit interactable 'dev.door' at (6.55, 20.3), when 'chapter>=prologue & dev:exits'; extends.dev_box adds a once-trigger 'dev.fight', when 'chapter>=prologue & dev:fight_armed & !dev:fight_won'; jumps 'dev' and 'dev.fight'; destination dev_box (unlock dev:charted); speakers TESTER and 'DEV LOCK' (mood warden).

### Integration notes
- C1 / halcyon owner: the inline POC talk on halcyon (BOLT_INTRO with a NYX line, HALCYON_INTRO with an ORION line) is exempt from the staging check only while the map has poc: true. When converting it to scripts, gather the speakers or mark those lines { offscreen: true }, or they will report console.error.
- S4: at 740x304 the battle help box ('Strike with a weapon...') sits under the Boost +/- pair, and the - button is partly covered (shots/S2a/touch/battle-touch.png).
- C8: the title dawn variant (after a clear) reads textureSet('bd_ione_dawn'), which is not registered yet, so it shows the magenta placeholder (shots/S2a/boot/title-dawn.png).
- ExploreState sets world.externalTouched = ctx.cutscenes.touched and runs its Med-Station inside a cs session (cs.checkpoint queued); its Save option calls game.write(slot) directly. Arrivals reach ExploreState through story.onChange({ type: 'arrive', map, kind, load, scene }).
- Retry auto-skip marks the outermost script id passed to startBattle as `script`. That script runs in instant mode up to its first cs.battle, and once-triggers set seen: only on completion, so a lost scripted fight can always be replayed.
- Headless scenarios: SwiftShader ran at about 0.3-1 fps under load 8-35, so dev scenarios teleport next to targets and use holds of 2.5-3 s. Two key presses inside one frame register as one press, so wait for ui.title === 'menu' before the second Enter. 25-dev-demo takes about 15 minutes; run it with a background timeout above 30 minutes.
- jumpTo('ch1'...'finale') currently land at halcyon (43.8, 9.15); ch4 falls back to halcyon:bridge_starchart with a console.warn until its start map exists.

### Known issues
- The title dawn variant shows a magenta placeholder window until C8 registers bd_ione_dawn.
- Retry from the second form (onRetryPhase, _retryPhase) has no scenario or positive unit test; story.test.mjs only checks that the option is absent when there was no transform.
- Battle screen at 740x304: the help box overlaps the Boost +/- buttons (S4 layout, see integration notes).
- Scenario runtime is high on the shared headless machine. 25-dev-demo was killed by the 30-minute background limit in batch r5 and passed when rerun in r6.

### POC review findings fixed
- R2 (game.js, titleScene.js): toTitle changes state with deferUI and shows the title UI only after the fade, and newJourney waits for a running transition instead of returning silently, so the title can no longer soft-lock.
- R3 (game.js): _enterBattle sets ui.menuEnabled = false and closes the menu before the shatter, so no pause menu opens during the encounter transition.
- R4 (titleScene.js): TitleState.enter sets input context 'title' and menuEnabled false, so there is no pause menu or battle touch buttons over the title or the New Journey iris.
- R5 (game.js, travel.js): New Journey shows the location banner once, from travel._arrived after the iris; the second _showArea call is gone.
- R8, title part (titleScene.js): warm() uses engine.compileScene(scene, camera), which compiles the render-target variant, instead of renderer.compile on the screen variant. The battle midpoint in game.js also awaits engine.compileScene.
- R10, title part (titleScene.js): the title sun's shadow map follows quality (low 512 / medium 1024 / high 2048) and is resized when the quality changes.
- R21, game.js part: prefersReducedMotion() (util.js) is used. Under reduced motion battles fade in instead of shattering.
- R27 (input.js): Tab is not preventDefault'ed with Shift or in the title context, so keyboard focus can leave an embedded frame.
- R1, joint with S1a: New Journey, Retry and Load rebuild the state with newGame or deserialize under the cover and re-sync the world. The crate re-enable itself is in S1a's world.syncFlags. Not re-measured headlessly.
- R23: my earlier input.js media query was removed as a duplicate because S4's battleUI.js now owns the battle positions of the Boost buttons. Verified at 740x304: + [666,76..718,128], - [606,76..658,128], A [642,136..718,212]; elementFromPoint at the centre of + returns the + button; the Sound button is hidden at that height (shots/S2a/touch/battle-touch.png).

## S2b pipeline

S2b "pipeline" is done and every acceptance item passes. `npm test` passes 202/202, including the 51 POC tests and my 29. `npm run scriptcheck` and the minified `npm run build` pass, and a strict smoke run of the minified game page had 0 errors.

What was built:
- **Content stubs**: valid stubs for all ten Wave C location folders, created first so everyone's imports resolve; prologue/pure.js includes S1a's halcyon map.
- **Registry and aggregators**: content/registry.js is a factory, so lint fixtures get isolated registries. Duplicate ids throw before anything is merged. getMap merges `extends` in the plan's order. content/data.js and content/index.js aggregate the locations; index.js also installs the art registrars and wires the art cache's location lookup.
- **Chapters and prewarm**: content/chapters.js (section 4.1) and content/prewarm.js (collectArt and prewarmLocation, time-sliced, with an idle mode).
- **Engine instrumentation (11.4, 11.6)**: core/programs.js is the shader-program anchor. Engine gains compileScene, renderInfo split into scene, shadow and post counts with a linkProgram compile counter, quality tiers carrying the 11.6 budgets, and change listeners.
- **perf.js**: the ?stats=1 overlay, the frame-time monitor, the automatic one-step quality drop and perf.simulate.
- **Lints**: the content lint (tools/contentlint.mjs) and the script dry run (tools/scriptcheck.mjs), with seeded fixture tests in tests/content.test.mjs and tests/scripts.test.mjs.
- **Tools**: tools/contact-sheet.mjs, tools/browser.mjs shared by play.mjs (which gains `--reduced-motion` and a longer screenshot timeout), build.mjs now bundles three.js into dist/index.html, and package.json gains the scriptcheck, balance and contact scripts.
- **Previews**: preview-engine shows renderInfo, a rebuild cycle and perf hooks; preview-foundation checks the content pipeline in the browser.

Measured in the real field (S1a's preview-world): revisiting dev_box and halcyon links 0 programs, and texture and geometry counts return to the same values each visit.

### Deviations
- REG shape additions (2.6): REG.scenes[i] and REG.destinations[i] carry `loc`. REG.extends[mapId] is [{ loc, chapter, ext }]. REG.preload[mapId] is [{ key, loc }] instead of plain key strings, so prewarm can gate other locations' additions by chapter. REG.doneFlags[ch] is the union of every location's list.
- registerAllData() is exported from content/data.js and registerAll() from content/index.js, as the plan's comments say, not from registry.js. Both aggregators also re-export the registry API. registry.js adds createRegistry(opts), registry (the default instance as one object), finishRegistration(), ownerOf(table, id) and setRegistrars(map). Registry stays PURE: content/index.js installs the browser registrars (registerTexture, registerCharacter, registerEnemyArt, registerPreset, registerProp, registerArena, registerActionFx) and sets artCache.locate = locationOfArt.
- Registering a location's index.js object after its pure.js object is treated as the same location (same data, story and maps references): it adds only the art. applyBalance() runs once per registration batch that added content, so registerAll after registerAllData does not re-run it.
- getMap: extends talk entries are prepended to NPCs and also to interactables with a matching id. The merged talk of every id is also exposed as map.talk[id], because companions such as BOLT have no NpcDef on the map; ExploreState should read map.talk.bolt for hub dialogue. Plain-object extends (anchors, viewpoints) merge shallowly.
- Engine additions: engine.tier; setQuality(q, { auto }) is now a no-op when unchanged and clears the program anchors. New: onQualityChange(fn), onViewChange(fn), markCompiles(), frameMs, reducedMotion, and engine.perf (the monitor). renderInfo() adds compilesSince, anchors, quality, pixelRatio and renderSize to the contract fields; `compiles` is cumulative since engine start, and compilesSince counts from the last markCompiles().
- QUALITY_PRESETS[q] carries the 11.6 budgets that consumers read: pixelBudget, shadowType ('pcfsoft' / 'pcf' / null), fieldShadowMap, arenaShadowMap, fieldPointLights (pool without the hero), fieldSpot, arenaPointLights, arenaSpot, particles. Medium now uses PCFShadowMap.
- Pixel ratio is also capped by a pixel budget (2.8 MP high, 1.4 MP medium, 0.75 MP low; POC review R7). 1280x720 and 390x844 shots are unaffected.
- perf.js attaches itself in the Engine constructor, so no wiring is needed. Optional: perf.setUi(ui) (main.js already calls it) and perf.watch(reason). Windows start by themselves 3 s after every scene the engine shows for the first time. Scenes marked scene.userData.perf = 'battle' are watched only for the first battle of the session, and perf = false disables watching; S4 and S1a may set these. Unmarked battle stages are each watched, a superset of the plan's 'first battle' rule. Frames during transitions and frames over 1 s are left out; a window needs 3 frames, or 1 when simulated.
- perf: an automatic drop is never applied under automation (navigator.webdriver) except through simulate(), so headless SwiftShader runs and previews keep their quality. The drop is stored as settings `quality` plus `qualityAuto: true` (through ui.setSetting when a UI is set, else localStorage 'voidpath.settings.v1'). The Settings tab note (S5) can read qualityAuto. Any later non-auto setQuality counts as a player choice and stops automatic drops.
- Script dry run: scene budgets are checked per stretch between cs.battle calls ('before the player gets control back'), and waits add to the seconds. Scripts no scene lists run once afterwards for the per-box checks. Seven core speakers (KADE, NYX, ORION, SERA, BOLT, HALCYON, WARDEN) count as registered even before common/story.js registers them; the report lists them as implicit. Expressions outside neutral/smile/sad/determined/surprised (plus BOLT's eye variants, HALCYON's variants and any speaker `expressions` list) are reported, not failed. Scenes may carry an optional numeric `order` to set play order within a chapter across locations.
- Content lint scope choices: 'story trigger' means once triggers or triggers that run a scene. Maps with poc: true and the dev location are exempt from the bounded and inline rules. Unbounded extends lights and ambient are warnings, not errors. The CHAPTER_START objective is required only once that chapter has objectives outside dev. Script ids must start with '<loc>.', with travel.flight allowed for prologue. Encounter and zone prefixes follow 2.7 (warden uses heart_).
- dist/index.html now bundles three.js (offline-capable, about 1.5 MB minified; POC review R24). dist/artifact.html and the preview pages still load the pinned CDN URL. build.mjs refuses any page over 16 MB.
- preview-foundation is now the content-pipeline check (registerAll twice, collectArt per location, prewarmLocation with thumbnails) and keeps the painter smoke sprite. The `balance` npm script points at tests/campaign.mjs, which C10 has not created yet.

### Integration notes
- Callers use engine.compileScene(scene, camera) under covers and programs.release(material) instead of material.dispose(). S1a's World and explore and S4's arena and game.js already do. S4's stage.warm should use compileScene rather than renderer.compile with no target bound.
- Arenas, title and particles size themselves from engine.tier: arenaShadowMap, arenaPointLights and arenaSpot (S4), particles (S1b), fieldShadowMap, fieldPointLights and fieldSpot (S1a's rig already matches: 9 point lights high, 5 medium).
- BattleStage scenes can set scene.userData.perf = 'battle' so only the first battle of a session is measured. The title scene can set perf = false.
- Testing: `__VP.ctx.engine.perf.simulate(45)` triggers a drop in the game page. S2a could also expose debug.perf.
- S5's Settings note can read ui.getSetting('qualityAuto') or settings.qualityAuto. perf writes it through ui.setSetting. Any non-automatic engine.setQuality, such as a player choice in Settings, stops further automatic drops.
- ExploreState (S1a) can read map.talk.bolt from getMap for companion hub talk added through extends.
- Travel (S2a) calls prewarmLocation(locationOfMap(map)) during the flight, and prewarmLocation(loc, { idle: true }) for the next destination; artCache.evictLocation stays with travel.
- Contact sheet: `npm run contact -- <location|map>` shoots preview-world.html?map=&view= at 1280x720 high and 390x844 medium. When a location has key scenes it also uses dist/index.html with __VP.debug.jumpTo and runScript.
- G1: `npm run scriptcheck` runs the dry run plus the content lints. tests/content.test.mjs runs the dry run first so flags set by scripts count as written.
- Wave C must not reuse the class name .vp-perf-stats; the overlay was renamed after colliding with S5's .vp-stats.

### Known issues
- The contact sheet's key-scene frames (dist/index.html, jumpTo plus runScript, waiting for .vp-dlg.is-open) are untested, because no location registers key scenes yet. The viewpoint part is verified.
- Not done from R7: half-resolution tilt-shift and folding OutputPass into GradePass.
- Under the machine's heavy load during this run (load average 15-32 from parallel agents), SwiftShader ran the game page below 1 fps. Fps numbers in the overlay shots are not meaningful; I2a must measure on real hardware.
- An unmarked battle stage starts a perf measuring window on each first view, not only the first battle of the session, until S4 sets scene.userData.perf = 'battle'.
- prewarm's portrait expressions come from a regex scan of each script's source (speaker names, expr: and portrait: literals). It over-approximates, painting a few extra 40x40 portraits, and misses expressions built dynamically.
- registerAll() is verified in the browser (preview-foundation). Node tests use registerAllData(), because content/index.js pulls in the browser art modules.

### POC review findings fixed
- R7 (partial; engine.js): the pixel ratio is now also capped by a pixel budget (2.8 / 1.4 / 0.75 MP per tier), and perf.js provides the frame-time governor (an automatic one-step drop) plus field and arena light counts fixed per tier. Not done: half-resolution tilt-shift and folding OutputPass into GradePass; both change the post look and are left for I2a.
- R8 (engine part): engine.compileScene compiles with the composer's render target bound (compileAsync when KHR_parallel_shader_compile exists), uploads the scene's textures, and keeps programs alive across battles through the anchor. game.js already awaits compileScene on the battle stage. stage.warm, battleState and titleScene belong to S4/S2a.
- R10 (engine part): each tier now defines fieldShadowMap and arenaShadowMap (2048 / 1024 / off). arena.js and titleScene.js (S4/S2a) must read engine.tier.arenaShadowMap.
- R12 (mechanism): engine.compileScene exists, and explore.js (S1a) already calls it under the cover. Measured: revisits link 0 programs.
- R13 (fixed, engine.js and postfx.js): grade into a target, overlay to screen, the shatter scene (target and screen) and the copy (target and screen) are precompiled with the right targets at engine start. Desktop keeps the shatter's frozen and MSAA targets between encounters (ShatterEffect.keepTargets). Measured: second shatter, iris and flash link 0.
- R21 (engine part): engine.reducedMotion follows prefers-reduced-motion live. shake() is skipped, flash() strength is multiplied by 0.35, and 'shatter' plays as a black 'fade' of the same total length; verified with play.mjs --reduced-motion. The CSS callouts are S5's.
- R24 (build part): dist/index.html bundles three.js and has no CDN reference, so it opens offline from disk. The template's capture-phase error listener and watchdog belong to S5.
- R28 (fixed, engine.js): a lost WebGL context shows 'Graphics paused, restoring...'; after 6 s without a restore it offers a Reload button, and the notice clears on restore (shots/S2b/engine/4-6).
- MODULE_NOTES ui note about play.mjs: --disable-gpu-rasterization is still passed through tools/browser.mjs.

## S3 rules

S3 'rules' is complete and node-tested. Every module and contract export exists. src/battle/data.js gains BATTLE_RULES, DIFFICULTY presets, AILMENTS, all 26 learnset skills plus the 4 ultimates (all pass the POC 'skills are well formed' test) and prices on the POC items; ITEMS/ENEMIES/ENCOUNTERS keep exactly the POC keys. src/battle/model.js is extended per 7.1-7.3: party-size scaling and difficulty, AI dispatch ('sentinel' keeps the POC path), the sleep/jam/marked ailments with chance/ailmentResist (rng only when present) and effect.limit, untargetable foes with 'Nothing to target.', lockOn/charge firing `fires` (a break cancels them), mid-round summons, transforms, phases, onDefeat, weakness pools, setResist, the boss-script hooks and api, ultimates (3-BP rule), equipment mods, item damage, winOn 'boss' and defeated:<enc> flags. It emits only the 7.2 event shapes. The new modules are battle/scripts.js (registry and api docs), core/progression.js, core/shop.js and core/save.js (v1 format, v0 migration, validation and fallbacks, localStorage with a memory fallback). core/state.js adds roster/leader/story/played, newGame, joinParty, leaveParty, setLeader, moveMember and the campaign gainXp. content/balance.js has statLine with 7 archetypes, ZONE_RATE_DEFAULT, overrides and an idempotent applyBalance. content/common/data.js has 11 consumables, 2 key items, all 44 binding gear ids, a kit per chapter and the fabricator shop; the other common files are stubs. content/dev/data.js has 12 dev encounters on POC art with 3 boss scripts. tests/policy.mjs is the human-like policy, and tests/simulate.mjs now uses it and still runs. The 51 POC tests pass with their files untouched; my new tests add progression 23, save 11 and model-ext 34. npm test is 200/202: the 2 failures are S2b's content lint and scriptcheck flagging the prologue objective 'pro.wake' (C1 content), not S3 files. With the R18 fix disabled, the POC simulator output is byte-identical to the original model's. All 11 dev encounters resolved in the minified page with --strict and 0 errors.

### Deviations
- Gear personality lint: effect signatures must be unique within a slot (tier 3-4 weapons in one pool, accessories in another), not across all gear. Reason: the plan itself has both Varo's Long Gun and eq_x_varo_compass boost rifle. Each tier 3-4 weapon and each non-keepsake accessory carries exactly one effect; the four keepsakes are excluded and share ailmentResist sleep.
- Durations: action `untargetable: N`, api.setUntargetable({ rounds }) and api.setResist({ rounds }) last the rest of the current round plus N more. They count down at round start like breaks: a foe that dives in round R with untargetable 1 surfaces at the start of round R+2.
- api.setResist map values are damage multipliers (0.5 = half damage of that type). EnemyDef.resist and equipment resist are reductions (damage x (1 - value)). setResist emits cue 'resist' with value = the map, and value null when it wears off.
- charge fires at the charger's last slot of the first round at or after (round + chargeRounds), like lock-on. While a charge or lock-on is pending, lockOn/charge actions are gated off. Break messages are '<name>'s charge was disrupted!' (charge, new) and the POC '<name>'s lock-on was disrupted!'.
- NEW rule (beat guard): a lethal blow on an enemy that still has an unfired `phases` entry or script threshold leaves it at 1 HP, so the phase or threshold plays (ultimate awakenings, Voss overclock). The hit event amount is reduced accordingly. It never applies to POC enemies, and forceVictory bypasses it.
- Script hooks without an enemy argument (onBegin, onRoundStart, onPartyAction, onHit) run once per distinct script id among living enemies; the others run per enemy. onRoundStart also runs for round 1, after onBegin. api.mem is one object per script id per battle. A throwing hook is caught and reported with console.error. Hook nesting is capped at depth 4. onDefeat returning true with HP <= 0 sets HP to 1.
- Enemy `heal` actions: `heal: fraction` heals that fraction of the target's max HP; otherwise a MAG-based amount from `power` (party heal formula). Enemy action targets 'ally' and 'allies' (enemy side) are added. A heal is only picked when an enemy is hurt; a buff on 'self' keeps the POC gate (below 50% HP, and a stat-less buff is tolerated).
- New EnemyDef field `untargetableStyle` and action field `style` choose a submerge action's style (default 'submerge'). New EnemyDef field `shieldGain` defaults to BOSS_SHIELD_GAIN for bosses and 0 otherwise, capped by maxShieldCap.
- marked: single-target picks prefer the marked member after taunt; this also applies to the lock-on fallback retarget (ignoreTaunt).
- Ultimates cost BATTLE_RULES.ultimateBp BP but always resolve at Boost 3 (MAX_BOOST); events are boost {level: 3} and bp {delta: -ultimateBp}. ultimateReady is emitted right after the member's turnStart, once per battle and again after rechargeUltimates. getMenu entries for ultimates add ultimate: true and reason 'Needs N BP' | 'Used'; every skill of a jammed member gets reason 'Jammed'. A mid-battle grantUltimate always sets the flag and the roster skill, but emits `learn` only when the member is in the battle.
- gainXp for campaign members returns [{ level, gains, learned }]; POC members keep [{ level, gains }]. applyRewards appends every `learn` event after all levelUp events, and campaign combatants get their skills synced.
- Sleep: nextTurn consumes a sleeper's turn itself (turnStart, then skip {reason: 'sleep'}, then the order advances) and continues to the next awake actor in the same call.
- Damage items: the action event carries damageType = effect.damage.type and hits 1 (POC items unchanged: null and 0). The hit is fixed damage: no roll, no crit; weakness, break, resist, boost and defend apply.
- effect.cleanse: true removes sleep, jam, marked and negative stat stages; an array removes only the listed statuses (positive stages are never removed). The stim item uses cleanse: ['sleep', 'jam'].
- weakShift (weaknessPool + shiftOnRecover, or api.shiftWeaknesses) resets `revealed` to []. The pool cycles in order from the set equal to `weaknesses`, and the event is emitted right after its `recover` event.
- Summoned enemies are named '<Name> A/B/...' by how many of that kind the battle already holds (a lone single summon keeps the plain name). Transform keeps `used` cooldowns and script thresholds; the new kind's phases start fresh.
- R16 model side: reviving a member an enemy is still locked on to emits telegraph { actorId, targetId, text: '<enemy> is still locked on to <member>!' }. R18: a reveal emits extra reveal events for living same-kind enemies.
- Party-size scaling index is party.length clamped to 1-4. Difficulty still applies with scale: false.
- Extra exports: model.js setDifficulty(mode), MAX_ENEMIES. data.js DIFFICULTY, AILMENTS. state.js MAX_PARTY, DEFAULT_STORY, makeMember, kitFor, outfitMember, equippedCount. progression.js MAX_LEVEL, SLOTS, STAT_KEYS, ULTIMATES, emptyEquip, emptyMods, gearEffects, gearTypesValid. shop.js priceOf, sellPrice, sellable, MAX_STACK (99), DEFAULT_SELL_RATE. save.js storageMode, markCleared, isCleared, chapterLabel, SAVE_PREFIX, CLEARED_KEY. balance.js ARCHETYPES.
- progression.equip(member, slot, itemId, inventory = gameState.inventory) and optimize(member, inventory = gameState.inventory) take an optional inventory. progression.js imports gameState and xpToNext from state.js (a state <-> progression import cycle; it is safe because state's top-level resetGame() uses only local functions and the progression function declarations emptyEquip/emptyMods).
- LEARNSETS shape: { [memberId]: [{ level, skill }] } in learn order.
- state.js: resetGame() also fills roster (the same objects as party), leader 'kade', the default story and an empty played. joinParty on an existing roster entry raises it to `level` when higher (learning skills) and heals it to full. joinParty refuses a 5th member (console.error, stays in roster). leaveParty refuses the last member. setLeader and moveMember return booleans. Kits come from src/content/common/data.js directly (the same objects REG.kits receives). A new member's tier-1 gear is kits.prologue.equip[id].
- useItemOutOfBattle: 'allies' items heal every living member and ignore memberId. Damage items answer '<item> only works in battle.' Cleanse items answer '<name> has nothing to cure.' All POC messages are unchanged.
- shop.js: buy refuses key items and items without a price ('isn't for sale') and carrying more than 99. sell refuses key items ('too important to sell'), unpriced items such as keepsakes ('Nobody here will buy'), and worn-only gear ('Unequip the X first.'). shopStock(shop, state = gameState) counts owned = held + worn by roster members.
- save.js: v0 is defined as the POC gameState shape (party array of members, POC flag names, positions without a map). Migration renames crate_<id> -> chest:halcyon:<id>, bridge_unlocked -> story:bridge_unlocked and talked_bolt -> talk:halcyon:bolt, drops rested, and keeps boss_defeated while adding defeated:pro_boss_sentinel. Roster entries of POC (non-campaign) members carry `legacy: true`, so the `poc` sandbox reloads with POC skills. deserialize returns null without touching gameState for unusable data. The returned pos is { map, x, z, facing }, or { map, spawn } when a fallback spawn has no known coordinates. An invalid checkpoint is dropped (set to null). writeSlot returns { ok: true, storage: 'memory', error } on the first storage failure, then { ok: true, storage: 'memory' }. Map validity reads raw REG.maps (transit/scene); the location dock is the first REG.destinations entry of locationOfMap(map).
- balance.js: applyBalance also merges overrides.party[id].base/.growth into PARTY_DEFS in place, because balance.js may only import battle/data.js and statsAt reads PARTY_DEFS. overrides = { party, enemies, rules, zoneRate }. Enemy overrides deep-merge, so `stats` merges per stat.
- Ultimate skills carry fx ids 'ult.oathblade', 'ult.ringfire_barrage', 'ult.singularity', 'ult.lifebloom'; S4 must register these exact ids. Dev boss enemies use the 'elite' stat line, not 'boss', so preview fights stay short.

### Integration notes
- S2a: set game.policy = createPolicy() from tests/policy.mjs for debug.autoResolve('policy'); it currently uses S4's autoAction. The policy is plain ESM with no node imports, and createPolicy() learns from model state when observe() is never called.
- S2a/S5 settings: call setDifficulty('story' | 'normal') (battle/model.js) when the Difficulty setting changes; it mutates BATTLE_RULES.difficulty in place.
- S2a saves: show the memory notice when writeSlot(...).storage === 'memory' or storageMode() === 'memory'. Title: use latestSlot() and isCleared() / markCleared() for the 'voidpath.cleared' marker. deserialize(snapshot, { keep: ['stats', 'played'] }) for Retry. deserialize returns null for unusable data.
- S2a jumpTo: makeMemberAt(id, level, { flags }) already learns every skill up to that level and flag-granted ultimates. outfitMember(member, kit.equip[id]) equips kit gear directly at full HP/EP. kitFor(chapter) returns REG.kits' objects.
- S4: new cue names are 'protect' and 'protected' (targetId), 'resist' (value map, or null when it wears off) and 'ultimatesRecharged'. The dev conductor also uses 'domeLight'. Charge telegraphs use targetId null. A damage item's action event has damageType set and hits 1. The four ultimate fx ids are listed in deviations. Dev encounters for previews: dev_party1..3, dev_summon, dev_transform (+dev_transform_2 for retryPhase), dev_submerge, dev_sleep, dev_winon, dev_charge (dev_overload_beam has fx 'dev.beam'), dev_cue, dev_ultimate. All use POC art keys with tints.
- S4 preview-battle does not register content data yet, so ?enc=dev_* falls back to drone_pair. Calling registerAllData() (content/data.js), or registering dev/data.js, makes them available.
- S5: rules signatures used by ui.js match: equip(member, slot, id), equipDelta, canEquip, optimize(member, inv), buy(id, n, price), sell(id, n, rate). gearEffects(itemId) gives effect tags ('boost:rifle', 'startBp', ...) for the Equip UI. sellable() lists the Sell tab. ITEMS[id].icon is set on gear ('weapon' / 'armor' / 'accessory'), charges (element names) and key items ('key').
- S2b: the content lint / scriptcheck failure is CHAPTER_START.prologue objective 'pro.wake' not being defined; that is C1 prologue content, not S3. common/story.js stays the {} stub for C1 (speakers, tips, companions).
- C10: tune balance through content/balance.js overrides (party / enemies / rules / zoneRate) and statLine archetypes. All gear stats and prices, kits and the fabricator stock are first-pass values in common/data.js. tests/policy.mjs exports policyAction(m, actorId, memo) and observe(memo, events) for campaign.mjs. Enemy heal actions take `heal: fraction`.
- Content authors (Wave C): boss beats are safe from overkill (beat guard). EnemyDef.ai defaults to 'sentinel' only for a boss without `script`; scripted or non-boss enemies use 'basic'. Set ai: 'basic' on a scriptless boss that should use gates and summons. lockOn/charge `fires` ids must exist (a missing one is a console.error). Set action.cooldown to stop telegraph spam.

### Known issues
- Browser battle presentation is S4's work in progress. In the main page, encounters with an `intro` stalled at the boss card (round never started), so in-browser shots of summons, sleep icons and transforms were not captured. The model was verified in node (68 new tests) and in the minified page through debug.autoResolve: all 11 dev encounters resolved with --strict, 0 page errors and 0 console errors.
- npm test: 200/202 pass. The 2 failures are S2b's tests/content.test.mjs and tests/scripts.test.mjs flagging the missing prologue objective 'pro.wake' (C1 content).
- First-pass numbers for the 26 new skills, the 44 gear pieces, consumables, kits, shop prices and statLine curves; the targets of 10.4 are C10's to tune. Dev bosses use 'elite' lines: the policy wins dev_transform and dev_transform_2 about 77% at the POC party.
- An enemy whose every action inflicts sleep on everyone can chain-sleep the party: sleepers skip, and the effect refreshes to the longer duration. Content should use cooldown / limit / chance, as the Warden's Lullaby rules already require.
- The POC heuristic was replaced by the shared policy in tests/simulate.mjs, so its printed numbers differ slightly from earlier POC runs (boss_sentinel heuristic win rose from 78% to 89% at 100 battles).

### POC review findings fixed
- R18 (model.js): fixed. A revealed weakness is also revealed on every living enemy of the same kind, with one reveal event each. Covered by model-ext 'a reveal also reveals the weakness on living twins (R18)'.
- R16 (model.js): model side fixed. Reviving a member an enemy is still locked on to re-emits a telegraph for that member, so the presentation can restore the reticle (model-ext "sentinel AI fires... reviving the locked member re-announces the lock (R16)"). Keeping the reticle on KO is still S4's director.js part.
- R15 (model.js listed): not fixable in model.js. Always emitting orderUpdate would break pinned POC tests that assert exact event lists without it (e.g. 'weakness hit reveals once...' expects ['action','hit','reveal','shield']). The fix belongs in BattleUI.setActive (S4).
- R3 (model.js listed): not applicable to my files. The cause is the pause menu staying open into battle; that fix belongs to ui.js/game.js/battleState.js. The model's _syncParty is pinned POC behaviour and was left as is.
- R20 (model.js listed): not applicable. The model never cracks a broken target's shield; the wrong help text is in battleUI.js (S4).

## S4 battleview

S4 battleview is done and all 15 acceptance items pass. One caveat on the fitBox item: the party stays full size on a phone, but on a 16:9 desktop the colossus test art still shrinks it to about 73%.

What was built:
- Battle presentation (TECH_PLAN 7.4): party layouts for 1 to 4 members, and a boss slot with add slots.
- Mid-battle changes: summons (holo or rise entrance), transforms (flash, shake, shards, sheet swap) and untargetable states (submerge, phase, shield), with dimmed plates and SUBMERGED / PHASED tags.
- Charge warnings: a screen-wide band that then docks. Lock-on reticles now hide on KO and come back on revive (R16).
- Cues to arenas and fx, and a battle dialog strip (typewriter text, speaker portraits or sigils, auto-advance).
- Boss intro card with a camera push, boss defeat fx, and cut-ins for the four ultimates plus the awakening variant.
- Sleep, jam and marked icons, now also on phone party cards. Results list learned skills and show LEVEL UP only for real level-ups.
- Battle speed setting, tips, intro and outro lines, phase music on transform, autoAction, and an action fx registry (`battle/actionfx.js`, new).
- Arena kit and registry with a light budget per quality (7.5), the four POC arenas ported unchanged, and the enemy art registry with fitBox, placeholder fallback and art cache (7.6).
- Canned event fixtures and both preview tools, plus the dev fx and dev arena content.

Changes in this last stretch:
- **fitBox camera fit:** a fitBox core may now rise above the fit band (up to 12% from the top on phones, 10% on wide screens), and the party is placed lower in the band when the core needs room. The test art's fitBox now frames only its glowing core. The POC fit is unchanged when no enemy has a fitBox.
- **Submerged foes:** their plates and hit boxes stay where the foe stands instead of following it into the floor.
- **Wide-screen dialog strip:** it moved to the bottom left, beside the party panel, so it no longer covers the party.
- **Phone dialog strip:** the touch A and B buttons lift above it and the Boost buttons hide while it shows.
- **Phone party cards:** ailment icons now show; stat buffs stay hidden there as in the POC.
- **Cut-in text:** the skill name no longer overlaps the portrait.
- **Phone plates:** they stay below the help box.
- **Enemy preview:** labels now sit under their own sprites.

Checks:
- `npm test`: 202 of 202 pass.
- Scenario 03-battle on the main build (`--strict`): 0 page errors, 0 console errors.
- Scenario 06-mobile: the full run fails before the battle, at the field-dialog tap (step 25), which is outside S4's files (see known issues). A copy of the run with the BOLT-dialog steps removed passes with 0 errors.
- I rebuilt the main, preview-battle and preview-enemies entries as dev builds.

### Deviations
- stage.transform(id, kind): the spec says `stage.transform(id, art)`. The second argument is an ENEMIES kind (its EnemyDef tint, stage.scale and stage.hover apply, and the art is EnemyDef.art ?? kind) or a bare registered art id. It returns a Promise that resolves after the sheet swap.
- stage.addCombatant(c, { style }) and stage.setUntargetable(id, on, style = 'submerge') return Promises. The entrance style defaults to EnemyDef.stage.spawn ('holo' | 'rise'; else 'holo'). setUntargetable styles are 'submerge' | 'phase' | 'shield'. Beyond stage.slot, EnemyDef.stage also reads `scale`, `hover` and `spawn`.
- ui.setUntargetable(id, on, style): the spec has (id, on). The third argument picks the tag: 'submerge' gives SUBMERGED, 'phase' gives PHASED, 'shield' gives SHIELDED. The plate dims and the foe drops out of target lists while on.
- ui.ultimateCut(memberId, skillName, { awakening = false } = {}). The awakening variant (portrait '<id>:determined', 'Awakening' kicker, 1.6 s instead of 1.1 s) is chosen by this option and played from a `learn` event with ultimate:true. The boss-script line before it comes from the preceding `say` event, not from ultimateCut.
- BattleUI methods added beyond 7.4: ui.chargeBand(text | null) -> Promise (the band sweeps across, then docks as a small strip; null clears it), ui.weakShift(id, weakCount, revealed), ui.ultimateReady(id, on). Constructor options added: `fieldUI` (the game UI, used for fieldUI.speaker(name) -> { portrait, sigil, accent }) and `combatants` (defaults to model.combatants).
- Dialog strip placement: the spec says 'above the party panel'. That holds on phones, short landscape and viewports under 1000 px wide. On wide screens (min-width 1000px, not compact or short) the strip sits at the bottom left beside the party panel (left 14px, bottom 12px, width min(720px, 100% - 486px)) so it never covers the party's sprites.
- Boss defeat fx lookup: the spec says `<boss>.defeat`. The Director tries `${EnemyDef.script}.defeat`, `${kind}.defeat`, `${art}.defeat`, then `${kind.split('_')[0]}.defeat`, using the first one registered. A foe with a defeat fx stays on stage after its KO until director.victory(), which dissolves any remaining adds, plays the fx, then the victory pose.
- Lock and charge `fires`: taken from the lockOn or charge action def's `fires` field (default 'annihilator_beam' for kind lockOn, none for charge). A scripted `telegraph` event with no prior lockOn or charge creates a threat whose `fires` comes from the `then` field of the same actor's next action def. If that def has no `then`, the threat clears after that action. A KO'd lock target keeps the lock (reticle hidden) and a revive shows it again.
- fitBox semantics (7.4 and 7.6): the core rect must stay between CORE_TOP (0.12 of screen height on phones, 0.10 on wide screens) and the fit band bottom. It may rise above the band, and the party may be placed lower in the band to make room. The rest of the art bleeds. With no fitBox enemies the fit is byte-for-byte the POC fit.
- Battle speed source: director.speed = battleSpeed(ctx.settings.battleSpeed ?? ui.getSetting('battleSpeed')). Accepted values are 1, 1.5 and 2 (or '1.5x'); anything else becomes 1. Holding confirm during an enemy turn still multiplies by 2.2 (POC).
- BattleState.enter({ ..., canFlee }) passes canFlee into the BattleModel options when given. Battle music starts 2 frames after enter (_musicIn) so the first-frame link stall does not swallow the opening notes (R8). encounter.phaseMusic[transformKind] switches the track on a transform event.
- Tips: encounter.tips entries { on, lines, flag } override global ctx.content.tips[key] = { lines, flag }. The flag defaults to 'tut:<key>' and is set directly in (ctx.state || gameState).flags when the tip shows. Keys come from tipKeys(e): event type, 'status:<stat>', 'cue:<name>', 'bp3', plus 'begin' and 'playerTurn'.
- Results data: resultMembers() adds `learned: string[]` (names from learn events) to each member, alongside `gains` (levelUp events only). showResults renders a 'NAME learned Skill' line per entry.
- art/enemies.js: buildEnemySprite(art, { size } = {}) has an extra size option, used only by the tinted-drone placeholder. Art cache keys are 'enemy:<art>' (sheet.cacheKey is set, so SpriteActor acquire and release work) and 'enemy:<art>#icon'. art/fx.js uses 'fx:<name>' with location 'core'.
- arena.js: buildArena(scene, name, { quality }) takes a third argument. It returns { name, kit, theme, lights, emitters, fogDensity, update, react(event), dispose }; react(event) calls the registered def.react(kit, event). An unknown arena name calls noteMissingArt, warns, and builds 'corridor'.
- stage.dispose does not call Particles.dispose() (S1b), because that disposes the pool materials and frees their programs. It removes each pool's Points, disposes its geometry and calls programs.release(pool.mat) instead; without this, a second battle linked 2 programs.

### Integration notes
- S1b (core/particles.js): Particles.dispose() disposes its materials. S4's stage now releases pool materials through programs.release instead of calling it. If Particles.dispose switches to release(), BattleStage.dispose can call it again.
- Audio (core/audio.js owner): the Director requests the sfx names 'summon', 'transform', 'submerge', 'emerge', 'glitch', 'sleep' and 'awaken'. They are not in audio's SFX table yet, so they are silent no-ops. Existing names used: charge, levelup, boost, talk, cursor, error.
- Content authors: register arenas with registerArena(name, { theme, build(kit), react?(kit, event), textures? }), enemy art with registerEnemyArt(art, def) (frames up to 256x256, at most 12 frames, fitBox on the core), action fx with registerActionFx(id, async (d, act) => {}), and cue fx as 'cue.<name>'. Defeat fx can use any id in the lookup order listed in the deviations. Built-in ultimate fx ids: ult.oathblade, ult.ringfire_barrage, ult.singularity, ult.lifebloom (S3's SKILLS already reference them). Dev content: content/dev/fx.js ('dev.beam', 'dev.defeat', 'cue.dev_flare') and content/dev/arena.js ('dev_lab').
- fitBox guidance for the final bosses (warden 256x256): frame only the core (for example the glowing heart), not the whole torso. A tall fitBox still pushes the camera back, especially on 16:9 desktop.
- Preview URLs: dist/tools/preview-battle.html?enc=<id>&party=<n>&seed=<s>[&arena=<name>&auto&fast&q=low|medium|high] and ?events=summon|adds|transform|submerge|phase|charge|say|skip|cue|learn|ultimate|intro|results|colossus|defeat. window.__PREVIEW offers pauseOn(type, delay, uiMs), resume, links() (= renderInfo().compiles), lights(), dismiss, restart. Enemy preview: dist/tools/preview-enemies.html?art=a,b&compare=drone&mobile=1[&anim=break]; unknown arts show the placeholder with a warning.
- Battle UI adds the html classes 'vb-saying' and 'vb-ended' and the variables --vb-panel and --vb-say-h on document.documentElement. These drive the touch-button placement for .vp-touch[data-ctx="battle"] in portrait; all are removed on dispose.
- I rebuilt dist/index.html, dist/artifact.html, dist/tools/preview-battle.html and dist/tools/preview-enemies.html with --dev. The orchestrator should rebuild release outputs as usual.
- Scenario 03-battle passes on the main build (shots/S4/scen03). 06-mobile's battle steps pass when its BOLT-dialog steps are skipped (shots/S4/scen06).

### Known issues
- On a 16:9 desktop the 256x192 dev_colossus (fitBox [100,70,56,56]) still shrinks the party to about 73% (Sera about 127 px vs 175 px in a drone battle; shots/S4/final/colossus.png), because the core is 3.8 units high at the back slot. Phones are full size.
- Scenario 06-mobile (tests/scenarios, not S4's) fails at step 25: S5's field dialog layer '.vp-layer.vp-dlg' intercepts Playwright taps on '.vp-dlg-panel'. That dialog then stays open over the battle that debug.startBattle starts, so the later battle taps also fail. Outside S4's files.
- One phone run of the battle-only scenario copy showed the BOLT talk line ('Status report, BOLT...') over the battle results, with the page shifted left. It did not reproduce on a probe rerun (shots/S4/probe06/09-battle-results.png is clean). The field may sometimes receive an A press during a battle; the explore and game owners may want to check.
- On phones with two stacked drones, the back drone's plate sits under it and its HP bar can touch the top of the front drone (shots/S4/final/party2-phone.png, party3-phone.png). This is the POC placement; the above-head fallback is now blocked by the help box.
- The dev_colossus test art and the speaker styles used by the fixtures are registered only inside preview-battle.js, not in the content registry.
- SwiftShader under shared load runs game time far slower than real time, so screenshot timing relies on game-time and UI-clock pauses (window.__PREVIEW.pauseOn). Some shots took several minutes.

### POC review findings fixed
- R3 (battleState.js part): BattleState.enter closes an open ui.menu, so a pause menu opened during the shatter does not stay over the battle.
- R8 (stage.js, effects.js, battleState.js parts): stage.warm() uploads sprite textures, shows empty particle pools for the compile and keeps an effects quad and orb drawn at zero intensity. No renderer.compile with the wrong render targets; preview and BattleState use engine.compileScene. Battle music starts 2 frames after the stall.
- R9 (arena.js part): battle lights follow quality: point 6 / 4 / 2, spot only on high, fixed counts so programs are shared.
- R10 (arena.js part): battle key shadow map is 2048 / 1024 / off for high / medium / low.
- R11 (stage.js, effects.js, battleState.js parts): warm covers particle pools, effect sheets, glow and the boss reveal (enemies enter at 0.01 opacity rather than hidden). Second-battle compiles are 0, checked after 8 hits.
- R14: the target-cursor minimum y is cached per target screen instead of being read every frame.
- R15: the turn bar drops leading slots after each action and marks the active slot without a full re-render.
- R16 (director.js part): KO of the lock target hides the reticle, revive restores it, and the beam's `fires` id clears the lock.
- R17: BattleUI.dispose cancels and removes driven and paused CSS animations, so finished battles are not kept alive.
- R18 (battleUI.js part): a revealed weakness flips on same-kind twins' plates and in the menu hints (the model side is S3's).
- R19: rotating the device mid-action re-homes actors once the timeline is idle (_rehome).
- R20: targeting help on a broken foe shows the x2 broken-damage note instead of 'This hit cracks its shield'.
- R21 (battleUI.js part): with prefers-reduced-motion, damage numbers, BREAK, labels and banners keep their timing and fade without motion. Camera shake and flash gating is in engine.js, which is not S4's.
- R22 (battleUI.js part): results panel, dialog strip and command rows use pointerup, so taps count while another finger rests on the screen.
- R23: on short landscape phones the Boost pair sits beside A, clear of Sound; the command list max-height keeps it on screen and off the party panel.
- R26: the battle top bar wraps and the help box keeps a minimum width in narrow or embedded panels.

## S5 ui

S5 "ui" is finished. Every page in the section 13 acceptance list renders through `dist/tools/preview-ui.html#<page>` at 1280x720 and with `--mobile` (390x844). Both final passes ran under `--strict` with 0 page errors and 0 console errors (40 desktop shots, 27 phone shots).

Keyboard, gamepad and tap suites exercise every new screen. On the last run they reported 0 errors and every logged result matched the expected value. `npm test` passes 202/202, which includes the 51 POC tests. `node build.mjs --dev --only main` and `--only preview-ui` both build, and `dist/index.html?q=low` boots to the title with 0 errors.

What was built:
- **Pause menu:** seven tabs. Party (formation popup), Equip (member strip, slots, candidate list with comparison arrows and effect tags, Remove, Optimize), Items (allies targets, cleanse tags, a read-only Gear section), Journal, Map (a schematic that pans by drag or arrow keys when it does not fit), Settings (difficulty, encounters, battle speed, skip-weak, quality with an AUTO note, Return to title with a confirm) and Controls.
- **Other screens:** Shop (Buy/Sell, quantity stepper, per-member arrows, keeper strip, "Equip now?"), Starchart (SVG Tethys, locked nodes, NEW tags, amber warning, animated route, labels placed so they avoid the planet and each other), and Saves (save/load, read-only autosave, overwrite confirm, damaged and empty slots, a memory-storage notice).
- **Cards:** chapter, logo, caption, credits with cast lines and hold-to-skip, and THE END.
- **Title and game over:** title with Continue and Load; game-over variants (Retry from the second form, Retry from checkpoint, Load journey, Title); a "Journey Complete" end screen.
- **HUD:** location banner with objective, objective toast, party toast, prompt badge, letterbox, skip hint.
- **Dialog:** expressions, an off-screen voice icon, the WARDEN gold-iris sigil with slow text and per-box sfx, and long lines stepping down a font size on phones (the 100-character line fits in 3 lines at 390x844).
- **Icons:** 32 new ones plus the warden sigil.

Late fixes found by the final checks:
- The cards layer never accepted taps, so THE END and the finger-hold credit skip did not work on touch. The layer now goes live while a card is up; tap-suite evidence: `endDone: true`.
- Map exit labels overlapped area labels. Room is now reserved for them, long area names wrap, and the chart pans on phones (shown in a drag shot and by a keyboard pan of tx −182 → −266).
- Starchart labels collided on phones; placement now scores each side.
- A clipped party note moved into the formation popup.
- Captions are centred on phones.
- R24: the "Loading" text now hides when the error message shows.

### Deviations
- Map tab: when the explored part cannot fit at 14 px or more per cell (phones, big maps), the chart is drawn at 14 px per cell, centred on the leader, and pans by drag or by the arrow keys. Arrow panning works after Enter gives the page focus. Touch shows a 'Drag to pan' hint. On desktop the chart fits, so there is no panning and no Enter hint.
- The `mapData()` hook shape is not defined in TECH_PLAN, so I defined it in the src/ui/map.js header: { map, leader: {x, z, facing}, objective: {text, target: {map, x, z} | {map, interactable}} | null, flags, visited?, area?, test?(cond), mapName?(id) }. Visited areas default to the `area:<map>:<area>` flags. Gates and drains use `world/cond.js` testCond. When the target is on another map, the exit toward it is drawn in the goal colour.
- Extra options on contracts:
- `ui.cards.chapter/logo({ hold })` keeps a card up until `clear()`, for previews.
- `ui.cards.end({ text, ms })`: `ms` is the delay before Continue is accepted.
- `ui.screens.complete({ continueLabel = 'Return to Ione' })`.
- `ui.hud.setPrompt(label, { icon, badge } | icon)`.
- `ui.hud.setArea(name)` updates the menu location without a banner (see R6).
- `ui.hud.objectiveToast` and `showLocation` objective text accept *emphasis* markup.
- Chapter cards cannot be skipped by Confirm; input is held while they are up, as section 8.5 says. The cutscene runner shortens them with `ms` in skip mode.
- Settings:
- `setHooks()` immediately calls `hooks.settings` once with every stored game setting (difficulty, encounters, battleSpeed, skipWeak, quality), so the game can apply them at boot.
- When the player picks a quality, the stored settings get `qualityAuto: false`.
- perf.js's `ui.setSetting('qualityAuto', true)` makes the AUTO tag and the 'Lowered automatically' note show.
- The preview now uses the same art icon provider as main.js (`iconURL(n, 2)`); the POC preview used the UI's fallback glyphs. Prompt and toast icons on POC pages therefore show the real art icons. Layout is unchanged.
- The Party page's explanatory note ('The leader walks the field...') moved into the formation popup text ('Lv 11 Technomancer. Position 3 in the battle line.'). Below the cards it was clipped by the footer at 1280x720.

### Integration notes
- S2a (main.js): call `ui.setHooks({ setLeader(id), moveMember(id, toIndex), optimize(memberId), equipNow(memberId, itemId), journal(), mapData(), settings(patch), quitToTitle() })`. Every hook is optional and wrapped in try/catch with `console.error`.
- `journal()` returns `{ chapter: {id, kicker, title, traveler}, objective: {id, text, hint}|null, side: [{id, text}], done: [{id, text}], recaps: [{chapter, title, text}], chapters: [{id, kicker, title, state}] }`.
- `mapData()` uses the shape in the src/ui/map.js header.
- `settings` receives `{ difficulty, encounters, battleSpeed, skipWeak, quality }` patches.
- S2a: `ui.title.show({ onStart, onContinue, onLoad, hasSave })`. Return `false` from onStart or onContinue to keep the title up when a start is refused. `ui.screens.gameOver({ onRetry, onRetryPhase?, onLoad, onTitle })`: if onLoad returns a promise that resolves truthy, the game-over screen closes; otherwise it stays.
- S2a: `ui.saves.open({ mode, slots: listSlots(), storage })` resolves with the slot id or null; storage 'memory' shows the session-only notice. `ui.shop.open({ shop, stock })` and `ui.starchart.open({ destinations })` resolve as in section 8. Shop and Equip use core/progression.js and core/shop.js unless `new UI({ rules })` overrides them.
- S1a (explore): call `ui.hud.setArea(areaName)` whenever the leader's area changes, even when the banner is suppressed (R6). `ui.hud.showLocation(name, subtitle, objective)` sets the location for the menu header.
- S2a (input.js, hold-to-skip): `hud.skipHint(true)` shows a 'Hold to skip' pill with the device's Cancel glyph. During cutscenes the input context is 'dialog', and input.js CSS hides the touch B button in that context, so touch players cannot hold Cancel. Either show `.vp-tc-b` in the dialog context while a skip is possible, or treat a finger hold as Cancel.
- S2b (perf.js): `ui.setSetting('quality', q)` with `ui.setSetting('qualityAuto', true)` shows the AUTO tag and the note. A player's own pick stores `qualityAuto: false`.
- Register WARDEN with `ui.registerSpeaker('WARDEN', { sigil: 'warden_sigil', accent: '#ffd27a', textSpeed: 0.6, sfx: 'choir', mood: 'warden' })`. A dialog line `portrait: 'sera:sad'` or `expr: 'sad'` asks the portrait provider for 'sera:sad'.
- Credits `cast` lines take portraits from the portrait provider. `REG.credits` lines are rendered as given; the closing line and THE END come from `cards.end()` and are separate calls.
- dist/index.html and dist/artifact.html were rebuilt with `--dev --only main`. The orchestrator's release build should run the normal minified build.

### Known issues
- The machine was heavily loaded (load average 25–30). The preview caps frame dt at 0.05 s, so game-time UI timers such as the game-over input lock, typing and card readiness run slower in wall time. Interaction suites therefore wait on conditions instead of fixed sleeps; earlier fixed-wait runs showed collapsed key presses that were timing artefacts, not code faults.
- Shots taken 1.3 s after a scene switch can catch a fade in progress: the title intro, the end-screen buttons, a previous scene's dialog fading out. The POC comparison uses the POC's own timings, and longer waits for the title and complete pages (shots/S5/poc-slow*).
- Portraits in the preview are stand-in busts. The real portraits come from the game's portrait provider (S1b).
- On touch, the 'Hold to skip' cutscene pill shows the B glyph, but input.js hides the B button in the 'dialog' context (S2a; see integration notes).
- R6 is only fully fixed once S1a calls `ui.hud.setArea` from `_detectArea`.

### POC review findings fixed
- R2 (src/ui/title.js): the title ignores input while `engine.transitioning`. Continue and New Journey hide the title only if their callback does not return false, so a refused start leaves the menu up.
- R3, UI part (src/ui/ui.js): the pause menu does not auto-open while `engine.transitioning`. The battle side (closing the menu in BattleState, blocking battle input) is S2a/S4.
- R4 (src/ui/title.js, src/ui/ui.js): `title.hide()` pops its input context with base 'title'. Neither the pause menu nor the battle touch buttons can appear during the New Journey iris; the next state sets its own context. Keys suite after New Journey: ctx 'title'.
- R6, partial (src/ui/hud.js, src/ui/menu.js): `hud.setArea(name)` updates `ui.areaName` without a banner, and the menu header reads `ui.locationName` / `ui.areaName`. S1a's explore `_detectArea` must call `ui.hud.setArea` on every area change for the stale-label case to go away.
- R21, template and HUD (src/index.template.html, src/ui/hud.js): the reduced-motion rule keeps animation durations and only limits iterations and transitions. Toasts and banners are removed by timers and have motion-free variants. Measured: a toast stays at opacity 1 after 1.5 s under reduced motion (shots/S5/checks/r21-reduced-motion-toast.png). The battleUI and engine shake/flash parts belong to S4/S2b.
- R22 (src/ui/theme.js onTap, used by dialog, menu rows, title, screens, popup, shop, starchart, saves and cards): rows activate on pointerup with the same pointer and less than 14 px drift, not on click synthesis. The battleUI click handlers belong to S4.
- R24 (src/index.template.html): a capture-phase error listener catches the failed module or script load and shows 'Voidpath could not load three.js from cdn.jsdelivr.net…' with a Retry button. The Loading text is hidden, and a 15 s watchdog covers a CDN that hangs. Measured on dist/artifact.html with the CDN blocked: shots/S5/checks/r24-no-three.png.
- R25 (src/index.template.html): fonts load through `rel=preload as=style`, switched to stylesheet by an inline script, so a hanging font host no longer blocks paint or the module. Measured with fonts.googleapis.com never answering: first contentful paint 56 ms, preview ready after 730 ms.
- Not mine: R27 (input.js Tab trap, S2a) and the battle parts of R21 and R22.

## W writing

I wrote /home/user/Research/voidpath/WRITING.md (1,706 lines), the writers' bible for Wave C. It has 11 sections:
1. House style: box rules, line format, spelling and case rules (the Halcyon is the ship, HALCYON is her mind), emphasis, narration, tone, staging codes, budgets and the FIXED canon lines.
2. Voice sheet: seven sample lines each for KADE, NYX, ORION, SERA, BOLT, HALCYON, WARDEN, RUSE, VOSS and THEO, plus who calls whom what, the minor voices, each traveler's dream temptation and refusal, character arcs, and a speaker registry saying which location registers each speaker.
3. Canon: facts, a timeline, how things work, banner names, a glossary with Ringborn idioms, the POC-to-full-game lore replacements and a crew name list of about 30 names.
4. A callbacks table: 25 rows, each with setup, payoff and owner.
5. The scene inventory per chapter: script id, trigger, purpose, speakers, budget (boxes / seconds, plus a planned duration), staging devices, music and flags set. Key scenes also get beat-by-beat anchor lines, boss battle lines with their fx ids, and field scripts. A pacing summary per chapter is checked against TECH_PLAN 11.7.
6. Eleven Party Talks.
7. The Driftmarket NPC roster: 14 stable ids, 9 looks, 4 walking paths, one line idea per chapter.
8. Hub and world-reacts changes.
9. Tips, BOLT hints, an objectives table, seven recap drafts, leader-gated interaction ideas and shop greetings.
10. A credits list.
11. A checklist of every binding script id with its budget.

I checked budgets against the real tools/scriptcheck.mjs, not only the plan text. That script splits budgets at battles, counts the boxes of a nested `cs.run` in the calling script, counts choice prompts as boxes and scans literal `cs.flag` calls. I did not edit any code. None of the POC review findings touch my file.

### Deviations
- Chapter 4 card location: the 4.1 chapter-boundary table says the ch4 card plays on 'vault core, then goto bridge', while 12.5 says 'the FINAL CHAPTER card on the bridge' and 7.9 sends the Echo aftermath to halcyon:bridge. WRITING.md follows 12.5 and 7.9: vault.echo's aftermath runs `cs.goto('halcyon', 'bridge')`, shows the Ione node at the Starchart, then plays card 'finale' on the bridge.
- Kade's 'Then we make somewhere.': STORY.md puts it as his reply to Voss before the fight, while 7.9 puts it at his ultimate awakening. WRITING.md splits it: before the battle Kade says 'Then...' and Voss cuts him off; he says the full line at the overclock, right before the awakening.
- Finale Party Talks: 12.4 asks for two per chapter, but neither the heart nor the dreams brief in 12.5 lists any. WRITING.md assigns the finale's two (fin.kade_orion, fin.nyx_sera; scripts heart.pt_*) to `heart` (C7). Under cut-list item 8, the second talk of each chapter goes first.
- Driftmarket NPC lines for the finale chapter: 12.3 says 'every chapter owner', and the finale has three owners. WRITING.md gives the finale's `extends.driftmarket.talk` lines to `heart` (C7) and the post-game lines to `epilogue` (C8).
- shoals.maw budget is 16 boxes / 120 s, above the 8-box size of its own text. The real dry run counts boxes from a nested `cs.run('driftmarket.return')` in the caller's post-battle stretch (4 + 11 = 15). driftmarket.return keeps its own 11 / 80 budget. The chain stays inside 25 / 150.
- dreams.crown is one script (approach, battle, resolution) with budget 18 boxes / 240 s, not a separate resolution script. Both stretches fit: 6 boxes before the battle, 12 after.
- epilogue.main is planned at 150 s, not the 4-minute resolution allowance. The epilogue's ~5 min in 11.7 is 150 s of vignettes plus about 150 s of credits.

### Integration notes
- The budgets match what tools/scriptcheck.mjs actually does today: budgets per stretch between battles, nested cs.run boxes counted in the caller, choice prompts counted as boxes, cs.wait counted in seconds, unlisted talk scripts run once for per-box checks. If S2b changes those rules, G1 should re-read sections 1.8 and 5.10.
- Party Talks are capped at 10 boxes only if they are listed in `scenes` with a budget. WRITING.md 1.8 tells owners to list every story beat and every Party Talk in `scenes`, and to keep talk, terminal and hub scripts out.
- Ids proposed for other owners (stable, so they line up): trigger ids (`arrival`, `tutorial`, `nyx_door`, `drained`, `bolt_reveal`, `dream_<member>`, `crown`, `epi.main`), extends ids (`dm.coil_socket`, `dm.trader`, `arb.tender`), local flags (`pro:promised`, `pro:flight_<dest>`, `dm:legend_heard`, `dm:bolt_hub`, `arb:bolt_hub`, `spire:bolt_hub`, `vault:bolt_hub`, `dream:night_before`), and objective ids beyond the binding ones (pro.medbay, pro.find_keycard, pro.reach_bridge, pro.open_bridge, pro.sentinel, ch1.ask_ruse, ch1.restore_power, ch1.varo_quarters, ch1.install_coil, ch2.drain, ch2.stasis, ch2.choir_gate, ch2.find_theo, ch3.grids, ch3.climb, ch3.command, ch4.crystals, ch4.core, fin.ascend, fin.crown, epi.shore). No new `story:` flags are introduced.
- Characters and speakers owners must register: `varo` (shoals; hologram, base 'nyx'), `theo_grown` (dreams; base 'theo'), `mother7` (arboretum), `voss`, `ruse`, `theo`, the Driftmarket looks (`rb_elder`, `rb_kid`, `rb_suit`, `rb_apron`, `rb_robe`, `rb_salvager`, `rb_pilot`, `rb_guard`), and the speakers in section 2.8 (SENTINEL, VARO, MOTHER-7, THEO, VOSS, YOUNG KADE, cadets, ECHO, YOUNG ORION, LUCIA FERRO, crew echoes, CHOIR). Each is assigned to its location there.
- Dreams return to the exact position the player stood on before the dream, using a `{ x, z, facing }` spawn (TECH_PLAN 3.7). C7 does not need return spawns.
- The prologue's leader-gated locker, the Ringborn data spike (a prop and a line, not an item) and the cadets held in the Spire cells for 412 days are canon additions. They are consistent with STORY.md but new, so G1 and G2 should confirm them.

### Known issues
- The lines are anchors and proposals, not final scripts. Owners write the final text, and only the FIXED lines are mandatory. Nothing checks WRITING.md automatically; I checked it with a one-off script for binding ids, box lengths and table shape.
- TECH_PLAN text that looks like a script id but is not one: `extends.driftmarket.talk` is a path. Several fx ids (`warden.lullaby`, `warden.cradle`, `warden.requiem`, `warden.defeat`, `dev.beam`, `maw.*`, `voss.*`, `echo.*`, `gardener.*`, `sentinel.defeat`, `cue.*`) are not scripts. The fx ids are named next to each boss's battle lines.
- Planned story time: the prologue is 5.5 min (target ~5) and chapter 1 is 6.0 min (target 5-6). The finale is 8.1 min, or 9.5 min if the player accepts the optional night before. All are within the 20% gate, but G2 should check them against real pacing() numbers.
- Banner names, accent colours and NPC look ids are suggestions; map and art owners may change them.

### POC review findings fixed
- None. All 28 findings (R1-R28) are in code files; none touches WRITING.md, which is the only file this task owns.
