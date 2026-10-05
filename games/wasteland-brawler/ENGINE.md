# RUSTFIST engine guide

A single-file HTML5 Canvas beat 'em up. Source modules in `src/` are concatenated in filename
order by `node build.mjs` into `wasteland-brawler.html` (standalone) and `dist/artifact.html`
(fragment for the Claude Artifact publisher). Everything is plain JavaScript in one global
scope: no imports, no classes are exported, files see each other's top-level names.

## Coordinates and rendering

- Internal resolution `W x H` = 384 x 216, 60 fps fixed step, nearest-neighbour upscale.
- World: `x` along the street (px), `y` = depth = the screen row of the feet (play band
  `stage.yMin..yMax`, typically 124..196), `z` = height above the ground. Screen pos = `(x - camX, y - z)`.
- Draw order is by `y` (`sortY()`).
- Draw with the `Px` helpers only (they snap to whole pixels): `Px.rect(x,y,w,h,c)`,
  `Px.line(x0,y0,x1,y1,thick,c)`, `Px.limb(x0,y0,x1,y1,t0,t1,c)`, `Px.disc(cx,cy,r,c)`,
  `Px.oval(cx,cy,rx,ry,c)`, `Px.poly([x0,y0,...],c)`, `Px.quad(x0,y0,x1,y1,w0,w1,c)`, `Px.dot(x,y,c)`.
  `Px.use(ctx)` selects the target. `shade(hex, k)` darkens (k<0) or lightens (k>0). `rgba(hex,a)`.
- Characters draw into a scratch sprite in LOCAL coordinates (origin = feet, facing right,
  up is negative y). `Enemy.draw` calls `Sprite.begin(...)`, your `drawBody()`, then `Sprite.end(...)`,
  which adds the dark outline, hit flash, tint and mirroring. Never draw characters directly on the screen.
- Text: `drawText(ctx, str, x, y, color, scale, align)` (5x7 pixel font, uppercase).

## Rigs

- Humanoid: `drawHumanoid(pose, style)` with `pose({...})` angles (see `src/45_rig.js`) and stock
  poses in `Poses` (idle, walk, run, hurt, fall, down, getup, jump, crouch, grabbed) and the hero's
  attack poses in `PlayerPoses` (jab, cross, hook, upper, straight, backfist, ram, airkick, burst, swing, bigswing, thrust, gutfold...).
  Style: `{ s (scale), skin, top, sleeve, arm, pants, shin, boots, belt, glove, hipW, shW, limbW,
  head(Hd, angle, s, R), torso(R, s), hand(Hn, ang, s, R), backHand(...), after(R, s) }`.
  `R` is the solved rig: `R.H` hip, `R.S` shoulder, `R.Hd` head centre, `R.fa/ba` front/back arm
  `{E elbow, H hand, b angle}`, `R.fl/bl` legs `{K knee, F foot}`.
  `enemyHumanPose(enemy, attackPose)` picks the right pose for every reaction state; supply
  `attackPose(phase, t, atk)` for attacks (phase = 'start' | 'active' | 'rec').
- Scorpion: `drawScorpion(opts)` (see the header of `src/46_scorpion.js`): scale, colours, legPhase,
  clawOpen, clawRaise, tailCurl, tailThrust, tailDrop, onBack, stingGlow, eggs, noTail.

## Enemies (`src/60_enemy.js`)

Register `ENEMY_TYPES[key] = { ... }` (full field list in the file header). The base class gives you:
approach/circle AI with attack tokens (`meleeThink`), `this.attack(key)` (applies difficulty to
telegraphs), the telegraph language (glint 6f before active, red "!" for `tell: 'heavy'|'grab'`, heavy
tint pulse, `danger: 'line'|'circle'` ground markers), hit reactions, juggles, KO launch + blink + vanish,
score popups and family particles (gang sweat, mutant ichor, scorpion chitin via `def.chitin` colours).

Useful members inside callbacks (`this` = the enemy): `x, y, z, vx, vy, vz, facing, state, t, anim, aiT,
hp, maxHp, atk, cool, token, def`; methods `face(target)`, `moveToward(x, y, k)`, `circle(p)`,
`attack(key)`, `atkPhase()`, `takeToken()`, `dropToken()`, `finishAttack()`, `setState(s)`, `onScreen()`.
`Game.player` is the hero. Custom states: return `true` from `def.stateUpdate()` to own the frame
(it runs before reaction states, so check `this.state` first).

Attack data: `{ start, active, rec, dmg, tier (1-5), knock, kx, kz (launch), kb, stun, reach: [near, far],
zr: [low, high], depth, tell, danger, dangerLen, dangerR, glint: [x, y], whiff, sfxStart, selfVx, keepVx,
projectile (no melee hitbox), custom (no automatic resolve), next, nextOnHit }`.
Ranged attacks: in `def.attackTick(a, phase)` spawn `new Proj(x, y, z, { kind, vx, vz, gravity, dmg, tier,
knock, burn, venom, puddle, color })` on the first active frame (`this.t === a.start`), then `Game.add(proj)`.

