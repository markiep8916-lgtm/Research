# VOIDPATH foundation module notes (from each module author)
Read the actual source too; these notes summarise APIs, deviations from CONTRACTS.md and usage advice.

## engine

Files: src/core/engine.js, src/core/postfx.js, src/tools/preview-engine.js

### Exports
- engine.js: class Engine (contract API plus extras: render(), stop(), dispose(), realTime, realDt, transitionTimeScale, transitioning getter, renderSize getter, pixelRatio, canvas, running, composer, passes {render, bloom, tiltShift, output, grade, overlay}, renderPass, bloomPass, tiltShiftPass, outputPass, gradePass, overlayPass)
- engine.js: QUALITY_PRESETS (low/medium/high: pixelRatioCap, shadows, bloomScale, tiltTaps, shatterMsaa)
- postfx.js: DEFAULT_FX (deep-frozen contract defaults plus grade.enabled)
- postfx.js: cloneFx(src), mergeFx(target, partial)
- postfx.js: class ScaledBloomPass extends UnrealBloomPass (setResScale)
- postfx.js: class TiltShiftPass (setTaps, setParams, pxAt1080 = 7)
- postfx.js: class GradePass (setParams)
- postfx.js: class OverlayPass (flash/fade/iris uniforms, .shatter, .active)
- postfx.js: class ShatterEffect (setup, capture, setProgress, render, release, clearFrozen)
- postfx.js: buildShatterGeometry(aspect, { seed, impact })

### Deviations / additions
- No signature changes. The meaning of `transition()`'s `duration` depends on the type: for 'shatter' it is the time from start to black, and the reveal adds max(0.3, 0.35 * duration); for 'fade' and 'iris' it is the whole transition (half out, half in). The default stays 1.0.
- Extra `transition()` options: `reveal` ('fade' or 'iris', shatter only), `revealDuration`, `center` ({x, y} in CSS px: the iris centre or the shatter impact point), `ringColor` (iris edge glow). `color` is the cover colour for fade/iris and the flash tint for shatter. `onMidpoint` may return a promise; the cover holds until it settles.
- `projectToScreen(vec3, out?)` takes an optional reusable output object so per-frame callers don't allocate.
- Extra FX param `grade.enabled` (default true) switches the grade pass off. `getFx()` returns the live params object, so it must not be mutated (as the contract says).
- Game time vs real time: `time`, `dt` and the onUpdate arguments are game time (clamped to 1/20 s, times `timeScale`, 0 during hit-stop). Hit-stop, shake, flash, grain and transitions run on real time capped at 0.1 s per frame, exposed as `realTime` / `realDt`.

### Integration notes
- Boot: `const engine = new Engine(document.getElementById('view'), { quality })`, then `engine.start()` once. Transitions only advance while the loop runs. Suggested default: 'medium' when util.isTouchDevice(), 'high' otherwise. `setQuality()` applies at runtime: shadow programs rebuild per scene through setView, pixel ratio, bloom resolution, tilt-shift taps and shatter MSAA all update.
- States own their scene and camera. Call `engine.setView(scene, camera)` in enter() and after battle. The engine sets the camera's aspect. Give every scene a `scene.background` colour; otherwise the clear colour is black. The engine never touches fog.
- Bloom works on linear HDR before tone mapping, with threshold 0.78. Only emissive surfaces above about 1.0 linear luminance glow, so use emissiveIntensity around 2-4 for LEDs, visors and screens (2.2-3.5 looked good in the preview). Keep large lit surfaces below the threshold or they will haze. Keep material.toneMapped at its default; OutputPass does the ACES tone mapping and sRGB conversion.
- Camera placement is safe to do every frame: shake is added to `camera.position` along the camera's screen right/up only during `render()` and restored right after, so there is no drift. `projectToScreen()` ignores shake, which keeps DOM damage numbers steady. `visible` is false behind the camera or off-screen.
- Shatter for encounters: `await engine.transition('shatter', { onMidpoint: () => game.change('battle', ...), center: engine.projectToScreen(playerPos) })`. Passing `center` cracks the glass from the player's position. While shattering, onUpdate keeps running but the 3D scene is not rendered, which is cheap. Hide or fade the DOM HUD yourself, because post FX don't touch the DOM. The promise rejects with the error if onMidpoint throws or rejects, but the screen is always revealed first. Use `engine.transitioning` to avoid starting a second battle; extra calls are queued, not dropped.
- Juice for battle-view: `engine.hitStop(90)` freezes game dt while rendering continues; tween with engine.dt or the onUpdate dt to get the freeze for free, or with engine.realDt for UI motion that should keep going. On a Break, combine `engine.flash('#ff4fa3', 0.2, 0.5)` and `engine.shake(0.12, 0.25)`; a stronger shake or flash replaces a weaker one that is still running.
- Tilt-shift is tunable per state with `engine.setFx({ tiltShift: { focusY, band, falloff, maxBlur } })`. The default (maxBlur 1 = 7 px blur sigma at 1080p, band 0.14, falloff 0.30) gives a clear miniature look. For a stronger Octopath feel in the field, try maxBlur 1.2-1.4. Battle may want focusY around 0.45 if combatants sit low on screen. On phone portrait screens a larger vertical field shows more blurred area, so world/battle may want a wider band there.
- Shadows: the scene's key light needs `castShadow = true` and tight `shadow.camera` bounds. With PCFSoftShadowMap, `shadow.radius` does nothing. Shadows are skipped entirely on 'low'.
- If an onUpdate callback throws, the frame still renders and the error is rethrown afterwards, so it shows in #vp-fatal without freezing the screen. `engine.stop()` and `engine.dispose()` exist for teardown.

### Known issues
- Headless SwiftShader runs this preview at about 1-6 fps at 1280x720 (software GL, as expected), so frame rate on real GPUs hasn't been measured here. Per frame: bloom mip chain, 2 full-resolution tilt-shift draws, OutputPass, grade; the overlay pass only runs during a flash or transition.
- A `flash()` started during the frozen part of a shatter isn't shown, because the overlay is busy drawing shards. Resizing during that ~1 s stretches the frozen frame slightly.
- The shatter targets (frozen frame plus a 4x MSAA overlay, about 70 MB at 2560x1440) are allocated when a shatter starts and freed when it ends.
- The preview's `hold()` / `pin()` / `shatterAt()` helpers set `engine._tr.t` directly to pin a transition for screenshots. That is only in the preview, not in the engine API.
- With fixed waits, the eval-then-short-wait screenshot flow is timing-dependent under SwiftShader: the frozen shatter renders fast, so it can finish before the shot. For a reliable mid-shatter shot, set `engine.transitionTimeScale = 0.25` and wait on progress, as in the final run.

## vfx

Files: src/core/spriteActor.js, src/core/particles.js, src/core/vfx.js, src/tools/preview-vfx.js

### Exports
- spriteActor.js: class SpriteActor(sheet, { pxPerUnit=32, tilt=0.32, shadow=true, shadowScale=1, castShadow=true, emissiveIntensity=2.2, lit=true, anchor=[0.5,0], receiveShadow=true (extra), normalScale=1.4 (extra) })
- SpriteActor members: object3d, mesh, play(name,{restart,onEnd}) -> this, setFrame(i) -> this, currentAnim, flipX (get/set), update(dt), flash(color='#ffffff', duration=0.12), setTint(color|null), setOpacity(a), setGlow(color|null, strength=1), hologram (get/set), dispose(); extras: width, height (world units of the frame), top (world y of the art's top in object3d space, for damage numbers/cursors), frame (current frame index), opacity, blob (blob shadow mesh), sheet
- particles.js: class Particles(scene, { max=4000 }) with emit(preset, position, opts), addEmitter(preset, { position, area=[1,1,1], rate=10, color, burst=0 (extra), ...opts }) -> { position, area, rate, active, burst, remove() }, update(dt), dispose(); extras: clear(), count
- particles.js: PRESETS (preset catalogue, layer definitions), PARTICLE_PRESETS (array of preset names)
- vfx.js: makeGlow(color, size=1, intensity=1, { pull=0.5 } (extra)) -> THREE.Sprite
- vfx.js: makeLightShaft({ width=2, height=6, color='#9fd8ff', opacity=0.18, spread=1.45, softness=0.75, dust=1, seed, billboard=true, floorY=0, floorFade=0.9 }) -> THREE.Mesh (mesh.userData.update(dt), mesh.userData.uniforms)
- vfx.js: makeBlobShadow(radius=0.5, opacity=0.45) -> THREE.Mesh
- vfx.js: makeHologramMaterial(texture, color='#6fe9ff', { time, jitter=0.03, opacity=1 } (extra)) -> THREE.ShaderMaterial
- vfx.js: makeFlicker(light, { base, amount=0.5, speed=8, mode='flicker'|'pulse'|'strobe', glow (extra), seed (extra) }) -> { update(dt,t), dispose(), factor, light, base, amount, speed, mode, enabled }
- vfx.js: updateVfx(dt, t)
- vfx.js extras: glowTexture(), NOISE_GLSL, BAYER_GLSL

### Deviations / additions
- None to the binding signatures. Interpretation choices: in Particles.emit opts, `count` is absolute (first layer; other layers of the preset scale with it), while `speed`, `size` and `life` are MULTIPLIERS (default 1), because each preset is several layers with different ranges. `spread` is an absolute spawn radius; `direction` (Vector3 or [x,y,z]) aims directional layers and turns sphere bursts into a cone around it. Positions may be a Vector3 or an [x,y,z] array.
- makeLightShaft pivot is the SOURCE end (window); the beam extends along local -Y. It is not a centred plane.
- makeGlow, makeHologramMaterial and makeFlicker take an extra trailing options object (pull / time, jitter, opacity / glow, seed). Defaults match the contract.

### Integration notes
- Per frame (engine/game loop): call updateVfx(dt, t) once. It drives light shafts, holograms made by makeHologramMaterial, and every makeFlicker. Each SpriteActor needs actor.update(dt) (animation, flash decay, its aura/hologram time). Each Particles instance needs particles.update(dt). update with dt<=0 is a no-op, so engine.hitStop (dt=0) freezes particles and flashes for the impact frame.
- Shadows: sprites cast alpha-tested silhouette shadows and receiveShadow by default. On the shadow-casting key light use shadow.bias ~ -0.0005 and shadow.normalBias ~ 0.02 (tested; no acne on sprites). PCFSoftShadowMap looks good. Sprite planes lean back 0.32 rad, so a light high above casts short shadows; a key light from about 35-50 deg elevation in front-left gives readable silhouettes.
- SpriteActor placement: add actor.object3d to the scene and set its position at the feet (y=0). actor.top = world height of the art's top above the feet (already includes tilt), for damage numbers / target cursors / name tags. actor.width/height = frame size in world units.
- Facing: field side anims face RIGHT, so set flipX=true to face left. Party battle sprites face LEFT and enemies face RIGHT by default. flipX keeps normal maps correct (verified with a red-left/cyan-right rim test) and mirrors the blob shadow offset.
- Battle feel recipes: hit flash actor.flash('#ffffff', 0.12); weakness hit '#ffe066'; Break '#ff4fa3' with 0.2-0.25 s. Boost aura actor.setGlow('#ffb347', boostLevel 1-3; wider and brighter per level). Target highlight setGlow('#7fe3ff', 1). Clear with setGlow(null). KO/defeat fade: tween setOpacity 1->0 (dithered screen door, stays in the opaque pass, its cast shadow thins too, mesh hidden at 0). Hologram AI: actor.hologram = true (unlit cyan, no shadow/blob).
- The aura texture is built lazily (CPU dilate+blur) the first time setGlow is called for a sheet. For the 160x160 sentinel, pre-warm during battle setup with setGlow(c,1); setGlow(null) to avoid a hitch on the first Boost.
- Particles in battle: emit('hit', pos, { direction: [dx,dy,dz] }) aims sparks away from the attacker; emit('break', pos) for the shield shatter; emit('thermal'|'cryo'|'volt'|'photon'|'void', pos) for element hits; emit('heal', feetPos); for Boost either emit('boost', feetPos) on boost-up or addEmitter('boost', { position: feet, area: [0,0,0], rate: 8*level }) and set emitter.active=false / emitter.remove() when it ends. Bursts default to floor bounce at y=0 (opts.floor to change).
- Particles in the field, tested settings: ambient dust addEmitter('dust', { position: centre at y~1.6, area: [W, 3, D], rate: ~0.04 per square unit of floor } (lives 7-12 s, so live count ~ rate*9.5). Sparking broken conduit addEmitter('spark', { position, area: [0.1,0.1,0.1], rate: 1.2, burst: 14 }). Steam vent addEmitter('steam', { position at floor, area: [0.15,0.05,0.15], rate: 9 }). Reactor embers addEmitter('ember', { area: [0.5,0.1,0.5], rate: 9 }). Cryo deck frost addEmitter('frost', { area: [W,1.5,D], rate: 6-10 }). Holo table glitter addEmitter('holo', { area: [0.8,0.8,0.8], rate: 14 }). Smoke rate 4. Pass color to tint (e.g. dust under amber lamps '#ffd9a8').
- Particle rendering: one Particles instance = 2 draw calls (additive + normal pools). It is fog aware: additive fades to black, normal mixes to fog colour. Sizes are world units with correct perspective (expects a PerspectiveCamera) and use the current render-target viewport, so the EffectComposer path is right. Additive presets use HDR colours (>1) so small sparks bloom.
- Light shafts: const s = makeLightShaft({ width: 1.2, height: 6.5 }); s.position.set(windowX, windowTopY, wallZ + 0.1); s.rotation.set(-0.72, 0, 0.42) gives a diagonal beam falling toward the camera; mirror rotation.z for variety. It turns around its own axis to face the camera (billboard: true), fades into world y = floorY over floorFade units (no hard floor-intersection line), ignores fog, depthWrite false. Default opacity 0.18 is tuned to read clearly against dark interiors.
- makeGlow(color, size, intensity): put it at the lamp/LED position; intensity >1 blooms. It is pulled toward the camera by pull*size (default 0.5) so wall lamps are not sliced in half by the wall. makeFlicker(light, { mode, amount, speed, glow }) also dims that glow sprite. Call flicker.dispose() when tearing down a scene (flickers live in a module registry). Shader time uniforms unregister automatically on material.dispose().
- makeHologramMaterial(texture) honours texture.offset/repeat (matrix refreshed before each draw), so the world can animate the holo_table by changing offset. It is additive and unlit; put it on any plane.
- makeBlobShadow(radius, opacity) lies flat at y=0.012 in its parent's space, renderOrder -1, polygon offset. Use it for props and NPCs that are not SpriteActors (SpriteActors add their own).
- Textures are cached per sheet object (WeakMap), so art builders must return the same cached sheet object for the same sprite (as the contract says) to share GPU uploads. Per actor: 1 draw (+1 for the aura when visible, +1 blob, + shadow pass). All actors share one shader program.

### Known issues
- Headless SwiftShader runs the full preview (5 point lights, PCF soft shadows, bloom, ~250 particles) at ~1.5 fps; real-GPU performance was not measurable here. The preview exposes __PREVIEW.advance(sec) / burstAll() / setView(name) so screenshots are deterministic despite this.
- Light shafts fade by world height (floorY), not scene depth: a shaft that crosses a wall or prop can still show a hard edge at the intersection. Keep shafts in open air from window to floor.
- Glow sprites are pulled toward the camera by half their size, so a sprite standing within that distance in front of a lamp gets the glow drawn over it (reads like bloom).
- Normal-blended particles (steam, smoke, the dark cores of thermal/void) are not depth-sorted; fine for soft puffs.
- At devicePixelRatio 1 the dithered fade shows a fine checker pattern (intended, pixel-art style); at 50% it looks darker than its neighbours mainly because the half-covered sprite produces less bloom haze (verified: lit pixel colours are unchanged, not self-shadowing).
- Rim-light strength depends on the art agents' normal maps (painter.makeNormalMap defaults); SpriteActor applies normalScale 1.4 by default (option) to make coloured rims read more clearly.

## artParty

Files: src/art/characters.js, src/tools/preview-characters.js

### Exports
- PARTY_IDS = ['kade','nyx','orion','sera']
- buildFieldSprite(id) -> sheet { canvas, normal, emissive, frameW: 32, frameH: 48, cols: 10, rows: 2, count: 20, anims: { idle_down, walk_down, idle_up, walk_up, idle_side, walk_side }, pxPerUnit: 32, facing: 'down' }
- buildBattleSprite(id) -> sheet { 64x64 frames, cols: 8, count 20 (kade/orion/sera) or 23 (nyx), anims: { idle, ready, attack, shoot, cast, item, hurt, defend, ko, victory }, pxPerUnit: 32, facing: 'left' }
- buildPortrait(id) -> cached 40x40 HTMLCanvasElement (party ids; extra: 'bolt' | 'holo' for NPC dialog portraits)
- buildNpcSprite(kind) -> sheet with the field layout/anims ('bolt' | 'holo'), facing 'down'
- portraitURL(id, scale = 2) -> cached PNG data URL of the portrait upscaled nearest-neighbour (extra export)

### Deviations / additions
- Field idle anims (idle_down/up/side) are 32-entry frame sequences at fps 8 rather than 2 entries at fps 2: two breathing frames held 4 ticks each (same 2 fps rhythm) plus a 1-tick blink frame every 4 s (idle_up has no blink). Frame indices repeat; SpriteActor must honour the frames array and fps as given.
- Battle 'shoot' is a real 3-frame shot only for NYX; for kade/orion/sera it aliases the first 3 attack frames (contract says 'nyx at least').
- Extension (not a change): buildPortrait also accepts 'bolt' and 'holo'; extra export portraitURL(id, scale).

### Integration notes
- Field sheets: 10x2 grid of 32x48 frames (320x96). Frame indices: idle_down 0,1 (+2 blink), walk_down 3-6, idle_up 7,8, walk_up 9-12, idle_side 13,14 (+15 blink), walk_side 16-19. Walk anims are 4 frames at 8 fps, loop. Side = facing RIGHT; set flipX for left. Soles sit on row 46 with the outline on row 47 (bottom row of each frame), so the mesh pivot at the frame's bottom centre puts the feet on the floor.
- Sheet frames are packed edge to edge and the feet/outline touch each frame's bottom row (as the contract requires). SpriteActor should inset frame UVs by half a texel (or otherwise sample exact frame rects) to avoid a 1px bleed from the neighbouring frame. Top/left/right borders are verified clear in every field, battle and NPC frame.
- Character heights in the field: KADE/NYX ~45 px (spiky/ponytail tops), ORION ~43 px, SERA ~41 px plus her halo. ORION's orb drone and SERA's halo are part of the sprite (and emissive).
- Battle sheets: 8 columns of 64x64. Anim fps/loop: idle 5 fps loop (4f), ready 4 fps loop (2f), attack 10 fps once (4f: anticipation, strike, follow-through, recover), shoot 10 fps once (3f), cast 7 fps once (3f, glow grows at the casting hand), item 5 fps once (2f, raised green vial), hurt 1f, defend 1f loop, ko 1f, victory 3 fps loop (2f). Non-looping 1-frame anims (hurt/ko) will fire onEnd immediately.
- Battle placement: characters face LEFT; the stance is centred about 3 px right of the frame centre (front foot x~27, back foot x~43.5, soles on row 62). Attack/strike frames move the body only ~3-5 px left inside the frame, so battle-view should add its own dash/step tween toward the target and play fx 'slash'/'thrust'/'punch'/'muzzle' on top. KO lies across the frame (x~9..60) with the head to the right and weapons on the floor.
- Suggested skill-anim mapping for battle-view: slash/thrust/punch -> 'attack'; shot -> 'shoot' (NYX's frame 1 has the muzzle-flash glow at the barrel tip, about 20 px left of her near hand at shoulder height); cast/heal/buff -> 'cast'; item -> 'item'. Cast glow colours: KADE volt yellow, NYX cryo blue, ORION violet, SERA cyan heal (her lance tip glows photon gold).
- Emissive maps contain only glow materials: KADE visor + volt lance tip; NYX eye-lens + muzzle flash; ORION robe circuits, gauntlet core, orb eye; SERA halo + photon lance tip; cast glows; BOLT eye, thruster flame, antenna LED; HOLO eyes, chest core, circlet. emissiveIntensity around 1.5-2.2 looked right in the preview with bloom off; with bloom on, start lower.
- Normal maps use makeNormalMap(sheet, { frameW, frameH, bevel: 2, strength: 2.0, lumaRelief: 0.4 }). In the preview, amber/cyan point lights produce readable rim light on MeshStandardMaterial with these maps; a low ambient plus a weak frontal fill keeps sprite colours readable.
- HOLO (HALCYON) is drawn in a single cyan ramp; render it unlit with the hologram material (SpriteActor lit:false + hologram:true, or makeHologramMaterial). Its gown hem has transparent scanline rows near the floor (alphaTest friendly). BOLT hovers: its lowest pixels are the thruster flame (rows ~40-45); use a slightly smaller blob shadow (~0.8).
- All builders are cached and return the same object on repeat calls; treat sheets and their anims as read-only (clone anims before mutating). buildPortrait returns a shared cached canvas: do not draw on it; use portraitURL(id, scale) for <img>/CSS/dialog portraits (the UI dialog accepts canvas or data URL), with image-rendering: pixelated when scaled.
- Generation cost: all sheets (4 field + 4 battle + 6 portraits + 2 NPC) take ~340-600 ms in headless Chromium, dominated by the shared makeNormalMap. Build party field sprites + NPCs at boot or on the title screen, and battle sheets at boot or just before the first battle (cached thereafter). No per-frame work happens in this module.
- Preview: dist/tools/preview-characters.html shows a lit three.js strip, animated field rows with portraits, animated battle rows, a static every-pose battle line-up, portraits (party + NPC), NPCs, then every frame plus normal and emissive maps. URL params: ?show=three,field,battle,lineup,portraits,npc,sheets,bframes &char=<id> &scale=N &t=<seconds to freeze time> &bscale=N &frames=0,7 &pscale=N. window.__PREVIEW = { ready, buildMs, times, api } where api is the characters module, for scripted checks.

### Known issues
- Battle faces share one 3/4 template with only blink/hurt expressions (no mouth animation); portraits also share one face template, so faces are less individual than hair and outfits.
- The KO pose rotates the head template 90 degrees, so baked light on the face pixels comes from a different side than on the body (barely noticeable at 1x).
- Field hair style is mixed: KADE and ORION use capsule locks in all three views (matching battle and portraits), while NYX and SERA field heads are hand-shaded templates. They look consistent at game scale but not identical in style.
- The front-view walk cycle is subtle (2px foot lift plus arm swing) by design at 32x48. Side-view walks read more strongly.
- HALCYON (holo) is a relatively simple figure; its face and hair separate only by value within the cyan ramp, which relies on the engine's hologram shader for extra readability.
- NYX remains the darkest character by design (slate coat); she relies on scene rim lights more than the others.

## artEnemies

Files: src/art/enemies.js, src/art/icons.js, src/tools/preview-enemies.js

### Exports
- art/enemies.js: ENEMY_KINDS = ['drone','crawler','turret','sentinel']
- art/enemies.js: buildEnemySprite(kind) -> sprite sheet object (cached): { canvas, normal, emissive, frameW, frameH, cols, rows, count, anims, pxPerUnit: 32, facing: 'right', points }
- art/enemies.js: buildEnemyIcon(kind) -> cached 24x24 HTMLCanvasElement (turn-order portrait)
- art/enemies.js: prebuildEnemySprites(kinds = ENEMY_KINDS) -> Promise (extra: warms the cache one kind per task)
- art/icons.js: ICON_NAMES (all 28 contract names)
- art/icons.js: iconCanvas(name, scale = 1) -> cached HTMLCanvasElement (16*scale square)
- art/icons.js: iconURL(name, scale = 2) -> cached data: URL
- art/icons.js: iconColor(name) -> glow colour hex to accent an icon (extra)

### Deviations / additions

### Integration notes
- Sheets are 4 columns, row-major. Each sheet has 10 frames (11 for the boss). Animation lists are ready for SpriteActor.play(): idle loops, attack plays once, hurt is a single frame played once (fps 6, so onEnd fires after about 0.17 s), break loops (4-5 fps).
- Animation frame lists. Drone: idle [0-3] @6, attack [4,5,6] @8, hurt [7], break [8,9]. Crawler: idle @6, attack @8. Turret: idle @5 (scanning), attack @9. Sentinel: idle [0-3] @5, attack [4,5,5,6,6,7] @8 (the charge and fire frames are held, about 0.75 s total, with the shot on the 4th-5th tick), hurt [8], break [9,10] @4.
- The battle view should play 'break' while an enemy is broken, then go back to 'idle' on the recover event. After 'hurt' (onEnd) and 'attack' (onEnd), go back to 'idle'. For a longer hit reaction, play 'hurt' and keep it on screen with setFrame.
- All enemies face RIGHT, toward the party. Do not flip them. Place them on the left of the battle stage.
- World sizes at 32 px per unit: drone 1.5 x 1.5, crawler 2.5 x 1.75, turret 1.75 x 2, sentinel 5 x 5. The drone already floats inside its frame (thrusters fill the bottom 8-10 px), so keep its pivot on the floor with the normal blob shadow. The sentinel is 2.5x a party member's height, so give it extra stage depth or a camera pull-back.
- sheet.points gives useful spots in frame pixels (origin at the top-left, idle pose): center, muzzle, top, and for the boss also core. With the default anchor [0.5, 0], the local position is x = (px - frameW/2)/32 and y = (frameH - py)/32. Use muzzle for shot muzzle flashes and projectile origins, center for hit sparks, top for damage numbers, and core for boss-break effects.
- Glow maps are tuned for SpriteActor's default emissiveIntensity of 2.2. Large glowing areas (boss blade, core, coils, shards) are pre-dimmed to about 55-70% so they stay coloured under bloom. Small lights (LEDs, lenses, spots) are at full strength. Baked muzzle flashes and sparks are deliberately modest and kept inside the frame, so battle VFX should layer fx 'muzzle', 'impact' or 'ring' and the 'spark' particles at points.muzzle or points.center.
- Build cost and caching: buildEnemySprite is synchronous and cached. Measured in headless Chromium: drone 50 ms, crawler 60 ms, turret 35 ms, sentinel about 200 ms (about half of that is the shared makeNormalMap). Call prebuildEnemySprites() once at boot or on the title screen so encounters and the boss never stall during the shatter transition.
- buildEnemyIcon and iconCanvas return SHARED cached canvases. Use them as drawImage or texture sources only. Never append one to the DOM in two places; for DOM <img> or CSS backgrounds use iconURL(name, scale) at integer scales with image-rendering: pixelated. Unknown icon names fall back to the 'unknown' icon. buildEnemySprite and buildEnemyIcon throw on an unknown enemy kind.
- The 'shield' and 'shield_broken' icons are hexagons whose centre is plain dark: at 1x the dark area is roughly columns 4-11 and rows 4-11, and it scales with the icon. Overlay the shield count there in --vp-font-pixel, centred on the icon. 'bp', 'bp_empty' and 'bp_boost' are meant to sit in a row as the BP pips. 'cursor' points right.
- Damage-type icons use DAMAGE_COLORS hues, so iconColor(name) returns the matching accent for borders and labels: weakness slots, element text, hit numbers.
- Lighting advice for the stage: the crawler is purple-black by design, so give enemies some key or fill light (for example a cool hemisphere light plus a coloured point light near the enemy line). In a pitch-black scene only its teal spots read. The normal maps rim-light nicely from point lights placed to the side or front of the sprites.

### Known issues
- The crawler's 24x24 turn-order portrait shows the whole scorpion silhouette at small scale. It reads at 2x (48 px) but is the least readable of the four at 1x.
- The crawler body is very dark under weak scene light (only the spots and highlights show). That suits the purple-black brief but depends on the battle stage's lighting.
- The baked boss muzzle flash is kept small so it stays inside the 160 px frame; the big plasma shot should come from battle VFX at points.muzzle.
- The largest single build cost is the shared makeNormalMap on the boss sheet (about 90-160 ms). Use prebuildEnemySprites() to keep it off the encounter transition.

## artEnv

Files: src/art/tiles.js, src/art/fx.js, src/tools/preview-tiles.js

### Exports
- tiles.js: buildTexture(name) -> { map, normal, emissive|null, w, h, frames }  (canvases, cached)
- tiles.js: textureSet(name, { repeat = null } = {}) -> { map, normalMap, emissiveMap|null, frames, fps }  (fresh THREE textures; GPU upload shared per canvas)
- tiles.js: TEXTURE_NAMES (38 = all 37 contract names + 'door_locked')
- tiles.js (extra): setTextureFrame(set, frame)  - shows frame `frame` (wraps) of an animated set by moving its UV offset; no allocations
- tiles.js (extra): makeMaterial(name, { repeat, emissiveIntensity = 1.8, roughness = 0.72, metalness = 0.18, alphaTest, transparent = false, side }) -> MeshStandardMaterial (emissive colour white, set stored on material.userData.set)
- tiles.js (extra): heightToNormal(heightFloat32, w, h, { strength, wrapX, wrapY, alphaOf }) -> Painter
- tiles.js (extra): textureFps(name) -> suggested fps (0 for static); textureHasAlpha(name) -> bool
- fx.js: fxSheet(name) -> { canvas, normal (flat), emissive (= canvas), frameW, frameH, cols, rows: 1, count, anims: { play: { frames, fps, loop: false } }, pxPerUnit: 32, facing: 'right', blending: 'additive' }  (cached)
- fx.js: softGlowCanvas(size = 64, color = '#ffffff') -> canvas (smooth radial gradient, cached by size+color)
- fx.js (extra): FX_NAMES (the 17 contract effect names)

### Deviations / additions
- buildTexture(): the contract does not say whether w/h are the whole canvas or one frame. I made w/h the size of ONE frame in texture pixels (so w/32 gives world units); canvases of animated textures are w*frames wide.
- For animated textures (wall_panel_screen, console_front, reactor_core, holo_table), textureSet() sets texture.repeat.x = 1/frames, so repeat[0] is ignored (tiling horizontally would show neighbouring frames). repeat[1] (vertical tiling) works, so reactor_core still tiles up a column.
- space_backdrop and stars_layer use a small 4x4 flat normal canvas instead of a full-size one, and their map canvas doubles as the emissive canvas.
- Extra texture 'door_locked' (same as door, red status strip and red lock LEDs) is included in TEXTURE_NAMES for the locked bridge door.

### Integration notes
- Scale: 32 texture px = 1 world unit everywhere. Floors and wall_cap: 1x1. Walls, door, window: 1x3 (window_frame is 2x3). door_frame: 0.25x3. wall_low: 1x0.75. locker and cryo_pod: 1x2. console_front/top, crates, bench, pipe: 1x1. reactor_core and holo_table: 2x2. Signs: 2x0.5. ceiling_lamp and alarm_light: 0.5x0.5. Decals: 1x1.
- Easiest path: makeMaterial(name, { repeat: [w, h] }) on a plane. It sets emissive to white so the emissive map shows, sets alphaTest for alpha textures, and keeps the texture set on material.userData.set. Emissive intensity around 1.5-2.5 suits the engine's bloom threshold of 0.78.
- Animated textures: each frame call setTextureFrame(set, engine.time * set.fps). Suggested fps: wall_panel_screen 4, console_front 3, reactor_core 10, holo_table 5. Materials can share one set if they should animate in sync.
- Floors: each tile has its seam on its top row and left column, so a single plane with repeat [cols, rows] gives a clean plate grid. Separate 1x1 planes work too. Mix floor_plate with floor_plate_worn (and grate/hazard) so tiles don't look identical.
- Orientation: on a floor plane rotated -PI/2 about X, texture top = north (-Z). floor_hazard's yellow-black band runs along its NORTH edge; rotate the tile for other edges. decal_arrow points north. floor_grate's glow is emissive, good for Engineering.
- Walls share one vertical layout so plain walls, vent, screen and pipe walls, door and window line up in one run: top trim rows 0-7, upper panel 8-52, handrail 53-57, ribbed lower panel 58-81, kickplate 82-95. Put door_frame trims (8 px) slightly in front of the wall (about +0.02 z) at the door's left and right edges; they carry amber guide lamps (emissive) and hazard stripes at the base.
- Alpha textures (check with textureHasAlpha): window_frame, ceiling_lamp, alarm_light, bench, the four decals, stars_layer. window_frame's glass is fully transparent apart from faint glare streaks (alpha 0.1-0.23). The glare shows only with transparent: true (alphaTest about 0.02); the default alphaTest of 0.5 cuts it. Decals: transparent, depthWrite false, polygonOffset (factor about -2), y of about 0.004.
- space_backdrop: put it on an unlit MeshBasicMaterial({ map, fog: false }) plane behind the windows, sized for about 1-1.5 screen px per texel. In the preview that is a 17x8.5-unit plane 4 units behind the window wall. Add an occluding hull (scene-background coloured planes with the window apertures cut out) so it never shows over or around the walls. Planet centre is at texel (690,262) with radius 132 and rings out to about 2.3 radii; the moon is at (196,132). At this scale each window shows a slice of the planet, which is dramatic; the bridge's big window can show more. stars_layer: additive, transparent, depthWrite false, repeat it, and scroll texture.offset slowly for parallax.
- Prewarm: buildTexture('space_backdrop') is the only expensive build (about 0.3-0.45 s once, then cached). Call it during the title screen or boot. Every other texture is 0-28 ms; all 17 effect sheets together are about 0.2-0.3 s.
- GPU memory: textureSet() / makeMaterial() share one GPU upload per canvas through a shared THREE.Source, so calling them per tile or per mesh is cheap. Each call still returns its own texture objects with independent repeat and offset.
- Props: cryo_pod and console_front are opaque front faces for a box (+Z face). console_top goes on the box top. crate_side/crate_top go on a 1-unit box (the side has a green lock LED). The locker is opaque. bench is a front-view sprite (alpha). reactor_core wraps around a cylinder (one frame per circumference; textureSet('reactor_core', { repeat: [1, h] }) tiles it vertically); it is fully emissive, so it can also use MeshBasicMaterial. holo_table is the top face of a 2x2 table. Pair ceiling_lamp and alarm_light with a point light plus vfx.makeGlow; the alarm's emissive dome suits a pulsing or rotating red light.
- FX sheets: frames are in one row, anims.play has loop false and a suggested fps, and facing is 'right' (thrust, muzzle and tracer point +X; flip for leftward attacks). Alpha follows brightness, so the sheets work with additive blending (recommended: MeshBasicMaterial or SpriteActor lit:false, depthWrite false) and also with normal alpha. 'shards' (4 variants) and 'tracer' are one-frame sheets: pick a random shards frame per particle with setFrame(i). Frame sizes: slash, ring, thermal, cryo, volt, photon, void, heal 64x64; thrust 64x32; impact and punch 48x48; buff and debuff 48x48; muzzle and glint 32x32; shards 24x24; tracer 64x8. Ground-based effects sit low in the frame: thermal's base is at y about 57, photon's ground flare at y about 54, the heal ring at y about 56, so anchor them near the bottom (about [0.5, 0.1]). cryo is centred at (32,35), void at (32,32).
- Emissive maps contain only the glowing pixels: screens, LEDs, the grate under-glow, signage, lamp lenses, reactor energy, the holo map, the pod window, and the door, frame and sill lamps. Walls, floors and crates otherwise rely on the scene lights; mid-tone steel albedo (about steel[3]-[4]) was chosen so amber and cyan point lights read clearly.

### Known issues
- space_backdrop takes about 0.44 s to build in headless Chromium (one time, cached). Probably less on real hardware, but it should be built during a loading moment.
- Each floor texture repeats exactly per tile (e.g. the cryo floor's frost specks, the worn plate's stain). Mixing variants per tile hides this; there is only one variant each for bridge, cryo and grate floors.
- Textures are nearest-filtered with no mipmaps (foundation toTexture). Floors far from the camera, and space_backdrop if shown at less than 1 screen px per texel, can shimmer in motion; keep the backdrop at roughly 1-1.5 screen px per texel.
- The preview diorama's lighting and bloom are only approximations of the engine pipeline (no tilt-shift or grade). Measured fps in SwiftShader is about 2 because of software rendering plus a shadow-casting point light and bloom; it says nothing about GPU performance.
- Without transparent blending, window_frame's faint glass glare streaks disappear under alphaTest; that is cosmetic only.

## audio

Files: src/core/audio.js, src/tools/preview-audio.js

### Exports
- audio (singleton): init(), sfx(name, { volume, pitch, pan }), music(track | null), setMuted(bool), toggleMute() -> bool, muted (getter), setVolume({ master, music, sfx }), volume (getter), track (getter), context (getter), ready (getter), position() -> { track, part, bar, time } | null
- SFX_NAMES: string[] (39 contract names)
- TRACKS: track data object; TRACK_NAMES: ['title','explore','battle','boss','victory']
- createRig(ctx, destination?, { volume, muted }) -> rig (the full audio graph on any BaseAudioContext)
- playSfx(rig, name, opts, when) -> bool
- startTrack(rig, name, when, { fade, part }) -> runtime; pumpTrack(runtime, until, now?); stopTrack(runtime, when, fade)
- compileTrack(name) -> { parts, intro, loop, introSeconds, loopSeconds, loopBars }
- renderOffline('sfx' | 'music', name, { seconds, sampleRate, part, opts }) -> Promise<AudioBuffer>
- noteMidi(name) -> midi number; mtof(midi) -> Hz

### Deviations / additions
- None in the API surface. Semantics chosen where the contract is open: opts.pitch is a frequency multiplier (1 = normal) for every sfx, except that for 'boost' an integer pitch 1..3 means the boost level (each level climbs a major third); a non-integer pitch on 'boost' is still treated as a multiplier. opts.level is also accepted for 'boost'.
- setVolume values (0-1) are mapped to gain with a squared curve so the low end of a slider stays usable. Defaults are master 1, music 0.8, sfx 0.9.
- Muting suspends the AudioContext after a 0.16 s fade (saves CPU and battery on phones); unmuting resumes it. Music position is preserved.

### Integration notes
- Import: import { audio } from './core/audio.js'. Pass it as ctx.audio. Calling any method before init() is safe: sfx is ignored and music(track) is remembered and starts when init() runs.
- Call audio.init() synchronously inside a real DOM gesture handler (keydown / pointerdown / touchend) at least once, ideally with a window-level once-listener in main.js. iOS Safari only unlocks audio inside the event handler; if input.onAny fires from the rAF update instead, also add the direct listener. init() is idempotent and also re-resumes an interrupted (iOS) context, so calling it on every gesture is fine. Recommended boot: audio.music('title') at startup; title music then starts on the first key or tap.
- Encounter transition: audio.sfx('encounter') when the shatter starts (rising whoosh; its stab, sub boom and crash land at about 0.56 s). Call audio.music('battle') or audio.music('boss') in engine.transition's onMidpoint, not at the same time as the sting: both battle tracks open with a 2-bar intro (stab + tom build) that would otherwise collide with the sting's stab.
- Battle event -> sfx mapping: action.anim 'slash'|'thrust'|'shot'|'punch'|'cast'|'heal'|'buff' -> audio.sfx(anim) when the attack animation starts; enemy anims 'enemyShot'|'enemyMelee'|'enemyBeam' -> same name; 'enemyCharge' -> 'charge'; 'enemySpit' -> 'enemyShot'. Each 'hit' -> 'impact' (or 'crit' instead when crit), plus 'weak' at the same moment when hit.weak. 'shield' event (shield decremented) -> 'shieldCrack'. 'break' -> 'break' (pair with engine.hitStop + flash). 'recover' -> 'recover'. 'heal' -> 'heal'. 'status' -> 'buff' (stage > 0) or 'debuff'. 'ko' -> 'ko'. 'defend' -> 'defend'. 'telegraph' -> 'charge'. 'flee' success -> 'flee', failure -> 'error'. 'levelUp' -> 'levelup'. 'revive' -> 'heal'.
- Boost UI: raising boost -> audio.sfx('boost', { pitch: newLevel }) with an integer 1-3 (pitch climbs per level); lowering -> audio.sfx('boostDown'). The battle 'boost' event can reuse sfx('boost', { pitch: level }).
- Victory / defeat: on battle victory call audio.music('victory') for the results screen (it opens with a 6.2 s brass fanfare, then settles into a soft loop); do NOT also fire sfx('victory') at the same moment. sfx('victory') is a short standalone 1.2 s sting (e.g. for the 'complete' screen if music is stopped). On defeat: audio.music(null) then audio.sfx('gameover') (a 4 s falling A-minor phrase). Back in the field: audio.music('explore'); explore restarts from bar 1 (it does not resume its old position).
- Field / UI: 'step' on every footstep (very soft metal step with built-in random variation; pass { volume: 0.5-0.8 } when walking, 1 when running); 'door' when a door opens (0.5 s pneumatic hiss with clunks); 'pickup' on item obtained; 'talk' when an NPC dialog opens; 'text' per typewriter character, throttled to roughly every 2nd character or 35 ms; 'save' at the Med-Station; 'menuOpen' / 'menuClose'; 'cursor' on every menu move; 'confirm'; 'cancel'; 'error' for invalid choices.
- Spatial feel: pass { pan } in -1..1 (e.g. from projectToScreen x) for hits and enemy attacks; enemies are on the left in battle, so a negative pan suits enemy-side sounds.
- Settings / mute: the 'mute' input action -> audio.toggleMute(); show audio.muted in the UI. Menu sliders -> audio.setVolume({ music, sfx }) (0-1) and read audio.volume to initialise them. Both persist in localStorage key 'voidpath.audio' (wrapped in try/catch). Tab hide/show is handled internally (context suspended while hidden).
- Debug: audio.position() returns { track, part, bar, time } and audio.track returns the requested track; useful for window.__VP debug hooks and headless tests. With play.mjs, eval steps must be single expressions (use commas, not semicolons).
- Levels: sfx are calibrated so stacked hits (impact + weak + shieldCrack + break) stay under the limiter; music RMS sits about 15 dB below the big hits. Nothing in the game should need per-call volume above 1.
- Preview: node build.mjs --dev --only preview-audio then node tools/play.mjs dist/tools/preview-audio.html --full-page --timeout 240000 --steps-json '[{"waitFor":"window.__PREVIEW && window.__PREVIEW.ready","timeout":200000},{"shot":"bench"}]'. Rendering everything offline takes about 25 s headless. The page exposes window.__audio for live probing.

### Known issues
- I cannot hear: musical quality (melodies, voicings, mix) is verified only through measured levels, spectrograms and piano-roll scores of the compiled note data. A human listen is recommended; tweak the TRACKS data (mix / voices / patterns) or per-sfx gain values to taste.
- Chrome's DynamicsCompressorNode over-attenuates for about its first 0.5 s after the context is created, so the very first sound right after audio.init() may be slightly quieter. The offline bench works around this with a trimmed warm-up; live play is unaffected afterwards.
- Music scheduling uses a main-thread setInterval with 120 ms lookahead: a main-thread stall longer than that (e.g. building the battle diorama synchronously) drops a few music steps; the beat grid is kept (no burst of late notes). Building heavy scenes before calling music() avoids a hiccup.
- During a crossfade the shared delay re-syncs to the new track's tempo, so the outgoing track's echoes shift slightly over the 0.8 s fade (minor).
- On iOS Safari older than 14.1 (no StereoPannerNode) panning falls back to centre.

## ui

Files: src/core/input.js, src/ui/ui.js, src/ui/dialog.js, src/ui/hud.js, src/ui/menu.js, src/ui/title.js, src/ui/screens.js, src/ui/theme.js, src/tools/preview-ui.js

### Exports
- core/input.js: class Input({ touchLayer, target = window }) with the contract methods update(), down(), pressed(), repeat(), released(), axis(), consume(), setContext(), lastDevice, onAny()
- core/input.js Input extras: context (current input context), consumeAll(), showTouch(true | false | null for automatic), get touchVisible, setMutedIndicator(bool), dispose()
- core/input.js: const ACTIONS (the 11 action names), const KEYMAP (KeyboardEvent.code -> action)
- ui/ui.js: class UI({ root, input, audio, state, engine, onUseItem, items, partyDefs, autoMenu = true, handleMute = true }) with the contract members dialog, hud, menu, title, screens, update(dt), isBlocking()
- ui/ui.js UI extras: setPortraitProvider(fn), setIconProvider(fn), portraitURL(id), iconURL(name), iconEl(name, size, cls), portraitEl(id, { size, accent, name, ko, src }), itemInfo(id), getSetting(id), setSetting(id, value), settings, sfx(name, opts), areaName, menuEnabled, autoMenu, handleMute
- ui/dialog.js: class Dialog with show(lines, { onClose, speaker, portrait }) -> Promise, choice(prompt, options, { speaker, portrait, cancelIndex, initial }) -> Promise<number>, get isOpen, clear()
- ui/hud.js: class Hud with showArea(name, subtitle), setPrompt(text | null, iconName), toast(text, { icon, duration }) -> element, setDanger(0..1), setVisible(bool), update()
- ui/menu.js: class Menu with open(tab?: 'party' | 'items' | 'settings' | 'controls' or an index), close(), toggle(), isOpen
- ui/title.js: class Title with show({ onStart }), hide(), isOpen
- ui/screens.js: class Screens with gameOver({ onRetry, onTitle }), complete({ stats, onContinue, onTitle }), fadeBlack(on, ms = 500) -> Promise, close(), isOpen
- ui/theme.js: installBaseCSS, glyph(action, device), controlsTable(device), CONTROL_ROWS, fallbackIconURL(name), toURL(src), isURL, formatTime(sec), fmtNum, bindPointer, parseEmphasis, richText, FALLBACK_ITEMS, MEMBER_ACCENT, TYPE_LABEL

### Deviations / additions
- None breaking: every contract signature is implemented as written. The items below are additions.
- UI constructor takes extra options: onUseItem(itemId, memberId) -> { ok, message } (wire it to state.js useItemOutOfBattle), items (ITEMS), partyDefs (PARTY_DEFS), autoMenu, handleMute.
- ui.isBlocking() is also true while the title overlay is open. ui.screens.fadeBlack() on its own does not block.
- dialog.show(): a plain string inside an array continues the previous speaker and portrait; use { speaker: null } for narration, which renders in italics. *text* renders as amber emphasis, in toasts too. portrait may be a canvas, a data URL, or an id string resolved through the portrait provider. Party speakers get their portrait automatically from their name.
- screens.gameOver() and screens.complete() also accept onTitle. Without it, 'Return to title' calls location.reload(). fadeBlack(on, ms) returns a Promise.
- Requested fix outside my ownership: build.mjs should replace the bundle marker with a function replacer (see known_issues). It is not a contract change, but it currently breaks some minified builds.

### Integration notes
- Wiring in main.js: input = new Input({ touchLayer: document.getElementById('touch-layer') }); ui = new UI({ root: document.getElementById('ui-root'), input, audio, state: gameState, engine, onUseItem: useItemOutOfBattle, items: ITEMS, partyDefs: PARTY_DEFS }); ui.setPortraitProvider(buildPortrait); ui.setIconProvider((n) => iconURL(n, 2)); input.onAny(() => audio.init()). Frame order: input.update(); ui.update(dt); game.current.update(dt, t).
- onAny listeners run synchronously inside keydown and pointerdown handlers, so audio.init() counts as a user gesture on iOS. Pointer presses arrive as the action 'pointer'.
- Pause menu: the UI opens it by itself when 'menu' is pressed in the 'explore' context with nothing blocking, and consumes that press. ExploreState must not open or toggle the menu itself. Set ui.menuEnabled = false during cutscenes, or pass autoMenu: false to take control.
- Mute: the UI handles 'mute' (M key or the touch sound button) globally. It toggles audio, shows a toast, updates the touch icon and saves the setting. Do not also handle M anywhere else, or pass handleMute: false.
- Input contexts: ExploreState.enter must call input.setContext('explore') and BattleState.enter must call input.setContext('battle'). While open, dialog / menu / title push 'dialog' / 'menu' / 'title', and screens push 'menu'; each restores the previous context on close. If a state calls setContext while a component is open, the state's value wins.
- No double handling: every component consumes the presses it acts on, and dialog.isOpen stays true through the frame the dialog closes in. ExploreState should still return early from input handling while ui.isBlocking() is true.
- Touch overlay by context: 'explore' shows the stick, A, B, menu and sound buttons (stick fully pushed = run held). 'battle' shows A, B, +, - and sound, with no stick. 'title', 'dialog' and 'menu' show nothing; players tap rows, or tap anywhere to advance dialog. battleUI rows therefore need click handlers on phones. The overlay appears on the first touch (or on coarse-pointer devices) and hides again when a keyboard or gamepad is used.
- input.axis() returns one reused { x, y } object (length <= 1, keyboard diagonals normalised); copy it if you keep it. Gamepad mapping: A confirm, B cancel, X run, Y / Start menu, LB / RB boost, D-pad and left stick move. Stick directions for menus engage at roughly raw 0.65 and release at roughly 0.49 (hysteresis after the deadzone).
- Dialog: calls queue, so await ui.dialog.show([...]) then ui.dialog.choice('...', ['Yes', 'No'], { speaker: 'BOLT', portrait: 'bolt', cancelIndex: 1 }). Call ui.dialog.clear() before a battle transition if a dialog could still be open. The text tick plays audio.sfx('text') every second character; 'cursor', 'confirm' and 'cancel' sfx also play.
- HUD: hud.showArea(name, subtitle) also stores ui.areaName, which the menu header shows. setPrompt(text, iconName) uses names such as 'talk', 'inspect', 'open' and 'save', and hides itself while the UI is blocking. setDanger(0) hides the gauge, so use it in the Cryo Deck and on the Bridge; it is quantised and cheap enough to call every frame. Call hud.setVisible(false) in battle. Toasts sit on their own layer above the pause menu.
- Menu data: reads gameState.party (uses member.accent; KO when alive === false), inventory, credits, and stats.playTime in seconds, so the integrator should accumulate playTime. Item use calls onUseItem(itemId, memberId). The pick-a-member step starts on the most-hurt ally (or a downed ally for Revive Kits) and shows the returned message.
- Settings are saved in localStorage 'voidpath.settings.v1' (sound, music, sfx, quality, textSpeed) and re-applied when the UI is constructed: audio.setVolume / audio.setMuted, and engine.setQuality(saved) if it differs. The menu reads audio.muted and engine.quality live, and reads initial volumes from audio.volume or audio.getVolume() if audio exposes either.
- Title: ui.title.show({ onStart }) hides itself and then calls onStart on New Journey. Its middle is transparent, so render the 3D title scene behind it.
- Screens: they play sfx 'gameover' / 'victory' themselves (music is the game's job) and ignore input for 0.8 s after opening so leftover button mashing does not skip them. Typical game-over flow: await ui.screens.fadeBlack(true); ui.screens.gameOver({ onRetry }); on retry respawn, then fadeBlack(false). Layer order: hud 10, dialog 30, menu 40, toasts 45, title 50, fade 55, screens 60.
- Icons are drawn at 16 / 32 / 64 CSS px for crisp pixels. The icon provider should return the 2x (32 px) data URL. Without a provider, built-in 7x7 pixel glyphs are used; without a portrait provider, an initials badge in the member's accent colour is used.
- Large screens: the UI layers scale with CSS zoom at >= 1560x880 (1.25), >= 1880x1060 (1.5) and >= 2520x1420 (2). Only my .vp-layer elements are zoomed; battleUI is not affected.
- Preview: dist/tools/preview-ui.html#menu-party (also title, title-menu, dialog, dialog-line, hud, menu-items, menu-use, menu-settings, menu-controls, gameover, complete, touch, touch-battle). Add ':fallback' to see the UI without portrait and icon providers. window.__PREVIEW = { ready, show, ui, input, audio, state }.

### Known issues
- Needs the orchestrator: build.mjs corrupts minified bundles at random. It uses template.replace('<!--BUNDLE-->', scriptTag(js)) with a string replacement, so '$&' sequences in minified code (for example `l>$&&...` when esbuild names a variable `$`) get the literal '<!--BUNDLE-->' spliced in. Result: 'SyntaxError: HTML comments are not allowed in modules'. It hit my preview; I rewrote that line, but any module, including the main bundle, can trigger it. Fix (one line each in fullDocument and artifactFragment): .replace('<!--BUNDLE-->', () => scriptTag(js)).
- Headless performance: under SwiftShader GPU rasterization, any large DOM UI (menu, dialog) over a constantly redrawn WebGL canvas gets its tiles rasterized again every frame. I measured the menu at about 2-3 fps in play.mjs. Launching Chromium with --disable-gpu-rasterization gave about 22 fps for the same scene, so tools/play.mjs (not my file) may want that flag. Real GPUs keep the rasterized tiles, so the game itself is unaffected. I still removed large blurs, filters and blend modes so these rasters are cheap on phones too.
- A polled gamepad tap can register one auto-repeat when the frame rate drops below roughly 4 fps, because the release is only seen on the next poll. This was only observed headless.
- The preview's pixel portraits and BOLT bust are crude stand-ins until art/characters is wired in through setPortraitProvider.
- CSS color-mix() is used for accent tints on portraits and cards (Chrome 111+, Safari 16.2+, Firefox 113+). Older browsers lose only those tints.
- Environment change outside the repo: I installed the template fonts (Oxanium, Chakra Petch, Silkscreen) into ~/.local/share/fonts/voidpath. play.mjs blocks Google Fonts, so before this headless screenshots used fallback fonts. Every agent's screenshots now show the real typography.

## battleModel

Files: src/core/state.js, src/battle/data.js, src/battle/model.js, tests/battle.test.mjs, tests/state.test.mjs, tests/simulate.mjs

### Exports
- core/state.js: gameState, resetGame(), healParty(), addItem(id,n=1), removeItem(id,n=1) -> bool, hasItem(id), useItemOutOfBattle(itemId, memberId) -> { ok, message }, saveCheckpoint(pos), loadCheckpoint() -> pos|null
- core/state.js extras: PARTY_ORDER, START_INVENTORY, xpToNext(level) (= 30*level+70), makeMember(def), getMember(id), itemCount(id), gainXp(member, amount) -> [{ level, gains }]
- battle/data.js: DAMAGE_TYPES, PHYSICAL, ELEMENTAL, PARTY_DEFS, SKILLS, ITEMS, ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES
- battle/data.js extra: WEAPON_ANIM { blade:'slash', lance:'thrust', rifle:'shot', gauntlet:'punch' }
- battle/model.js: class BattleModel with constructor({ party, encounterId, rng }), party, enemies, combatants, round, order, nextOrder, current, phase, result, encounter, get(id), begin(), nextTurn(), getMenu(id), maxBoost(id), validTargets(id, kind), act(action), enemyTurn(), isOver(), rewards(), applyRewards()
- battle/model.js extras: BattleModel.forceVictory() -> [ko..., victory]; BattleModel.effectiveStat(id, key) -> stat with buff stages applied
- battle/model.js constants: MAX_BP=5, MAX_BOOST=3, BOOST_POTENCY=[1,1.5,2,2.5], FLEE_CHANCE=0.7, CRIT_CHANCE=0.08, CRIT_MULT=1.5, WEAK_MULT=1.3, BREAK_MULT=2, DEFEND_MULT=0.5, DAMAGE_CAP=9999, BREAK_ROUNDS=2, BOSS_SHIELD_GAIN=2, LOCK_ON_INTERVAL=3, VICTORY_EP_RECOVERY=0.2

### Deviations / additions
- None of the contract APIs changed. Everything below is an addition.
- Event shapes (contract fields first, '+' marks extras): roundStart {round, order, nextOrder} | turnStart {actorId} | bp {actorId, bp, delta} | boost {actorId, level} | action {actorId, kind, name, anim, damageType, targets, hits, +boost, +weapon (attack), +skillId (skill), +itemId (item), +actionId (enemy)} | hit {actorId, targetId, damageType, amount, crit, weak, broken, hpAfter, hitIndex, hitCount} | reveal {targetId, damageType} | shield {targetId, shield, maxShield} | break {targetId} | recover {targetId, shield, +maxShield} | heal {targetId, amount, hpAfter} | ep {targetId, amount, epAfter} | status {targetId, stat, stage, turns} | revive {targetId, hpAfter} | ko {targetId} | defend {actorId} | telegraph {actorId, targetId, text} | message {text} | flee {success} | orderUpdate {order, nextOrder} | victory {} | defeat {} | levelUp {memberId, level, gains, +name}. A test plays 240 random battles and asserts every event has exactly these keys.
- Field meanings: hit.broken = the target was already broken before this hit (x2 applied); the breaking hit itself has broken:false and is followed by shield then break. heal.amount is the nominal heal and may exceed missing HP; use hpAfter for the bar. ep.amount is negative for a skill's EP cost (emitted before the action event). status with stage 0 and turns 0 means the status ended (expiry or a buff and debuff cancelling). status.stat is one of 'atk','def','mag','res','spd','taunt'; taunt always has stage 1. recover.maxShield is the boss's raised shield.
- Action event kinds: party actions use 'attack'|'skill'|'item'; enemy actions use the enemy action's kind: 'attack'|'debuff'|'buff'|'lockOn'. Defend and flee emit only their own 'defend' / 'flee' events, not an 'action' event.
- Combatant extras: party has weapons and skills; all have actionsPerRound; enemies have maxShieldCap, lockOnTarget (party id or null, for drawing a reticle), lockRound, lastLockRound, overcharged.
- Data extras: PARTY_DEFS growth; PartyMember accent; SKILLS scale ('atk'|'mag'), boostMode ('potency'|'hits') and effect; ENEMIES level, plus boss-only actionsPerRound and maxShieldCap; enemy actions gain kind, optional hits and effect, and target 'self'; getMenu skills gain hits and boostMode.
- rewards() also returns epRecovery (0.2 on victory, 0 otherwise). applyRewards() also recharges 20% max EP for surviving members and still returns only levelUp events.
- gameState gains bestiary (enemy kind -> revealed weakness types), so revealed weaknesses stay revealed in later battles, as in Octopath. resetGame() clears it.
- On boss victory the model sets gameState.flags.boss_defeated = true. gameState.stats.battles counts battles won, not fled or lost.
- Contract change I'd like (not my file): package.json "test" should be "node --test" (or "node --test tests/*.test.mjs"). On Node 22, "node --test tests/" tries to load tests/ as a module and fails before running any test.

### Integration notes
- Driving loop: `const m = new BattleModel({ party: gameState.party, encounterId, rng })`; play `m.begin()`; then `while (!m.isOver()) { play(m.nextTurn()); if (m.phase === 'playerInput') play(m.act(await choose())); else play(m.enemyTurn()); }`; on victory play `m.applyRewards()`. Call nextTurn() exactly once after begin() and after each action; it returns [] while the current actor still has to act.
- Event order. begin: roundStart, then a bp event per living member. nextTurn at a new round: roundStart, recover*, bp*, status-expiry*, then turnStart. Basic attack: [boost, bp(-n)], action, then per hit: hit, reveal?, then either shield/break/message? or ko(+bp reset for party); then orderUpdate?; then victory/defeat if the battle ended (always last). Skill: [boost, bp], ep(-cost), action, then hits or heals or status or revive. Item: action, then heal|ep|revive. Enemy: action, hit*, status*, or for Lock-On action then telegraph; then orderUpdate?, defeat?
- Multi-target skills are emitted wave by wave (every target takes hit 0, then hit 1, ...), so group hit events by hitIndex to play each wave together. Single-target multi-hit attacks stop early if the target dies; action.hits is the planned count.
- Invalid player actions (not enough EP, no target, flee in a boss fight, no item left) return [{type:'message', text}] and do NOT use up the turn: phase stays 'playerInput', so show the text and reopen the menu. act() returns [] if actorId isn't the current actor. Single-target targetIds fall back to the first valid target.
- Boost: clamp the UI with maxBoost(id) = min(3, bp). Items, defend and flee ignore boost and spend no BP. Boosted buffs/debuffs/Provoke last longer (+1 turn per level); heals and revives scale by potency. Cross Edge gains a hit per boost level (getMenu skill.boostMode === 'hits').
- Turn bar: order holds the remaining actors this round (order[0] is the current actor during its turn); nextOrder is an exact prediction of next round (the next round's SPD jitter is rolled in advance). The boss appears twice in both arrays. Broken enemies and KO'd members are removed. Redraw on roundStart and orderUpdate.
- Weakness UI: combatant.weaknesses is the hidden answer. Show combatant.revealed plus (weaknesses.length - revealed.length) '?' slots. Use the reveal event to flip a '?' into its icon.
- Boss presentation: telegraph text is e.g. 'SENTINEL locks on to NYX!'. Draw a reticle on m.get('e0').lockOnTarget; it clears when the beam fires (the boss's last action of the following round) or when the boss is broken, which also emits message "SENTINEL's lock-on was disrupted!". Overcharge (an action event plus atk/mag +1 status on e0) happens the first time the boss drops below 50% HP. After each break the boss recovers with +2 max shield (6, 8, 10, 12 cap).
- Damage numbers for sizing popups: ordinary hits are about 50-300, boosted hits on a broken target 600-1400, the boss beam about 550-700, capped at 9999. Turret armor makes some non-weak hits single digits; that is intended.
- Debug hook: implement __VP.debug.winBattle() as play(m.forceVictory()); this works mid-turn. nextTurn() also notices victory or defeat if state was changed from outside.
- State sync: the model writes hp/ep/alive back to the gameState.party member objects at the end of each act()/enemyTurn(). KO'd members stay KO'd (hp 0) after a win, as in Octopath. Field revival is useItemOutOfBattle('revive', id) or healParty(). Only living members get XP, and each gets the full amount (not split).
- Field menu: useItemOutOfBattle returns friendly messages such as 'NYX recovered 200 HP.', "NYX's HP is already full.", 'KADE is down. Use a Revive Kit first.', 'SERA is back up with 215 HP.', "The Bridge Keycard can't be used here." Nothing is consumed when ok is false. PartyMember.xp is progress within the current level and xpNext is the amount for that level; the UI already reads them this way.
- World: ENCOUNTER_TABLES[zone] lists encounter ids to roll uniformly (corridor lists drone_single twice so it comes up more often). Encounter backdrop and music fields: 'corridor'/'engineering'/'bridge' and 'battle'/'boss'. The keycard item id is 'keycard'; give it with addItem('keycard').
- Balance dependency: the boss assumes a rested party. Call healParty() before boss_sentinel (Med-Station at the bridge or HALCYON restoring the squad). At expected levels the boss is about 96% won after a rest and about 43% without one.
- Results screen: rewards() returns { xp, credits, items: [{id, n}], epRecovery } and is stable across repeated calls (drops are rolled once). applyRewards() applies once and returns levelUp events with gains { maxHp, maxEp, atk, def, mag, res, spd }.

### Known issues
- `npm test` fails on Node 22 because of the package.json script (`node --test tests/`); `node --test` works. The fix belongs to whoever owns package.json.
- Boss difficulty depends on rest and level: 83% at starting levels, about 96% after resting at expected campaign levels (+1.4), about 43% with no rest after 8 fights. Without a heal point before the bridge, the climax may be too hard for some players.
- Regular encounters are forgiving: even the random policy wins most of them, just slowly. That is intended for a proof of concept; turret_squad is the only one with real attrition.
- Balance figures come from simulated policies, not human play. The heuristic is reasonable, not optimal: it sometimes Provokes into elemental fire it can't take, and boosts into unbroken foes when BP is near the cap.