Hit tiers: T1 light, T2 medium, T3 heavy, T4 finisher, T5 crit. Hitstop/shake/sound follow the tier.

### Engine hooks for content

- **Attack tokens:** 2 melee + 1 ranged at once (3 melee in stage 3). `def.ranged = true` makes an enemy
  use the ranged pool by default; `this.takeToken(true)` takes a ranged token explicitly. Bosses and
  `def.noToken` ignore the pool. Cooldowns after `finishAttack()` are `rand(coolMin..coolMax) x Game.stageMult()`.
- **Entries (spawn `side`):** `'R'`/`'L'` walk in from 24 px off-screen; `'top'` drops from z 60 by the back
  wall (`x` screen-relative); `'door'` steps forward out of a back-wall doorway at `x`; `'in'` appears in place;
  anything else calls `def.enterStyles[side].call(enemy, spec)`.
- **Holding the hero** (Ghoul bite, boss grabs): `Game.player.holdBy(this)`, set `this.holding = true` and your
  own state (e.g. `'clutch'`). Each frame position the hero and use `Game.player.holdDamage(n)` for bites (it does
  not break the hold). Button mashing adds `this.mashK` (default 8) to `this.clutchT`. Scrap Burst breaks the
  hold unless `this.burstEscapes === false`, calling `this.releaseClutch()`. Let go with
  `Game.player.freeFromHold(dir)` and `this.holding = false`. Any hit on the hero also breaks the hold.
- **Boss card:** `Game.bossCard('BIG DIESEL', 'JACKAL WARCHIEF')` (letterbox + name, 110f). Set `Game.bossRef = boss`
  for the bottom boss bar (`def.barLayer` = HP per bar layer). **Warning band:** `Game.warn('SANDSTORM!')`.
- **Slow motion / freeze:** `Game.slowmo(frames, scale)`, `Game.hitstop = n` (global freeze), `FX.shake(px, frames)`,
  `FX.flash(color, frames, alpha)`, `FX.showBanner(text, color)`, `FX.text(x, y, z, str, color, life)`.
- **Solids:** push `{ x0, x1, y0, y1, h, splat }` (world x, depth y range, height) onto `Game.solids` in
  `stage.setup`; fighters are pushed out, fast launched bodies wall-splat against them (`splat: false` to skip).
  Set `.off = true` to disable one later (e.g. the bus husk).
- **Sandstorm silhouettes:** `Game.silhouetteDist = 130` draws enemies farther than that from the hero as a
  solid #3A2A1A shape plus their `def.eyes()` pixels (`[[localX, localY, colour], ...]`). Set 0 to turn off.
- **Music filter:** `Sound.musicFilter(hz, seconds)` (20000 = open). `Sound.playSong(key)`, `Sound.fadeOut(sec)`,
  `Sound.duck(level, sec)`, `Sound.sfx(name, x)`; SFX names live in `SFX` in `src/10_audio.js` (add new ones
  from your module with `SFX.myName = (a, pan) => { ... }` using `a.tone(f0, f1, dur, type, vol, delay, a.out(pan))`
  and `a.noise(dur, vol, freq, q, filterType, delay, a.out(pan), freqEnd)`).
- **Hammer Drop:** the hero's neutral-jump attack carries `a.hammer = true` (13 dmg minimum vs the scorpion
  family). When it lands, every enemy whose type has `def.onHammerLand(x, y)` gets that call (burrow mounds pop).
- **Piston King overdrive** pins every vulnerable enemy it passes, except types whose `def.noPin(e)` returns true
  (scripted beats such as King Valve's floodgate crank). The barrage does not refill the Rage meter.
- **Cross-module spawn styles (contracts between modules):** `side: 'mound'` (scorpions module: erupts from a sand
  mound at screen `x`), `side: 'vat'` (mutants module: climbs out of a vat at the back wall, z 30). Stage modules
  just use these sides; the enemy modules implement them in `enterStyles`.
- **Stage slots:** assign `STAGES[0]`, `STAGES[1]`, `STAGES[2]` explicitly (not `push`) so a stage module can be
  built and tested alone. `window.__wb.play(i)` / `sandbox(types, i)` use the index.
- **Rage/overdrive:** the hero also has a Rage meter (`Game.rage`), an air special (Meteor Fist) and the
  "PISTON KING" overdrive; enemies may be put in state `'pinned'` by it (the base class handles that).

## Objects (`src/70_objects.js`)

Stage `props` entries `{ kind, x, y, drop }` create `Breakable`s. Kinds: `crate` (2 hits), `drum` (oil drum, 3 hits),
`fuel` (red fuel drum: explodes r36, 20 to the hero / 30 to enemies, chains), `fridge` (3 hits, always food),
`trunk` (car-wreck trunk), `trash`. `drop`: an item kind, `'none'`, or omitted for the random table.
Breakables are solid. `new BurningBarrel(x, y)` (add in `stage.setup` with `g.add(...)`) is a solid flaming
hazard (6 dmg + knockdown on touch).
`Item(kind, x, y, pop)` kinds: `cactus` (+15), `beans` (+30), `rat` (+50), `water` (full heal), `cap` (500),
`pouch` (1500), `watch` (3000), `dogtag` (1UP), weapons `pipe`, `machete`, `axe` (stop-sign axe), `molotov`.
`FirePatch(x, y, life=90, hurts='both', dmg=6, owner, w=20)`, `AcidPool(x, y, life, color, hurts='player', dmg)`, `Proj`.
`Game.explode(x, y, src, { r, depth, dmg, pdmg, palette })` hurts everyone in range.

## Stages (`STAGES.push({...})`)

```
{ title, sub, len, yMin, yMax, music, camStart,
  drawBg(ctx, camX, frame, game), drawFg(ctx, camX, frame, game), drawMarkers(ctx, camX, game),
  props: [{ kind, x, y, drop }], items: [{ kind, x, y }],
  waves: [{ at /* camera-lock x */, spawns: [{ type, side: 'R'|'L'|'top'|'in'|custom, x /* screen-relative, for 'in'/'top'/custom */,
            y, delay /* frames since wave start */, whenBelow /* wait until <= n alive */, cap, variant, opts, onSpawn(e, g) }],
            onStart(g), update(g), until(g), onClear(g), boss, music, noGo, endsStage, clearDelay }],
  setup(g), update(g), onExplosion(g, x, y) }
```
The camera scrolls right only, locks at `wave.at` while a wave is live, then shows GO.
Custom spawn sides call `def.enterStyles[side].call(enemy, spec)`.

## Music (`SONGS[key]`)

`{ bpm, length /* bars */, swing, tracks: [{ inst: 'bass'|'lead'|'arp'|'pad'|'drums', bars: [bar('A2 . A3 ...')],
wave, vol, cutoff, len, echo }] }`. `bar()` takes 16 space-separated steps; notes like `C#3`, `.` = rest;
pad tokens chord with `+` (`A3+C4+E4`); drum tokens are letters: k kick, s snare, h hat, o open hat,
c crash, m metal clank, t tom (combine: `kh`). Required keys: title, story, stage1, stage2, stage3,
elevator, boss, fanfare, gameover, ending.

## Story

`STORY.intro = [{ text, art(ctx, x, y, t, frame) }]`, `STORY.between[0]` (after stage 1),
`STORY.between[1]` (after stage 2), `STORY.ending`. `art` draws into a 200x96 panel at (x, y).

## Testing

- `node build.mjs [--out DIR] [--only a.js,b.js]`
- `node tests/gallery.mjs --types a,b --out file.png [--html path]` renders every state of each type.
- `node tests/sandbox.mjs --types a,b --frames 900 --every 150 --mash --god --out dir [--html path]`.
- `node tests/hero.mjs`, `node tests/smoke.mjs`.
- In the page: `window.__wb` has `manual`, `step(n)`, `input(actions, n)`, `tap(action)`, `play(stage, wave)`,
  `sandbox(types, stage)`, `snapshot()`.

## More contracts

- `SONGS[key].once = true` plays a song a single time (jingles: fanfare, gameover).
- `Game.player.setState('victory')` holds the gauntlet-raised victory pose (venting steam) until another state is set.
- Final boss finale: the King Valve module sets `Game.finaleDone = true` when the flood sequence ends; stage 3's
  boss wave uses `until: g => g.finaleDone`. The floodgate wheel stands at world x 3264, screen y 118.
- Road Raider spawn contract: `{ type: 'raider', side: 'L'|'R', y: laneY, opts: { uturn: true|false } }`; the raider
  runs its own 45f lane telegraph before crossing.
- Matriarch spawn contract: `{ type: 'matriarch', side: 'in', x: 260 }`; her module plays the eruption entrance.
- `ScorpionClaw` (scorpions module, a top-level class): `Game.add(new ScorpionClaw(x, y, victim))` plays the
  stage 1 foreshadow (a giant pincer drags the victim under the sand; drops a pipe).
- Toxic puddles (stage 3 module) are entities with `toxic = true`, `x`, `y`, `rx`, `ry`; Ghouls regenerate in them.
- Enemies with `ignoreForWave = true` (e.g. egg sacs) don't hold a wave open.
