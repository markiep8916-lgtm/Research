# RUSTFIST: Brawl for the Last Well — Final Design Spec

## 0. Proposal scoring

| Proposal | (a) Arcade fun | (b) Game feel | (c) Setting / variety | (d) Buildability | Total | Verdict |
|---|---|---|---|---|---|---|
| **1. RUSTFIST** (arcade-classic) | 8 | 8 | 9 | 7 | **32** | **Base.** It is the most complete and has the clearest readability rules: the blue-water rule, one telegraph per enemy and shared rigs. Its five bosses are more than the line budget allows. |
| **2. SCRAPFIST** (game-feel) | 9 | 10 | 6 | 4 | 29 | Best juice: wall splat, bowling bodies, combo pitch climb, a kill hit one tier higher, grey recoverable HP and a telegraph grammar. The rage/overdrive meter, deep juggles, the elevator, difficulty modes and the two-rig boss are over budget. |
| **3. RUST KNUCKLE** (world-variety) | 8 | 7 | 9 | 6 | 30 | Best set pieces: the burning bus, the scorpion foreshadow, sandstorm silhouettes, the Torcher, and a burrow mound popped by a stomp. The Tusker, carryable barrels, the crane and quicksand cost too much for what they add. |

**Merge decisions.** The base is Proposal 1: Juno, the world, Stages 1-3, King Valve and the HUD. Grafted ideas:
- From Proposal 2: grey recoverable HP for the special, wall splat, bowling bodies, the kill hit playing one tier higher, combo pitch climb, a directional camera kick, smears, Back Fist, Piston Straight, the end rank screen, and a 2-hit juggle limit.
- From Proposal 3: the burning bus, the scorpion foreshadow beat, sandstorm silhouettes, the Torcher, Hammer Drop popping burrow mounds, and the three-part telegraph grammar.

**Cut:**
- Gorgo (mid-boss), Tusker, Leaper and Chainer.
- Rage/Overdrive, Meteor Fist, Suplex and Vault.
- The difficulty menu, the elevator, quicksand, carryable barrels and the crane.

---

## 1. Premise & structure

It is 2097, forty years after the Flash, and water is the only currency. Warlord **King Valve** holds **Hollow Dam**, the last reservoir. His biker gang, the **Chrome Jackals**, burned convoy driver **Juno Reyes**'s water convoy, crushed her right arm and took her brother **Teo**. A scrap-smith rebuilt the arm as a piston-driven iron gauntlet, the **Rustfist**. Juno heads east.

| # | Stage | Time of day | Families | Mid-boss | Boss | World length | Target time |
|---|---|---|---|---|---|---|---|
| 1 | RUST ROW (scrap town) | dusk | Gang (+ scorpion foreshadow) | SLAB | BIG DIESEL | 2688 px (7 screens) | 2:30 |
| 2 | GLASS FLATS (desert highway) | noon | Gang + Scorpions (+ first Ghouls) | — | THE MATRIARCH | 3072 px (8 screens) | 3:00 |
| 3 | THE THIRSTY DAM (refinery) | night | Mutants + Iron Guard + Gang | — | KING VALVE (final) | 3456 px (9 screens) | 3:30 |

A full run takes about 9 minutes. The player starts with 3 lives and 3 continues. Extra lives come at 50,000 and 150,000 points.

**Blue rule:** saturated blue (#2E7FD8 family) appears only on the Water Jug, the final arena's reservoir and the ending flood. No other surface, enemy or UI element uses saturated blue.

---

## 2. World conventions & engine rules

### 2.1 Coordinates and layout
- **Canvas:** 384×216, scaled up with nearest-neighbour at an integer scale when the window allows, otherwise at the largest fractional fit. The page background is #0A0608.
- **Simulation:** fixed 60 Hz step through an accumulator.
- **Axes:**
  - `x` is the world position along the street.
  - `y` is the feet line inside the **depth band, y 134–200** (66 px deep).
  - `z` is height above the floor.
  - A sprite is drawn at screen `(x − camX, y − z)`.
  - Draw order sorts actors by `y` ascending. Juno draws last among equal `y`.
- **Screen regions:**

| Region | Screen y |
|---|---|
| HUD band | 0–22 |
| Back wall | 70–134 |
| Floor | 134–216 |
| Boss bar strip | 202–214 (no feet are drawn below y 200) |

- **Shadows:** every actor has an ellipse in #000 at alpha 0.35 drawn at feet `y`. Its width is `baseW × (1 − z/120)`.

### 2.2 Hit rules
A hitbox connects when all three conditions hold:
1. The x-ranges overlap. Hitbox x is `[x + facing·near, x + facing·far]`.
2. `|attacker.y − target.y| ≤ depthTol`. The default is 8, wide attacks use 12, and specials and explosions use 14–16.
3. The z-ranges overlap. The attack's z-range is relative to the attacker's z. The target's hurtbox is `z..z+height`.

Each attack instance hits a given target at most once.

### 2.3 Attack record format
Every attack is defined as:

`{S startup, A active, R recovery, dmg, tier, x[near,far], z[lo,hi], depthTol, kd(bool), launch{vx,vz}}`

### 2.4 Frame order
1. Input
2. Player
3. Enemies
4. Projectiles and hazards
5. Collisions
6. Particles
7. Camera
8. Render

**Hitstop:**
- A per-actor `freeze` counter. The attacker and the victim are frozen; everything else (particles, other actors, background) keeps updating.
- A global `slowmo` (timescale plus duration) runs the simulation via the accumulator, so 0.5x means one sim step every 2 real frames.

### 2.5 Physics
- Gravity is 0.28 px/f² for Juno and 0.30 px/f² for knocked-down bodies.
- **Ground friction for sliding bodies:** ×0.85 per frame.
- **Hitstun push:** `vx = push`, decaying ×0.80 per frame.

### 2.6 Camera
- The target is Juno.x + 40 in her facing direction, lerped at 0.12 per frame.
- The camera never scrolls left.
- **Screen lock:** camX is clamped to `lockX`. Juno is clamped to `[lockX+8, lockX+376]`. Enemies may enter from 24 px outside the screen and are then clamped.
- The lock edges are **walls**, used for wall splat and the Bruiser's dizzy.

### 2.7 Spawn limits
- At most 6 enemies alive at once. A Scorpling counts as 0.5.
- Each wave also has its own cap.

### 2.8 TIME
- TIME counts down 1 per 60 f from 99.
- It resets to 99 at every GO and at every boss start.
- At 0, Juno dies with the caption "DEHYDRATED".

---

## 3. Protagonist: JUNO REYES, "RUSTFIST"

### 3.1 Stats
- HP 100, 3 lives.
- Hurtbox half-width 8, z 0..40 (offset by jump height).
- She has no hurtbox while lying down or rising.

### 3.2 Rig
Juno is 44 px tall. Origin is at the feet centre; facing right is the reference pose, and facing left mirrors it. Every part gets a 1 px stroke in #140C0A.

**Draw order, back to front:**
1. Far (flesh) arm
2. Far leg
3. Torso and bandolier
4. Near leg
5. Head
6. Scarf
7. Near arm (the GAUNTLET)

**Joint heights (standing):**

| Joint | y |
|---|---|
| Ankle | −2 |
| Knee | −11 |
| Hip | −20 |
| Shoulder | −32 |
| Neck | −33 |
| Head top | −44 |

**Parts:**

| Part | Shape | Colours |
|---|---|---|
| Boots | rect 7×4 at each foot, sole line 7×1 | #2A1E18, sole #4A3A30 |
| Shins | 5×10 rect from knee | #A08060, knee pad 4×3 #4A4A4A at the knee |
| Thighs | 6×10 rect from hip | #A08060, pocket 3×3 #8A6A4E |
| Torso | trapezoid, 12 wide at shoulders, 10 at waist, 13 tall | tank top #5B6B3A |
| Bandolier | 2 px diagonal from near shoulder to far hip, 4 brass dots | #8A6A3A, dots #D4AF37 |
| Head | 9×10 rect with a 1 px jaw notch at bottom-front | skin #C68A5E, eye 1×2 #1A0E0A |
| Hair | 5-point polygon bob with a back tuft | #1E1414 |
| Bandana | 9×2 band across the forehead, 2 knot tails 2×4 at the back | #C8322A |
| Goggles (pushed up) | 2 circles r2 on the forehead | lens #FFB04A, rim #3A2A20 |
| Scarf | 3 tapered segments (6/5/4 px long, 3/2/1 px thick) from the neck | #E2591E |
| Far arm | upper 4×8, forearm 4×8, fist 4×4 | skin #C68A5E, wrap on the forearm #6A4A30 |
| Gauntlet: upper arm | 5×8 plates | #7A8088 |
| Gauntlet: forearm | 8×12 block with a 1 px highlight on its top edge | #8C6A4A, highlight #A87A50, 3 rivets #C9A86A |
| Gauntlet: piston rods | 2 rods, 2×8, on top of the forearm; `pistonOffset` 0..−4 px slides them back | #B8BEC4 |
| Gauntlet: fist | 8×8 block with a knuckle line | #A87A50, line #5E4424 |
| Shadow | ellipse 20×5 | #000 at alpha 0.35 |

**Scarf motion:**
```
angle_i = π + sin(t·0.1 + i·0.8)·0.25 − clamp(vx·0.15, −0.6, 0.6)
```
- Streams straight back (angle π) whenever |vx| > 2 or she is airborne.
- Whips to −π/2 (up) during knockdowns.
- No enemy wears orange on its arms or wears a scarf (readability rule).

**Steam puff:** 3 circles r2–3 in #E8ECEF at alpha 0.6, rising 0.5 px/f and growing +0.1 r/f, lasting 24 f.

**Flashes:**
- **Hurt flash:** every part draws #FFFFFF for 2 f.
- **Invulnerability blink:** hidden 2 f, shown 2 f.

### 3.3 Pose convention
- Angles are in degrees.
- **Shoulder and hip:** 0 = limb hanging straight down; positive rotates the limb toward the facing direction.
- **Elbow:** positive bends the forearm forward and up.
- **Knee:** positive bends the shin backward.
- `lean`: torso tilt, positive forward.
- `rootY`: crouch offset in px (positive is lower).
- Keyframes are lerped with ease-out (`1−(1−t)²`) during strike frames and linearly otherwise.

| Pose | lean | nSh | nEl | fSh | fEl | nHip | nKnee | fHip | fKnee | rootY | piston |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IDLE / guard | 4 | 25 | 95 | 30 | 100 | 8 | 10 | −8 | 12 | 0 (+1 sine, 60 f) | 0 |
| JAB strike (far arm) | 10 | 30 | 100 | 90 | 0 | 12 | 8 | −12 | 14 | 0 | 0 |
| CROSS strike (gauntlet) | 14 | 90 | 0 | 20 | 90 | 14 | 6 | −14 | 16 | 0 | 0 |
| HOOK wind-up → strike | 6 → 18 | 40 → 105 | 70 → 60 | 20 | 90 | 10 | 10 | −10 | 14 | 1 | 0 |
| UPPERCUT wind-up | −6 | −20 | 120 | 30 | 90 | 20 | 30 | −15 | 35 | 4 | −4 |
| UPPERCUT strike | 8 | 165 | 10 | 10 | 60 | 5 | 0 | −10 | 10 | −4 (z hop 4) | 0 |
| STRAIGHT wind-up → strike | −8 → 20 | 30 → 92 | 110 → 0 | 20 | 90 | 15 | 20 | −20 | 10 | 2 | −4 → 0 |
| FLYING KICK | −10 | 40 | 80 | 60 | 60 | 80 | 0 | −30 | 70 | — | 0 |
| HAMMER DROP | 15 | 160 → 70 | 0 | 160 → 70 | 0 | 20 | 40 | −10 | 40 | — | −4 → 0 |
| GRAB hold | 6 | 80 | 30 | 70 | 40 | 10 | 10 | −10 | 12 | 0 | 0 |
| KNEE | 4 | 80 | 30 | 70 | 40 | 70 | 90 | −5 | 10 | 0 | 0 |
| SPECIAL slam | 30 | 120 → 20 | 0 | 40 | 60 | 30 | 60 | −20 | 60 | 6 | −4 → 0 |
| HURT | −15 | 10 | 40 | 10 | 40 | 0 | 10 | 0 | 10 | 0 | 0 |
| VICTORY | 0 | 205 | −5 | 15 | 90 | 5 | 0 | −5 | 0 | 0 | vents steam 30 f |

**Locomotion cycles:**
- **WALK** (24 f cycle, `p = 2π·f/24`):
  - hip = ±25·sin(p), near and far in anti-phase
  - knee = max(0, −sin(p))·35
  - shoulders counter-swing ±15
  - bob = 1 px·|sin(p)|
- **RUN** (16 f cycle): hips ±40, knees up to 50, lean 12, arms ±35.
- **JUMP:**
  - squat: rootY 3 for 3 f
  - rise: knees 40, hips 30
  - fall: knees 20, hips 10
- **KNOCKDOWN:** the whole rig rotates about the feet from 0° to −90° (lying on her back) over the airborne arc; it lies 36 f; it rotates back over 16 f to rise.
- **IDLE flourish:** after 180 f idle, the gauntlet flexes (piston −4 → 0, two steam puffs, hiss SFX).

### 3.4 Locomotion
| Action | Values |
|---|---|
| Walk | 1.5 px/f in x, 1.0 px/f in depth, independent axes. Turning is instant on any idle or walk frame. |
| Run | Double-tap left or right within 12 f. 2.8 px/f in x, 0.8 in depth. Ends on release. Dust puff every 8 f. |
| Jump (K) | 3 f squat (hittable), then vz 4.6, gravity 0.28. Apex 38 px, airtime 33 f. Horizontal carry is fixed at takeoff: 0 neutral, 1.6 with a direction, 2.6 from a run. Facing is locked in the air. Landing lag 4 f, or 8 f after an air attack. |
| Buffers | Attack 8 f, jump 6 f. Inputs pressed during hitstop are buffered. |

### 3.5 Ground attacks (unarmed)
| Move | Input | S/A/R | Dmg | Tier | x[near,far] | z | Depth | Effect |
|---|---|---|---|---|---|---|---|---|
| 1 Snap Jab (far arm) | J | 3/2/7 | 4 | T1 | [6,28] | 4–36 | 8 | Hitstun 14, push 3 |
| 2 Cross (gauntlet) | J | 3/2/7 | 5 | T1 | [6,28] | 4–36 | 8 | Hitstun 14, push 3 |
| 3 Rust Hook | J | 5/3/10 | 7 | T2 | [6,30] | 4–36 | 8 | Hitstun 18, push 6 |
| 4a Piston Uppercut | J (neutral or back) | 7/4/20 | 12 | T3 | [4,28] | 4–44 | 8 | KD, launch vx 3.2, vz 3.4. Juno lunges 6 px in startup. Piston −4 over frames 1–7, snaps on frame 8 with a steam puff. |
| 4b Piston Straight | Forward + J | 8/4/20 | 12 | T3 | [6,32] | 4–36 | 8 | KD, **blast** vx 5.0, vz 1.6. The body becomes a bowling projectile (§5.4). |
| Back Fist | J with away held, during chain steps 1–3 | 4/3/12 | 8 | T2 | [6,28] after turning | 4–36 | 8 | Turns Juno around first, push 10. The chain restarts at step 1. |
| Shoulder Charge | J while running | 4/12/14 | 10 | T3 | [0,22] | 4–36 | 8 | KD launch vx 3.5, vz 3.0. Juno slides 3.2 px/f during the active frames. Hits up to 3 targets. |

**Chain rules:**
- A J press buffered during step N's active or recovery frames advances to step N+1 only if step N hit something.
- A whiff restarts the chain at step 1.
- The chain resets if no J arrives within 16 f after recovery ends.
- The full chain deals 28 dmg, which kills a Punk (24 HP).

### 3.6 Air attacks (one per jump)
- **Flying Kick** (directional jump + J):
  - Startup 4, active until landing.
  - 10 dmg, T3, KD (launch 3.2/3.0).
  - x[4,26], z relative to Juno 0..24.
- **Hammer Drop** (neutral jump + J):
  - Startup 5, active 12.
  - 9 dmg, T2, hitstun 20. x[−4,20], z relative −30..10, so it hits targets below her.
  - Against Sandstingers, Ashtails and Scorplings: 13 dmg, and it **flips** a Sandstinger or Ashtail for 50 f (1.5x damage taken).
  - On landing, it **pops** any burrow mound within |dx| ≤ 24 and depth 12: the scorpion surfaces DIZZY for 60 f.

### 3.7 Grab (Final Fight style)
**Auto-grab:** walk into a grabbable enemy and keep contact for 6 f. Conditions: |dx| ≤ 16, |dy| ≤ 5, both grounded, and the enemy is not in WINDUP, ACTIVE or KNOCKDOWN.
- **Grabbable:** Punk, Spiker, Knifer, Torcher, Ghoul, Kiln Trooper, and a fusing (dead) Bloater.
- Juno holds the enemy 12 px in front of her.
- The enemy breaks free after 100 f; both are pushed 8 px apart.
- Any hit on Juno breaks the grab.
- Juno cannot grab while holding a weapon.

**From the hold:**
- **Knee:** J with no direction. 4/2/12, 6 dmg, T2. The 3rd knee deals 8 dmg, is T3 and KD, and releases the enemy.
- **Scrap Toss:** J + left or right. 26 f total, Juno invulnerable throughout.
  - The enemy flies in the held direction at vx 4.2, vz 3.0. Tossing backward arcs the body over Juno's head to z 30.
  - 14 dmg on landing (T3).
  - The flying body is a **bowling projectile** (§5.4).
  - A tossed fusing Bloater explodes on its first contact or on landing.

### 3.8 Special: SCRAP BURST (L, on the ground)
- **Frames:** 4/10/14 (28 f). Invulnerable on frames 1–24.
- **Hitbox:** both sides, |dx| ≤ 42, depth 14, z 0..32. 14 dmg, T3, KD radially (vx 3.5 outward, vz 3.2).
- **Cost:** 8 HP, which becomes **grey recoverable HP**.
  - Each hit Juno lands restores 2 grey HP to real HP.
  - Any damage Juno takes erases all grey HP.
  - It never drops HP below 1. At HP ≤ 8 it costs HP−1.
- **Usable from:** idle, walk, run, any ground attack's recovery, and while held by a Ghoul or a boss (it breaks the hold). Not usable in hitstun or in the air.
- **Visual:**
  - An ellipse ring growing from r6 to r44 (height ratio 0.35) over 10 f, 2 px stroke, colour lerping #FFE08A → #E2591E.
  - 8 rock chips 2×2 in #8C6A44 (vz 2–3, vx ±1.5).
  - 4 steam puffs from the gauntlet.

### 3.9 Weapons
Pick up with J while standing over a weapon. J swings it (no chain). L throws it.

| Weapon | S/A/R | Dmg | Tier | x | Depth | Special | Durability |
|---|---|---|---|---|---|---|---|
| Lead Pipe | 6/4/12 | 10 | T2 | [8,38] | 8 | Every 3rd consecutive hit: T3 KD | 24 hits |
| Machete | 4/3/9 | 12 | T2 | [8,34] | 8 | Hitstun 16. 3rd consecutive hit KD | 18 hits |
| Stop-Sign Axe | 12/5/18 | 20 | T3 | [6,44] | 12 | Every hit KD | 10 hits |
| Molotov | J or L throws it | 10 direct | T3 KD | — | — | Thrown vx 3.0, vz 2.6, gravity 0.28. Bursts on contact or on landing into a **fire patch** (§9.3). | 1 |

- **Weapon throw** (L with a Pipe, Machete or Axe): the weapon flies flat at 5 px/f at z 22. 12 dmg, T3, KD. It pierces 1 target, then drops and is lost.
- **Durability** shows as HUD pips. When it runs out, the weapon shatters into 4 shards with a noise burst and 3 descending clicks.
- **Dropping:** a knockdown drops the weapon. It bounces 20 px away, lies for 300 f and blinks for the last 60 f.
- **Pickup priority:** J over an item (|dx| ≤ 12, |dy| ≤ 6) picks it up instead of attacking, unless an enemy is within 20 px in front. The pickup is a 10 f crouch, and Juno is hittable during it. Food is eaten instantly.

### 3.10 Getting hit
- **Light hit:** hitstun 16, push 4.
- **Heavy hit:** KD at vx 2.6 away, vz 3.0. She lies 36 f; each button press shortens this by 2 f, down to a minimum of 18 f. She rises over 16 f, then has 50 f of invulnerability.
- **Anti-stunlock:** a 3rd non-KD hit within 90 f becomes a KD.
- **Grabbed** (Ghoul, Matriarch, King Valve): each button press removes 8 f from the hold timer. L breaks the hold instantly, except where a move says otherwise.
- **Venom:** the HP fill turns #9BE15D and Juno is tinted #9BE15D at alpha 0.3. She loses 1 HP every 40 f for 120 f.
- **Death (HP 0):**
  - 20 f hitstop, then 0.5x speed for 40 f while she falls. She lies 90 f.
  - She respawns by dropping from z 110 at the same x, with full HP and 120 f of invulnerability.
  - Her landing shockwave knocks down every enemy within |dx| ≤ 80 for 0 dmg.

---

## 4. Game feel

### 4.1 Hit tiers
| Tier | Moves | Hitstop | Shake | Spark | Extras |
|---|---|---|---|---|---|
| T1 Light | jab, cross, nibble, flame tick | 3 f | none; 1 px camera kick in the hit direction for 2 f | 4-line star 8 px #FFF6C8, 6 f | push 3 |
| T2 Medium | hook, knee, back fist, hammer drop, weapon swings, most enemy hits | 5 f | 1 px for 6 f, plus a 1 px kick | 12 px star, core #FFF6C8 with tips #FFB04A, 2 dust puffs | 1 f white flash, push 6 |
| T3 Heavy | uppercut, straight, flying kick, charge, toss, bowling, special, axe, explosions | 8 f | 3 px decaying over 10 f, plus a 2 px kick | 18 px star, hit ring r4→18 over 8 f (2→0 px width, #FFF), 6 debris (gravity 0.25) | 2 f white flash, launch |
| KO (killing blow) | — | the move's tier +1 step (T1 KO → T2 values, T3 KO → 12 f / 4 px) | — | — | — |
| Wave-final KO | — | 14 f, then 0.5x for 24 f | 4 px | — | Bass "thwump"; music ducks to 30% for 300 ms |
| Boss KO | — | 30 f, then 0.4x for 120 f | 5 px | — | See each boss |

**Multi-hit:** the highest tier applies, plus 1 f of hitstop per extra victim (maximum +3 f).

**Juno getting hit:**
- Light: hitstop 4 f, shake 2 px for 6 f.
- Heavy: hitstop 7 f, shake 3 px for 8 f.
- Both: red vignette (4 edge rects 6 px thick, #B8322A at alpha 0.25, fading over 8 f), the HP bar flashes white, the portrait grimaces for 20 f.

**Shake:** each frame the camera offset is
```
round(rand(−1,1) · amp · remaining/duration)
```
with the vertical component ×0.6. Total amplitude is capped at 6. The HUD never shakes.

**Victim jitter:** ±1 px in x, alternating each frame of hitstop.

**Smears:** on the first active frame of any Juno strike, draw a white crescent polygon (alpha 0.6) along the fist or foot path, fading over 3 f.

**Explosion visual:**
- A white core circle grows from r0 to the explosion radius over 4 f.
- Then a ring of 12 fire particles (#FFD34A / #FF8A2A) and 6 smoke puffs (#3A3030, rising 0.5 px/f, r 4→10).
- 12 debris squares (2×2) under gravity.
- A scorch decal ellipse 30×8 in #1A1410 that fades over 600 f.
- Screen flash: #FFFFFF at alpha 0.6 for 2 f, then #FFB347 at alpha 0.3 for 4 f.
- Shake 5 px for 20 f.

### 4.2 Universal telegraph grammar (every enemy and boss)
- **(a) Wind-up pose plus glint:** a 4-point white star (5 px) flashes on the striking limb or weapon on the frame `max(1, windup − 6)`, with a family sound:
  - gang: shout
  - scorpion: click-rattle
  - mutant: rising groan
  - Iron Guard: hiss
- **(b) Red rim:** every attack that deals ≥ 12 dmg, causes a KD, or grabs strokes the attacker's silhouette with a 1 px #FF3B30 outline, shown 4 f and hidden 4 f, during its last 10 wind-up frames.
- **(c) Ground markers** for location attacks:
  - Red dashed line (#FF3B30, alpha 0.6, 4 px dashes) for lunges and charges.
  - Red ellipse growing to the impact radius for lobs, landings and eruptions.

Hitting a non-armoured enemy during its WINDUP cancels the attack (it goes to HIT).

### 4.3 Knockdown and bodies
- Launched bodies use gravity 0.30.
- **Landing:**
  - If vz < −3.0, the body bounces once (vz = +1.6, vx ×0.6). This makes a dust ring (ellipse 4→18 px wide, #C8B090, 12 f) and a thud.
  - Otherwise it slides with friction ×0.85, spawning a dust puff every 4 f while |vx| > 1.
- **Lying:** enemies lie 40 f and rise over 16 f. They cannot be hit while lying, while rising, or for 10 f after standing; during that 10 f grace they also cannot attack.
- **Juggle:**
  - An airborne launched enemy can be hit by any Juno hitbox that overlaps it in z.
  - Each juggle hit deals ×0.7 damage and relaunches at vz 2.6.
  - Maximum 2 juggle hits per launch. After that the body is intangible until it lands (drawn at alpha 0.5, alternating every 2 f).
- **Dead enemies:** lie 50 f, blink (2 f on / 2 f off) for 30 f, then vanish.

### 4.4 Wall splat and bowling (grafted from Proposal 2)
- **WALL SPLAT:**
  - Trigger: a launched or thrown body hits a lock edge, a solid prop or the burning bus with |vx| > 3.
  - Result: it bounces back at vx = −0.5·vx, vz = max(vz, 2.0), and takes +5 dmg at T3 (8 f hitstop, 3 px shake).
  - Draw 3 crack lines (#1A1410, 6–10 px) on the wall at the impact height for 60 f, a dust burst, and a "SPLAT!" text pop (8 px #FFE08A, 30 f).
- **BOWLING:**
  - A thrown or blasted body with |vx| > 3 hits each other enemy within |dx| ≤ 12 and depth 10 once: 10 dmg, T3, KD.
  - Each such hit costs the body 30% of its vx.
  - These hits count toward Juno's combo and score.

### 4.5 Particles (pool of 200, plus 40 floor decals)
| Source | Particles |
|---|---|
| Humans | Spark star. On T2+: 3 sweat drops (2×1 px, #E8F0F0). On a KO, one accessory pops off: a mohawk spike or a goggles rect. |
| Armour (Kiln Trooper, Bruiser) | 4 orange sparks (#FFB04A, gravity 0.25) |
| Scorpions | 3–5 chitin triangles (#8A4A1C, spinning 0.3 rad/f, bouncing once, 40 f) plus 2 ichor drops (#E8E070) |
| Mutants | Goo blobs (r1–2, #7CFF6A, gravity 0.25) that become 6×2 floor decals (#4FB82E, alpha 0.8, fading over 240 f). Death: 8 steam circles (#7CFF6A, alpha 0.5, rising 0.6 px/f). |
| Movement | 1 dust puff per run step; 2 on landing (#A08A6A, r2→6, 20 f, rising 0.2) |
| Fire | Stacked flickering triangles cycling #FFD34A / #FF8A2A / #E83B1E every 4 f, plus 1 px embers (#FFB030) rising 0.5–1 px/f |

### 4.6 Combo counter
- Every hit Juno causes (including bowling, thrown weapons, and explosions she triggered within the last 120 f) adds 1, if it lands within 75 f of the previous hit.
- **Display:**
  - Shown from 2 hits, at the right side: the number in 16 px at (334, 30) and "HITS" in 8 px under it.
  - A 40×2 timer bar shrinks beneath it.
  - Each increment pops the number from scale 1.6 to 1.0 over 6 f with a −6° tilt.
  - Colour by count: 2–9 #FFFFFF, 10–19 #FFE08A, 20–29 #FF8A2A, 30+ #FF3B30 (flickering every 4 f).
- **Combo end:**
  - With 3+ hits: award 100 × (hits − 1).
  - With 10+ hits: banner "BRUTAL!". With 20+: "SAVAGE!". With 30+: "APOCALYPTIC!". Banners hold 50 f.
- **Hit sound pitch:** multiply by 2^(min(combo,14)/24), i.e. +0.5 semitone per hit, capped at +7.

---

## 5. Enemies

### 5.1 Shared AI
**States:**
`ENTER → APPROACH → HOLD → WINDUP → ACTIVE → RECOVER`, plus `HIT`, `KNOCKDOWN`, `RISE`, `DIZZY`, `DEAD`.

**ENTER:**
- Walk in from 24 px off-screen,
- or exit a back-wall doorway at y 136,
- or drop from z 60 by the back wall (60 f fall, landing dust).

**Attack tokens:**
- At most **2 melee and 1 ranged** enemies may be in WINDUP or ACTIVE at once (3 melee in Stage 3).
- A token returns after recovery; that enemy then waits a cooldown of `rand(60,110) × stageMult` (Stage 1 ×1.0, Stage 2 ×0.85, Stage 3 ×0.75).
- Every 90 f a free token goes to the enemy that has waited longest.
- Enemies behind Juno get priority.

**HOLD (no token):**
- Move to ring slots around Juno: x offset ±56 or ±88, depth offset 0 or ±14.
- Bob 1 px and sidestep in depth at 0.6 px/f.

**Starting an attack requires:**
- the enemy to be on screen;
- `|dy| ≤ 6` (10 for wide attacks);
- Juno within the attack's trigger range;
- its cooldown to be over;
- a token.

**HUD:** an enemy that gets hit shows its name and HP bar on the HUD for 120 f.

**Humanoid rig:** the same parts and joints as Juno, scaled by `s = height/44`. Width overrides are listed per type.

### 5.2 Gang members: THE CHROME JACKALS

#### 1. JACKAL PUNK
- **Names:** SKAG, GRIT, VERMIN, RATCHET, DUSTY.
- **Size:** 40 px; hurtbox half-width 8.

**Look:**
- Arms bare skin #C98B5A.
- Vest torso 12×14 in #2A2A2E with 3 studs #B8BEC4.
- Near shoulder pad of 3 triangles in #B8BEC4.
- Head 9×10 in skin, with a mohawk of 5 triangles (6 px tall) in #FF7A1A and an eye band 9×2 in #1A1A1A.
- Jeans #5A3E8C, boots #1A1A1A.

**Stats:** HP 24. Walk 1.1 x / 0.8 depth. Score 300.

**Attacks:**
- **Haymaker:**
  - WINDUP 12 f: fist rears back past the head, lean −10°.
  - Active 3, recovery 18.
  - 6 dmg, T2, x[4,26].
- **Running Kick** (30% of picks, used when 60–90 px away):
  - WINDUP 10 f: crouches 3 px, back foot scrapes dust; red dashed line.
  - Slides at 3.0 px/f for 16 f, leg out.
  - 8 dmg, KD, z 0..20.
  - Recovery 18 (stumble).
- **Taunt:** after a whiffed attack, 15% chance: arms up and a "HEY!" shout for 40 f, with no attacking.

**AI:** with a token he approaches to 22 px. He picks the Haymaker when dx ≤ 26, and the Running Kick when 60 ≤ dx ≤ 90 (30% roll).

#### 1b. SPIKER (Punk variant)
- **Look:** mohawk #7BE04A, jeans #A8322E, spiked wristbands (3 triangles in #B8BEC4).
- **Stats:** HP 32. Damage +2. Cooldown ×0.8. Score 400.

#### 2. JACKAL BLADE, "Knifer"
- **Names:** SHIV, NEEDLE, ZIP.
- **Size:** 42 px, skinny (torso 10 wide).

**Look:**
- Poncho cloak triangle in #4A4A3C over the torso.
- Goggle lenses: two 2×2 rects in #FF3B30.
- Arms #B07A50 (forearm 9 long).
- Knife: triangle 8×2 in #E8ECEF.
- Leg wraps #6A5A44.

**Stats:** HP 22. Walk 1.4 / 1.0. Holds 70–100 px away and strafes in depth to line up. Score 400.

**Attacks:**
- **Lunge:**
  - WINDUP 18 f: crouch 3, knife cocked; the glint flashes on frames 8–18 with a "shing"; red dashed line 63 px.
  - Dashes 4.5 px/f for 14 f.
  - 10 dmg, T2, x[0,16].
  - Recovery 26 f (stumbling).
- **Hop Back:** when Juno is within 30 px, 40% chance per 30 f to hop away (vz 3.0, vx 2.5).

#### 3. TORCHER (ranged; grafted)
- **Names:** WICK, FUSE.
- **Size:** 40 px.

**Look:**
- Gas-mask head: circle r5 in #5A5A5A with 2 lens circles r1.5 in #FFB030 and a filter canister 3×4 in #6A6A5A.
- Duster coat: trapezoid down to the knees in #6B4A2B.
- Bandolier of 4 bottles (2×4 in #3A7A3A, wick dot #FF8A1C).
- Gloves #2A2A2A.

**Stats:** HP 22. Walk 1.0 / 0.9; retreats at 1.4 when Juno is closer than 70 px. Keeps 110–150 px away, lined up within depth ±4. Score 450.

**Attacks:**
- **Molotov Lob** (ranged token):
  - WINDUP 24 f: the bottle is raised overhead and the wick flickers #FFD23F / #FF5A1C every 3 f.
  - Released at z 30, vz 3.0, gravity 0.18 (about 36 f of flight). vx is solved to land at Juno's x at release, capped at |4.5|.
  - A red ellipse marker grows from 6 to 20 px at the landing spot.
  - Direct hit: 10 dmg, KD.
  - Landing creates a **fire patch** (§9.3).
  - Cooldown 100 f. Only one bottle of his in flight at a time.
- **Panic Shove:** when cornered at a wall with Juno within 28 px. WINDUP 8, 4 dmg, push 6.

**Tank Pop:** killed by a T3 hit, he bursts: explosion radius 32, 16 dmg to enemies and 12 to Juno.

**Drops:** a Molotov 40% of the time.

#### 4. JACKAL HEAVY, "Bruiser"
- **Names:** MOOSE, TANKER.
- **Size:** 48 px, torso 22 wide; hurtbox half-width 12.

**Look:**
- Bald head #B07A50 with goggle band #2E2E2E and lenses #FFD27A.
- Gut circle r9 under an apron in #6E5236.
- Tire shoulder guard: arc in #2B2B2B with tread notches.
- Arms 6 thick; pants #4A4A3A.

**Stats:** HP 64. Walk 0.75. Not grabbable. Score 1000. Drops a Cap Pouch 50% of the time.

**Super armour:**
- T1 hits deal damage with no hitstun (white flash plus a "clank").
- T2 hits stagger him for 12 f.
- Only T3 hits knock him down.

**Attacks:**
- **Double Axe Handle:**
  - WINDUP 24 f: both fists rise overhead; red rim.
  - Active 4, recovery 22.
  - 14 dmg, KD, x[4,30], depth 10.
- **Bull Charge** (when dx > 100 and aligned):
  - WINDUP 20 f: two stamps, nostril steam; red dashed line.
  - Charges at 3.2 px/f for up to 120 f, or until he hits a wall or a drum.
  - 12 dmg and a KD to anyone in the path, enemies included.
  - Hitting a wall leaves him **DIZZY 60 f** (3 stars in #FFE14A) and he takes 1.25x damage while dizzy.

#### 5. ROAD RAIDER (set piece)
- **Size:** 56 px long, 34 px tall.

**Look:**
- Wheels: circles r7 in #1A1A1A, hub r2 in #8A8A8A, 4 rotating spokes.
- Frame polygon #3A3A3A, tank #9B2D20, exhaust #B8BEC4 with a flame triangle #FF8A2A.
- Headlight #FFF2A0.
- Rider: the Punk rig crouched, with a skull helmet (circle #E8E0D0 with 2 eye holes).

**Stats:** rider HP 20. Score 800.

**Attack:**
- **Telegraph 45 f:**
  - A red "!" arrow blinks at the screen edge in the bike's lane.
  - A headlight cone (triangle #FFF2A0 at alpha 0.35) sweeps in along the lane.
  - Engine rev.
- Then it crosses at 5.5 px/f in a fixed lane.
- Contact: 16 dmg, KD, depth 8, z 0..16. It hits enemies too.
- It U-turns once, 90 f later, if flagged in the wave table.

**Unseating:** any Juno hit reaching z ≥ 14 (flying kick, thrown weapon, toss) unseats the rider.
- The rider lands as a knocked-down Punk with 12 HP.
- The bike tumbles 40 px, sparking, and explodes 30 f later: radius 30, 20 dmg to all.

### 5.3 Giant scorpions

**Scorpion rig** (facing right; origin at the body centre on the floor; scale `k`):
- **Body:** 4 ellipses (12×9, 10×8, 9×7, 8×6)·k, chained backward from the head.
- **Head:** ellipse 10×7·k with 2 eye dots.
- **Legs:** 4 per side, each a 2-segment line 2 px wide.
  - Leg i angle = base + sin(legPhase + i·π/2)·0.5.
  - Far-side legs are 25% darker and drawn behind the body.
- **Pincers:** arm rect 8×3·k plus 2 triangles that open by `clawOpen` (0..1 → 0..35°).
- **Tail:** 5 ellipse segments, 6·k each.
  - angle_i = baseAngle − i·tailCurl·32°.
  - `tailThrust` (0..1) lerps the chain to point forward over the head.
  - The stinger is a curved 7×4·k triangle.
- **Animated parameters:** `legPhase` (+0.4/f while moving), `clawOpen`, `tailCurl`, `tailThrust`, `bodyDip` (0..3 px).

**Hurtbox:** body length × height.

**Flip state:** the rig is drawn upside down (scaleY −1 about the body centre), legs wiggling at 3× phase speed.

#### 6. SANDSTINGER
- **Name:** STINGER.
- **Size:** 40 px long; tail tip up to 34 px.

**Look:**
- Body #C8782E, plates #8A4A1C, rim line #E8A060.
- Legs #7A421A (far side #5E3414).
- Stinger #E8E05A with tip #3A2A10. Eyes #1A0E0A.

**Stats:** HP 30. Not grabbable. Score 600.

**Movement:** skitters at 2.2 px/f for 20 f, pauses 16 f; depth speed 1.2.

**Hit reactions:** T1 and T2 cause hitstun, with no KD. T3 or a Hammer Drop **flips** it for 50 f (1.5x damage taken).

**Attacks:**
- **Pincer Snap** (dx ≤ 24):
  - WINDUP 10 f, claws open.
  - Active 4. 6 dmg, T1, x[10,24], z 0..20.
- **Tail Strike** (24–46 px):
  - WINDUP 22 f: tailCurl → 1; the stinger blinks #E8E05A / #FFFFFF every 3 f; a whine rises 400 → 1200 Hz; red rim.
  - Active 6 f: tailThrust → 1, stab x[20,46], z 10..36, depth 10.
  - 12 dmg, T2, plus **venom**.
  - Recovery 20 f with the stinger stuck in the ground; the tail takes 1.5x damage.
- **Burrow** (when dx > 120, or after taking 3 hits; cooldown 300 f):
  - Sinks over 20 f inside a sand ring; invulnerable.
  - Travels as a **mound** (ellipse 16×4 in #D9A35E with flicking specks) at 2.0 px/f toward Juno for up to 90 f.
  - Eruption telegraph 16 f: the mound shakes ±1 and grows to 22×6; a red ellipse marker r18.
  - Erupts: 10 dmg, KD, radius 18.
  - A Hammer Drop, Scrap Burst or explosion on the mound pops it out DIZZY for 60 f.

#### 7. ASHTAIL (radioactive variant)
- **Look:** body #2A2230, plates #4B3A5C, legs #1A141E. Stinger #D84CFF and eyes #FF4C8A, both alpha-pulsing between 0.6 and 1.0 every 30 f.
- **Stats:** HP 36. Does not burrow. Keeps 100–140 px away. Score 700.
- **Venom Spit** (ranged token):
  - WINDUP 20 f: tail sways ±20°.
  - Glob (r3 in #C04CFF with a 3-dot trail) on a 40 f arc to Juno's position at release; red ellipse marker.
  - On landing it leaves an **acid puddle**: ellipse 24×8 in #8A2ABF at alpha 0.55, for 120 f, 3 dmg per 20 f to Juno only.
- Also has the Pincer Snap and Tail Strike (14 dmg).

#### 8. SCORPLING
- **Look:** the rig at k = 0.35 (14 long), body #E0A060, stinger #F2F06A.
- **Stats:** HP 6. Ignores tokens. Score 100.
- **Movement:** hops toward Juno at 2.0 px/f, changing direction every 12–20 f.
- **Nibble** (dx ≤ 12): WINDUP 6, 3 dmg, T1, z 0..10.
- Any hit kills one.

### 5.4 Mutants: "THE GLOWING"

#### 9. GHOUL
- **Names:** GHOUL, RUNT, GRUB.
- **Size:** 40 px, torso leaning 20° forward, head out in front of the shoulders.

**Look:**
- Skin #8FA868, shading #6E8648.
- 4 boils r2 in #7CFF6A, alpha pulsing 0.6–1.0.
- Rag loincloth #5A4A3A.
- Far arm 1.3x longer, with 3 finger triangles.
- Eyes #FFF36A, mouth slash #2A1A10.

**Stats:** HP 28. Grabbable. Score 500.

**Movement:** lurches at 0.6 px/f, with a lunge-step at 1.6 px/f for 8 f every 40 f.

**Attacks:**
- **Claw Swipe** (dx ≤ 28):
  - WINDUP 14 f, the long arm swings up behind.
  - Active 4, recovery 16. 8 dmg, T2, x[4,28].
- **Lunge Grab** (dx < 40, aligned):
  - WINDUP 16 f: crouch, arms spread, groan; red rim.
  - Leaps 3.0 px/f for 16 f.
  - On contact it holds Juno and bites for 4 dmg every 24 f.
  - Escape: 8 presses (Ghoul staggers 30 f), L instantly, or it lets go itself after 120 f.
  - A miss leaves it skidding for 30 f.

**Second Wind:** when killed, 30% chance it lies 90 f, then rises once with 10 HP, eyes #FF3B30 and ×1.3 speed. The first death scores nothing.

**Toxic puddles** (Stage 3): standing in one regenerates 1 HP per 10 f.

#### 10. BLOATER
- **Name:** BLOATER.
- **Size:** 40 px.

**Look:**
- Body circle r14 in #A8B85A with vein lines #6E7A34 and 4 blisters r2 in #E0E05A.
- Head circle r5 on top; arms 3×8; short legs.
- `inflate` (0..1) scales the body radius from 14 to 18 and lerps its colour toward #E0E05A.

**Stats:** HP 40. Walk 0.5. Not grabbable while alive. Score 800, plus 200 per enemy its blast kills.

**Attacks:**
- **Belly Bump** (dx ≤ 22): WINDUP 12. 8 dmg, T2, push 10.
- **Gas Belch** (dx 30–60):
  - WINDUP 30 f: pulses r14 → 18 three times; rising wheeze.
  - Releases a cone of 6 gas puffs (r6–10, #B8E05A at alpha 0.45) drifting forward at 0.6 px/f out to +56 px, lingering 120 f.
  - 4 dmg per 15 f to Juno.

**Death fuse:** at 0 HP it does not fall.
- It swells to r20 and flashes #FF3B30 / #FFFFFF, starting every 6 f and speeding to every 2 f over 70 f, with a fuse beep. A red dashed ring of r44 shows the blast area.
- Then it explodes: radius 44, depth 16, 18 dmg, T3 KD to **everyone**.
- While fusing it can be grabbed and tossed; it explodes on the first contact or on landing.
- 2+ kills from one blast: "CHAIN POP!" banner and +1000.

### 5.5 Extra family: KING VALVE'S IRON GUARD

#### 11. KILN TROOPER (flamethrower)
- **Name:** KILN.
- **Size:** 44 px.

**Look:**
- Helmet: dome in #6F7780 with an eye slit glowing #FF8A2A.
- Chest plate: trapezoid #5A626C with rivets #8A929C.
- Sash #A82C24.
- Back tank: rounded rect 8×16 in #B33A2B with a gauge dot #FFE08A.
- Nozzle wand 14×3 in #3A3F46 with a pilot light #FFD34A.
- Trousers #4A4E54, boots #1E1E22.

**Stats:** HP 44. Walk 0.9. Grabbable. Score 1200.

**Front armour:** T1 hits from the front deal 1 dmg with no hitstun (clank, orange sparks). T2/T3 hits, throws and anything from behind deal full damage.

**Attacks:**
- **Flame Jet** (dx 20–70):
  - WINDUP 24 f: the pilot light flickers, an 8 Hz tick, the tank shakes 1 px; red rim; red dashed line 70 px.
  - A 40 f stream of 7 overlapping circles from +10 to +70 px, radius 4 → 9, colours cycling #FFD34A / #FF8A2A / #FF4A1A.
  - z 12..30, depth 8. 6 dmg per 10 f; the 3rd tick is a KD.
  - Recovery 30 f while the tank vents steam.
- **Nozzle Bash** (dx ≤ 20): WINDUP 10. 8 dmg, T2.

**Death:** the tank hisses 30 f, then explodes: radius 28, 12 dmg to all.

### 5.6 Enemy master table
| Type | HP | Walk x/depth | Grab | Tokens | Score |
|---|---|---|---|---|---|
| Punk | 24 | 1.1 / 0.8 | yes | melee | 300 |
| Spiker | 32 | 1.1 / 0.8 | yes | melee | 400 |
| Knifer | 22 | 1.4 / 1.0 | yes | melee | 400 |
| Torcher | 22 | 1.0 / 0.9 | yes | ranged | 450 |
| Bruiser | 64 | 0.75 / 0.5 | no | melee | 1000 |
| Road Raider | 20 | 5.5 (lane) | no | none | 800 |
| Sandstinger | 30 | 2.2 burst / 1.2 | no | melee | 600 |
| Ashtail | 36 | 2.2 burst / 1.2 | no | ranged + melee | 700 |
| Scorpling | 6 | 2.0 | no | none | 100 |
| Ghoul | 28 | 0.6 lurch / 0.6 | yes | melee | 500 |
| Bloater | 40 | 0.5 / 0.4 | when fusing | melee | 800 |
| Kiln Trooper | 44 | 0.9 / 0.6 | yes | melee | 1200 |

---

## 6. Bosses

### 6.1 Common boss rules
- **Intro:** a name card (§10.5), then the music switches.
- **HP** shows on the bottom boss bar, layered in 100- or 120-HP bars.
- Bosses cannot be grabbed.
- **Combo break:** after 5 hits within 60 f, the boss "shrugs": 8 f white flash, invulnerable, then immediately uses its fastest attack.
- **Stagger meter:** damage adds to the meter. A T3 hit knocks the boss down only when the meter is ≥ 40 (≥ 50 for King Valve); otherwise a T3 hit is a 20 f stagger. The meter resets after each knockdown.
- **Getting up:** 24 f invulnerable.
- Bosses use the attack-token system with an exclusive token, so adds still use the normal 2 melee + 1 ranged.

### 6.2 STAGE 1 MID-BOSS: SLAB
- **Look:** the Bruiser rig at scale 1.1 (53 px). Goggle lenses #FF3B30, apron #3A2A20, a chain wrapped around the near forearm (dotted line in #8A8A8A).
- **Stats:** HP 90 (single bar). Score 3000.
- **Moves:** the Bruiser moveset with cooldowns ×0.85.
- At 50% HP he whistles once and 2 Punks enter from the right.

**AI:**
- dx ≤ 30: Double Axe Handle.
- dx > 100: Bull Charge.
- Otherwise: approach.

### 6.3 STAGE 1 BOSS: BIG DIESEL, Jackal Warchief
- **Size:** 56 px (humanoid rig ×1.3); hurtbox half-width 14.

**Look:**
- Gut circle r14 in #8A5A3E under black overalls #2A2228 with 2 straps.
- Gas mask: face plate #3F4A3A, 2 filters r3 in #9AA39A, lens eyes #FF3B30.
- Two exhaust stacks behind the shoulders: 4×14 rects in #5C5C5C with caps #2A2A2A, puffing smoke circles #2A2226 every 20 f (every 4 f during wind-ups).
- Block Hammer: handle 3×30 in #6A4A2A, head 18×14 in #7A8088 with 3 cylinder dots #4A4E54.

**Stats:** HP 180 (2 bars of 90). Walk 0.9. Score 10,000.

**Attacks:**
- **Hammer Smash:**
  - WINDUP 26 f: hammer overhead, stacks blasting smoke; a blinking 24×8 ground marker in #FF3B30, 34 px ahead.
  - Active 5. 18 dmg, KD.
  - A dust shockwave crawls ±36 px along the floor: z 0..8, 6 dmg, jumpable.
  - Recovery 30 f with the hammer stuck.
- **Wrecking Spin:**
  - WINDUP 20 f: crouches with the hammer wound back; rising whistle.
  - Spins for 60 f, drifting toward Juno at 1.2 px/f and hitting every 15 f: radius 36, depth 12, 8 dmg, KD.
  - Ends DIZZY for 50 f.
- **Diesel Rush:**
  - WINDUP 18 f: engine rev; red dashed line.
  - Charges at 3.6 px/f to the lock edge. 14 dmg, KD. Bonking the edge stuns him 30 f.

**AI:**
- dx ≤ 50: Hammer Smash (60%) or Wrecking Spin (40%).
- Otherwise: Diesel Rush (50%) or walk in.

**Phases:**
- At 50%: a whistle, then 2 Punks and 1 Knifer enter (once).
- At 25%: smoke turns #E2591E and cooldowns go ×0.7.

**Defeat:** falls backward, the stacks sputter 3 puffs, the hammer clanks to the floor.

### 6.4 STAGE 2 BOSS: THE MATRIARCH
- **Size:** scorpion rig at k = 3.2 (128 px long, 64 tall, tail up to 96).

**Look:**
- Body #9A4A22, plates #5E2A12, rim #E0904A.
- 6 eyes #FFDD44 in two rows.
- 3 egg sacs on her back: circles r6 in #E8D8A0 with yolks #C8A860, pulsing between scale 1.0 and 1.1 over 40 f.
- Stinger #F2F06A, 18 px long.

**Entrance:** erupts from the crater floor at screen x 260, with a 60 f, 3 px shake and a sand plume of 60 particles.

**Stats:** HP 300 (3 bars of 100). Score 20,000. Never knocked down; T3 hits make her recoil 12 f.

**Hurtboxes:**
- Front 40 px of the body (head and claws), z 0..40.
- The stinger (16×16) while it is lodged.
- Egg sacs at z 44–60, 10 HP each; only air attacks reach them.

**Attacks:**
- **Claw Sweep** (dx ≤ 72):
  - WINDUP 18 f, one claw raised and open; red rim.
  - Sweeps the lane out to 72 px, depth 14. 12 dmg, KD.
- **Tail Hammer** (signature; any range):
  - WINDUP 36 f: a red reticle (circle stroked #FF4A2A) shrinks from r20 to r8 under Juno. It tracks her until frame 24, then **locks**.
  - Frame 36: the stinger slams down. 20 dmg, KD, radius 14.
  - The stinger stays lodged for 70 f (tail glowing #FFE14A, pulsing dust rings) and takes **2x damage**.
- **Brood Call:** while any sac survives, every 600 f the sacs pulse for 30 f and each live sac drops 2 Scorplings (maximum 6 on screen). Destroying a sac scores 1000 and drops a Cactus Fruit.

**Phase 2 (below 200 HP): Burrow Charge** (added to the rotation, every 3rd attack):
- Sinks over 30 f.
- A 40 px mound tracks Juno at 2.4 px/f for 120 f.
- 20 f eruption telegraph (rumble, 1 px shake, red ellipse r30).
- Bursts out: 16 dmg, KD, radius 30.
- Surfaces with 40 f of vulnerable recovery.

**Phase 3 (below 100 HP): Venom Rain** plus cooldowns ×0.75:
- Lobs 5 globs at random floor spots within 120 px of Juno.
- Each target shows a red ellipse growing over 40 f.
- 8 dmg plus a 90 f acid puddle.

**AI rotation:** Claw Sweep if dx ≤ 72; otherwise Tail Hammer. The cooldown between attacks is 70 f.

**Defeat:** legs fold over 30 f; the tail falls in a slow arc and slams (4 px shake); the body crumbles into 30 chitin chunks.

### 6.5 FINAL BOSS: KING VALVE, the Thirst King
- **Size:** 60 px (humanoid rig ×1.35); hurtbox half-width 16.

**Look:**
- Torso: a boiler drum, circle r18 in #8C6A3A with rim #5E4424 and 8 rivets #C9A86A.
- **Chest gauge:** circle r5 in #F2EEE0 with a needle #D8322A. **The needle is the telegraph:** it rests at 9 o'clock and swings to 3 o'clock across every wind-up.
- Helmet: dome #6E7A84 with a porthole visor glowing #FFB04A.
- Crown: 3 valve wheels (r3, 4 spokes) in #D4AF37.
- Far arm: a pipe ending in a nozzle, #4A525C.
- Near arm: a piston fist #7A8088 with a sliding rod #B8BEC4.
- Legs: pipe segments #5A626C.
- Tarp cape #5A1E1E (3 strips swinging at sin(t/20)·2 px).
- Shoulder steam wisps every 30 f.

**Arena:** the dam crown (§7.3).

**Stats:** HP 360 (3 bars of 120, coloured #F2C14E, #E2591E, #B8322A). Score 50,000. Stagger KD threshold 50.

**PHASE 1, "THE KING" (360–241 HP).** Walk 0.9. The cooldown between attacks is 60 f.
- **Steam Jet** (dx 10–80):
  - WINDUP 24 f: needle to red, nozzle drips, rising hiss.
  - A cone from +10 to +80 px: a wedge of circles in #E8ECEF at alpha 0.6, depth 12, for 30 f.
  - 5 dmg per 8 f, and it pushes Juno 1.5 px/f.
- **Piston Punch** (dx ≤ 50):
  - WINDUP 16 f: piston retracts 8 px, rod glows #FFB04A; red rim.
  - The fist shoots to +50 px in 4 f. 16 dmg, KD.
- **Crown Wheel** (dx > 80):
  - WINDUP 20 f: lifts a wheel and spins it.
  - Boomerang at 4 px/f out to 160 px in Juno's lane at release, then returns. 10 dmg, T2. Jump it.

**PHASE 2, "FLOODGATES" (240–121 HP).**
- **On entry:** he backs to the floodgate wheel and cranks it for 40 f. His back is exposed and he takes 1.5x damage. A Canned Beans pickup drops from a crane hook at x 192. He calls 2 Kiln Troopers (once).
- **Pressure Lanes:**
  - The band is split into lanes A (y 134–156), B (156–178) and C (178–200).
  - Every 240 f, one lane he is not standing in flashes stripes (#8EC8FF at alpha 0.3) for 40 f.
  - Then a water jet blasts across the whole screen in that lane for 40 f: body #2E7FD8, foam edge #E8F4FF.
  - 8 dmg (once per jet), and it pushes Juno 3 px/f toward the left wall.
- **Leaping Slam** (every 3rd attack):
  - Crouches 20 f, then jumps off the top of the screen.
  - His shadow tracks Juno for 40 f, then locks (red ring); he lands 16 f later.
  - 18 dmg, KD, radius 26, plus a shockwave ring.
- He keeps the Steam Jet and Piston Punch.

**PHASE 3, "OVERPRESSURE" (≤ 120 HP).**
- The boiler lerps to #FF4A2A with constant steam. Speed ×1.3, cooldowns ×0.7.
- **Meltdown Rush:** two dashes back to back across the screen at 4 px/f, each with a 14 f telegraph (needle pinned at 3 o'clock, red dashed line). 14 dmg, KD each.
- **Overpressure Burst** (every 720 f):
  - WINDUP 45 f: the needle spins; a whistle sweeps 1 → 3 kHz; the screen pulses #B8322A at alpha 0.15.
  - A 360° blast: radius 70, 22 dmg, KD.
  - He is then exhausted for 60 f and takes 1.5x damage.
  - Counter: get out of range, or time Scrap Burst invulnerability (frames 1–24).
- He keeps the Piston Punch. The pressure lanes continue every 300 f.

**Defeat:**
- 30 f freeze, 0.4x for 120 f; the needle snaps off.
- Three staged explosions 30 f apart (5 px shake).
- He kneels, the boiler ruptures, a crack runs up the dam wall, and **THE FIRST BLUE** plays (§12).

---

## 7. Stages

### 7.0 Common
- **Parallax factors:** sky 0, far 0.1, mid 0.35, back wall 1.0, foreground 1.3.
- **Foreground props** are thin silhouettes drawn over actors, at most 8 px wide and spaced at least 300 px apart.
- **"Lock N":** the camera's left edge locks at world x N.
  - Enemies queue and enter up to the wave cap.
  - When the last one dies: GO arrow, camera unlocks, TIME resets to 99.
- **Triggers:** a wave triggers when camX reaches its lock x. Stage intro: Juno auto-walks in for 40 f, then the stage banner shows.
- **Crate drops** marked "→ X" are scripted. Unmarked crates use the random table (§9.2).

### 7.1 STAGE 1: RUST ROW (dusk scrap town, 0–2688)

**Palette:**

| Element | Colours |
|---|---|
| Sky gradient (stops at y 0 / 40 / 80 / 110) | #1E1230 → #6A2A3E → #D2553A → #F2A04A |
| Sun | r22 #FFC46A at screen (290, 96), cut by 3 sky-coloured bands 2 px tall at y 92, 98, 104 |
| Skyline | #3A1E36 |
| Containers | #5A2E2A, #7A4A34, #4A3A44 |
| Fence | #5A4636 / #6B5440, ridges #4A3828 |
| Graffiti | #E8E0D0 |
| Asphalt / cracks / lane paint / sand | #3E3530 / #2A2220 / #8A7A5A / #8C6A44 |
| Fire / bulbs | #FF8A2A, #FFE066 / #FFD27A |

**Parallax layers:**
- **L1 Far (0.1):**
  - 14 rects, 20–50 wide and 30–80 tall, with jagged polygon tops.
  - 1×2 windows in #FFB04A that blink at random (1% per frame).
  - A leaning radio mast drawn in lines, with a red light #FF3B30 blinking every 60 f.
- **L2 Mid (0.35):**
  - Container shanties: 40×18 rects stacked 2–3 high, with corrugation lines every 3 px (20% darker) and skewed polygon roofs.
  - Sagging wires (quadratic curves) strung with bulbs.
  - A water tower (cylinder on 4 legs) painted "DRY".
- **L3 Back wall (1.0):**
  - Corrugated fence panels 48 px wide in alternating colours.
  - A jackal-skull graffiti every 400 px.
  - Doorways (20×40 in #1A1012) at world x 560, 1000, 1880 and 2360.
  - A sign "WATER 5 CAPS" with a red X at x 300.
- **L4 Floor:** crack polylines (seeded per 64 px tile), lane dashes 16×2 every 48 px at y 168, sand-drift ellipses, oil stains.
- **L5 Foreground (1.3):** chain-link posts and hanging rebar in #140C0E every 300 px.

**Props and hazards:**
- **Burning oil barrels** (static, 14×20, with fire): touching the flame deals 6 dmg and a KD to anyone; a knocked-down enemy landing in one takes 10.
- **THE BURNING BUS** (world x 1900–2020, back half of the floor, y 134–150; solid):
  - Body 120×40 in #D9A12B with a stripe #1A1414 and soot blotches.
  - 8 windows 10×10 lit #FF8A1C, flickering.
  - 6 roof flame triangles, 10–22 tall.
  - Smoke circles r6–14 in #4A4040 at alpha 0.6, rising 0.5 px/f.

**Waves:**

| Wave | Lock x | Cap | Spawns | Props and pickups |
|---|---|---|---|---|
| W1 | 0 | 2 | 3 Punk (right edge, 40 f apart). Tutorial strip "J PUNCH  K JUMP  L SPECIAL  WALK INTO FOES TO GRAB" for 240 f. | Crate x 300 → Canned Beans |
| W2 | 480 | 3 | 3 Punk + 1 Knifer. One Punk drops from the container wall (z 60). | Oil drum 620 → Bottle Cap; oil drum 760 → Cactus Fruit; oil barrel fire at 700, y 150 |
| BIKER RUN | 960 | 2 | 3 Road Raiders in lanes y 150, 186, 168, spaced 70 f apart; then 2 Punks. Music drops to bass and drums. | Red fuel drum at 1150, y 190 |
| MID-BOSS | 1344 | — | SLAB (+2 Punks at 50%) | Crate 1290 → Lead Pipe |
| W3 BURNING BUS | 1824 | 4 | 3 Punk exit the bus door 40 f apart; at 300 f, 2 Torchers from the right and 1 Spiker from the left. | Red fuel drums at 1960 and 1990, y 150; fridge 2100 → Roast Rad-Rat |
| BEAT | none (x 2150) | — | **Scorpion foreshadow** (§12) | Oil drum 2180 → Dog Tags (1UP) |
| BOSS | 2304 | — | BIG DIESEL (+2 Punks, 1 Knifer at 50%) | Oil drums at both arena edges → Canned Beans, Bottle Cap |

**Bus explosion:** when W3 is down to 1 enemy, the bus hisses and shakes ±1 for 60 f with a "!" over it. Then it explodes: radius 70 around x 1960, 20 dmg to Juno and 30 to enemies, chaining the drums. After that it is a black husk (#1E1616) that keeps smoking.

**Boss arena:** a garage door with a giant skull on the back wall, and barrel fires at x 2330 and 2660.

### 7.2 STAGE 2: GLASS FLATS (noon desert highway, 0–3072)

**Palette (no blue):**

| Element | Colours |
|---|---|
| Sky | #F6E7B0 → #F0C57A → #E99A5A |
| Sun | #FFF8E0 r14 at (80, 30), halo ring #FFF0B0 at alpha 0.4 |
| Mesas | #C07A4E, shade #A0603C |
| Overpass | #9A8E80 / #B0A494 |
| Airliner fin | #D8D0C4, stripe #B33A2B |
| Dunes / guardrail | #E0AE68 / #8A8A82 |
| Asphalt / dashes / sand / cracks | #8C7C68 / #D4B04A / #E0B070 / #6A5A48 |
| Glass glints | #F0FFF8 |
| Crater (x ≥ 2400) | floor #C88A50, rims #A86A3C / #8A5030, rib bones #E8E0D0 |

**Parallax layers:**
- **L1 (0.08):** mesas with heat shimmer: each 2 px row is shifted by `round(sin(t·0.08 + row·0.7))` px.
- **L2 (0.3):** a broken overpass (pillars, a snapped deck, rebar lines), a half-buried airliner tail, dead Joshua trees #5A4030.
- **L3 (1.0):**
  - A dune-line polygon and guardrail posts every 24 px.
  - Car wrecks (#8A5A3A body, #2A2020 windows); these are solid walls for splats at x 880 and 1640.
  - Glass glints that flash for 1 f every 90 f.
- **L4:** bleached highway, centre dashes, sand creeping in from the top edge.
- **L5 (1.3):** tumbleweeds (scribbled circles #8A6A40 rolling 1 px/f) and cactus silhouettes #4A3A20.

**Sandstorm** (W4 only):
- A wind pushes every grounded non-boss actor −0.4 px/f in x.
- 60 streaks (6–14 px, #E8C080 at alpha 0.5) move −6 px/f.
- A tint of #D9A35E ramps to alpha 0.35 over 120 f; L1 and L2 fade to alpha 0.15.
- **Silhouette rule:** enemies more than 130 px from Juno are drawn as solid #3A2A1A with only their eyes in full colour.
- A "SANDSTORM!" warning band shows for 180 f before it starts.
- The music lowpass closes to 900 Hz and a wind layer is added.

**Waves:**

| Wave | Lock x | Cap | Spawns | Props and pickups |
|---|---|---|---|---|
| W1 | 288 | 2 | 2 Sandstingers that erupt from mounds (the burrow tell is taught). Hint "HAMMER DROP THE MOUND!" for 180 f. | Crate 420 → Cactus Fruit |
| W2 | 720 | 3 | 2 Punk, 1 Knifer, 1 Sandstinger | Car-wreck trunk 880 (breaks like a crate) → Machete |
| RAIDER CONVOY | 1152 | 2 | 2 Road Raiders (the second U-turns), then 2 Spikers | Red fuel drums (1230, 150), (1260, 160) |
| W3 | 1536 | 3 | 2 Ashtail, 1 Bruiser, 1 Torcher | Fridge 1640 → Water Jug; oil drum 1720 → Dog Tags |
| W4 SANDSTORM | 1968 | 4 | 3 Sandstingers (burrowed), 2 Ghouls (first mutants) | Crate 2050 → Molotov ×2 |
| ROAD COLLAPSE | 2400 | 6 | 3 crack polylines grow over 30 f (2 px shake), a 12 f fade, and Juno drops into the crater. 6 Scorplings. | Crate → Canned Beans |
| BOSS | 2688 | — | THE MATRIARCH | Oil drums at both edges → Cactus Fruit, Bottle Cap |

### 7.3 STAGE 3: THE THIRSTY DAM (night refinery, 0–3456)

**Palette:**

| Element | Colours |
|---|---|
| Sky | #070B14 → #141A2C → #2A2438, horizon glow #1E3A2A |
| Moon | r12 #D8E8C8; 30 twinkling 1 px stars #C8C8D8 |
| Dam / towers | #3A4050 / #22262E |
| Pipes | #3A424E, #4A525E, highlight #6A7480 |
| Toxic glow / flares | #3BFF8A, #4CFF7A / #FF7A2A |
| Hazard stripes | #D4A82A / #1A1A1A |
| Grating / grid | #2C3038 / #3A404A |
| Banner | #5A1E1E with a valve symbol #D4AF37 |
| Final arena | concrete #6A6A6A, railings #3A3A3A, reservoir #1E5AA8 / #2E7FD8 / #8EC8FF |

**Parallax layers:**
- **L1 (0.1):** a curved dam wall, spillway lights #FFD27A, a giant King Valve banner.
- **L2 (0.35):**
  - Refinery towers and flare stacks with flickering flame triangles.
  - Catwalks and green leak drips.
  - 2 searchlights (triangles #FFF2C0 at alpha 0.12) sweeping ±30° over 240 f.
- **L3 (1.0):** a pipe wall with valve wheels, glowing vats (rounded rects with bubbling circles), hazard-stripe panels, doorways.
- **L4:** grating with an 8 px grid and rivets.
- **L5 (1.3):** hanging chains and pipes in #0A0C10.

**Hazards:**
- **Toxic puddles:** ellipses 30×8 in #3BFF8A at alpha 0.5 with bubbles. 2 dmg per 20 f to Juno; Ghouls regenerate in them.
- **Steam vents:** 24×6 grates on a 180 f cycle.
  - 40 f telegraph: hiss, wisps, the grate tints #FF8A3D.
  - Then a 30 f column 28 wide and 60 tall (#E8ECEF at alpha 0.7): 10 dmg, KD to everyone.

**Waves:**

| Wave | Lock x | Cap | Spawns | Props and pickups |
|---|---|---|---|---|
| W1 | 288 | 3 | 3 Ghouls (one climbs out of a vat: spawns at z 30 at the back wall) | Crate 400 → Canned Beans; toxic puddle (500, 170) |
| W2 BLOATER BOMB | 720 | 3 | 1 Bloater placed between 2 Ghouls (taught chain blast), then 1 Bloater + 2 Punks | Oil drum 800 → Bottle Cap; red fuel drum (860, 150) |
| VENT CORRIDOR | none (1000–1300) | 2 | Vents at 1040, 1120, 1200, 1280, cycles staggered 45 f. 2 Ghouls follow Juno. | — |
| W3 | 1344 | 3 | 2 Kiln Troopers, 1 Spiker, 1 Knifer | Crate 1300 → Stop-Sign Axe |
| W4 VAT ROOM | 1776 | 4 | 2 Ghouls from vats, 1 Bloater, 1 Torcher; then 2 Ghouls, 1 Ashtail | Fridge 1720 → Roast Rad-Rat; 2 toxic puddles; vent at 2000 |
| W5 | 2256 | 4 | 1 Kiln, 1 Bruiser, 1 Bloater, 1 Ashtail, 2 Ghouls | Crate → Water Jug; oil drum 2420 → Dog Tags |
| W6 DAM STAIRS | 2688 | 3 | 2 Kiln Troopers, 2 Punks. Searchlights sweep the floor; the back wall becomes concrete #5A5E66 with diagonal stairs. | Crate → Molotov ×2 |
| FINAL BOSS | 3072 | — | KING VALVE | Oil drums at both edges → Canned Beans, Cactus Fruit |

**Final arena:**
- Concrete deck #6A6A6A with railing posts #3A3A3A every 24 px at y 132.
- Behind it, the reservoir band y 100–132: #1E5AA8 base with #2E7FD8 shimmer lines moving 0.3 px/f.
- The floodgate wheel at back centre: r20, 6 spokes, #5A626C.

---

## 8. Hazards and explosions (shared)
| Hazard | Size / timing | Damage | Affects |
|---|---|---|---|
| Fire patch (molotov, Torcher) | 40×12 ellipse, 90 f | 6 dmg T2 every 30 f per actor | all |
| Oil-barrel flame | 14×10 on the barrel | 6 dmg KD | all |
| Red fuel drum | 2 hits → 10 f flash → explosion r36, depth 14 | 20 Juno / 30 enemies, T3 KD | all; sets off drums within 40 px after 10 f; a thrown body detonates it instantly |
| Bus explosion | r70 | 20 / 30 | all |
| Bloater blast | r44, depth 16 | 18 | all |
| Kiln death | r28 | 12 | all |
| Bike explosion | r30 | 20 | all |
| Acid puddle | 24×8, 120 f | 3 per 20 f | Juno |
| Gas cloud | puffs r6–10, 120 f | 4 per 15 f | Juno |
| Toxic puddle | 30×8 | 2 per 20 f | Juno (Ghouls heal) |
| Steam vent | 28×60 column, 30 f | 10 KD | all |
| Water jet | lane, 40 f | 8 + push 3 px/f | Juno |

---

## 9. Pickups

### 9.1 Breakables
Any attack hits a breakable. Each has a ±10 px hurtbox, blocks movement and is depth-sorted.
- **Wooden Crate:**
  - 20×18 planks in #8B5A2B, X brace #5A3A1A, nail dots #C9A86A.
  - 2 hits; bursts into 6 plank shards (2×6, rotating).
- **Oil Drum:**
  - 14×20 in #5E6B73, bands #3E474D, rust streak #8C5A3C.
  - 3 hits, a clank on each; the top tilts 2° more per hit.
- **Red Fuel Drum:** 14×20 in #B8322A, bands #6A1A16, a white flame-icon label. Holds no item.
- **Fridge:**
  - 18×30 in #D8D4C4, rust spots #A06A40, handle #8A8A8A.
  - 3 hits; the door flies off. Always contains food.

Contents pop out with a hop (vz 2.0).

### 9.2 Random table (unscripted crates and drums)
- 40% food: Cactus Fruit 40%, Beans 40%, Rad-Rat 15%, Water Jug 5%.
- 35% score item: Cap 60%, Pouch 30%, Watch 10%.
- 25% weapon: Pipe 50%, Machete 30%, Molotov 20%.

### 9.3 Items
| Item | Effect | Look |
|---|---|---|
| Cactus Fruit | +15 HP | 6×5 oval #E85C9A, 3 dots #6A9A3A |
| Canned Beans | +30 HP | 6×8 can #B0B6BC, label #D94B2B, top ellipse |
| Roast Rad-Rat | +50 HP | 10×6 oval #8A4A22, tail curve, stick #C9A86A |
| **Water Jug** | full heal, clears grey and venom | 8×10 jug: water #2E7FD8, highlight #8EC8FF, cap #F2EEE0, white glint every 30 f |
| Bottle Cap | +500 | 8-point jagged polygon r3 #E8C547, centre dot #B8322A |
| Cap Pouch | +1500 | sack #8A6A3A with string #C9A86A |
| Pre-War Watch | +3000 | circle r3 #D4AF37 with straps #5A3A1A |
| Dog Tags (Teo's) | +1 life | 2 rounded rects #C8CCD0 on a dotted chain |

**Food rules:** food never despawns. Pickup plays a C5–E5–G5 arpeggio and floats "+HP" text in #7BE04A.

**Score item rules:** score items blink for their last 120 f and despawn after 600 f.

**Weapon looks:**
- Lead Pipe: 3×22 in #8A929C, joint #5E666E.
- Machete: blade 3×16 in #D8DCE0, handle #3A2A1A.
- Stop-Sign Axe: pole 2×26 in #8A8A8A with an octagon r7 #C8322A, rim #F2EEE0.
- Molotov: bottle 4×8 in #6A8A3A at alpha 0.8, rag #E8E0D0, flickering flame.

Floor weapons bob 1 px and flash a white glint every 40 f.

### 9.4 Scoring
- **Per hit:** damage × 10.
- **Kills:** per the enemy table. Bosses: SLAB 3000, Diesel 10,000, Matriarch 20,000, King 50,000.
- **Combo bonus:** §4.6.
- **Stage clear:**
  - TIME BONUS = remaining TIME × 100.
  - VITALITY BONUS = HP × 50.
  - NO-DAMAGE BONUS = +5000 for a stage with no damage taken.
- **Game clear:** NO-CONTINUE BONUS 30,000, plus 10,000 per remaining life.
- **Rank:**

| Rank | Requirement |
|---|---|
| S | ≥ 200,000 and no continues |
| A | ≥ 140,000 |
| B | ≥ 80,000 |
| C | anything below |

Any continue caps the rank at B.

---

## 10. UI

### 10.1 Fonts
- "Press Start 2P" at 8 px (16 px for big numbers) for all HUD text.
- "Bungee" for the logo and banners.
- Fallback: monospace.
- All HUD text gets a 1 px #140C0A outline, drawn as a stroke before the fill.

### 10.2 Title screen
- **Background:** the Stage 1 sky with a large striped sun (r34 at 192,112) and the skyline drifting at 0.1 px/f. A dune silhouette in #1E1230 covers y 150–216. Juno stands on a wrecked car roof at (110,150) with her scarf flapping. Dust specks drift diagonally.
- **Logo:** "RUSTFIST" in Bungee 40 px centred at y 34.
  - Fill: a vertical gradient #FFE08A → #E2591E.
  - 2 px outline #1A0E0A and a 3 px drop shadow #140C0A.
  - 3 rust-drip rects under the letters.
  - On boot it drops from y −40 over 20 f, then: 6 f hitstop, 3 px shake, clang.
- **Subtitle:** "BRAWL FOR THE LAST WELL" in 8 px #E8E0D0 at y 84.
- **Prompt:** "PRESS ENTER" (or "TAP TO START" on touch), blinking 30 f on / 30 f off at y 170 in #FFE08A. The first input creates or resumes the AudioContext.
- **Menu** (gauntlet-icon cursor): START GAME, HOW TO PLAY, SOUND: ON/OFF.
  - The HOW TO PLAY card lists the keys, "DOUBLE-TAP TO RUN", "WALK INTO FOES TO GRAB", "L = SCRAP BURST (COSTS HP, WIN IT BACK BY HITTING)", "FORWARD+J ON 4TH HIT = PISTON STRAIGHT" and a touch-layout diagram.
- **Footer** at y 204 in 8 px #A08060: "HI 0050000" on the left, "© 2097 SCRAPWORKS" in the centre, "CREDITS 3" on the right.
- After 20 s idle, a TOP 5 table shows for 6 s.

### 10.3 HUD (y 0–22, on a #000 band at alpha 0.45)
| Element | Position | Spec |
|---|---|---|
| Portrait | 18×18 at (4,2) | frame #E8E0D0, background #3A2A20; face circle, bandana stripe, goggles; grimace for 20 f on hit |
| Name | (26,3) | "JUNO" in #FFE08A |
| Lives | (66,3) | "×3" in #E8E0D0 |
| HP bar | 96×6 at (26,12) | outline #140C0A, empty #4A1010, fill #F2C14E (blinking #E2591E below 30); grey segment #9A9A9A; white damage trail drains 1 px per 2 f; venom fill #9BE15D |
| Weapon slot | 14×14 at (126,3) | icon plus durability pips at (126,18), 1 px each, #F2C14E |
| TIME | centred x 192, y 3 | 16 px, #FFE08A; below 10 turns #FF3B30 and beeps every second |
| Enemy info | name at (212,3) in #FF8A6A; bar 80×6 at (212,12) in #E2591E; "×2" at (296,12) | shown for 120 f after a hit |
| Score | right-aligned at x 380, y 3 | 7 digits #FFFFFF, "1P" label #FFE08A; rolls up by max(1, diff/8) per frame |
| Combo | (334,30) | §4.6 |
| Boss bar | name at (72,203) in 8 px #FFE08A; bar 240×7 at (72,206); "×3" at (316,206) | layered colours, the current layer drawn over the next layer's colour |
| GO arrow | 28×20 polygon at (344,96) in #FFE14A, outline #1A0E0A, "GO!" above | blinks 20 f on / 20 f off; double 880 Hz beep, repeated every 120 f until Juno moves |

### 10.4 Story cards
- **Layout:** black screen with a 200×96 vignette panel at (92,16), drawn as code silhouettes in 2–3 colours. Text box at (24,128): up to 4 lines, 8 px #E8E0D0, at most 40 characters per line, 12 px line height.
- **Typing:** 1 character per 2 f, with a tick on every 2nd character. The first press completes the text; the second press advances.
- **Cards:**
  1. **Intro A** (vignette: burning convoy):
     - "YEAR 2097. FORTY YEARS AFTER THE FLASH."
     - "WATER IS MONEY. MONEY IS BLOOD."
     - "KING VALVE OWNS THE LAST DAM."
  2. **Intro B** (vignette: gauntlet clenching):
     - "HIS JACKALS BURNED MY CONVOY."
     - "TOOK MY BROTHER. TOOK MY ARM."
     - "SO I BUILT A NEW ONE."
  3. **Before Stage 2** (vignette: scorpion silhouette on a dune, red eyes):
     - "THE KING'S ROAD CROSSES THE GLASS FLATS."
     - "NOTHING LIVES OUT THERE."
     - "NOTHING BUT THE STINGERS."
  4. **Before Stage 3** (vignette: dam silhouette with green glow):
     - "HOLLOW DAM. HIS REFINERY BOILS THE"
     - "POISON OUT OF THE RIVER... AND INTO"
     - "THE PEOPLE WHO WORK IT."
  5. **Ending** (vignette: Juno and Teo silhouettes, rain as 1×4 lines in #8EC8FF):
     - "THE WATER FLOWS FREE."
     - "TEO TURNED THE WHEEL."
     - "THE FIST NEEDS OIL. IT CAN WAIT."

### 10.5 Banners and cards
- **Stage banner:** "STAGE 1" in 8 px over the stage name in Bungee 20 px. Slides in from the left over 20 f, holds 80 f, slides out.
- **Boss card:**
  - The screen darkens 30% and 20 px letterbox bars slide in.
  - The name shows in Bungee 16 px #FFE08A with an 8 px epithet, for 90 f.
  - Text: "SLAB / CHAIN ENFORCER", "BIG DIESEL / JACKAL WARCHIEF", "THE MATRIARCH / QUEEN OF THE FLATS", "KING VALVE / THE THIRST KING".
- **Warning band:** a 384×16 band at y 100 in #B8322A flashes 3 times with white text ("SANDSTORM!") and a siren.
- **Stage clear:** "STAGE CLEAR!" in Bungee 20 px; Juno does the victory pose and says a one-liner in a speech box ("NEXT." / "WATER'S THAT WAY." / "STINGS. DIDN'T KILL ME."). The bonuses count up 5 f per step with a blip each step.

### 10.6 Pause, continue, victory
- **Pause** (Enter or the pause button):
  - Overlay #000 at alpha 0.6; "PAUSE" in Bungee 24 px.
  - Options: RESUME / SOUND / QUIT TO TITLE.
  - Music lowpass to 600 Hz, gain ×0.4.
- **Continue:**
  - "CONTINUE?" in Bungee 24 px at y 70.
  - A digit counting 9 → 0 in Bungee 40 px at y 130, one per 60 f with a tick.
  - Juno lies in the sand while 2 vultures (V shapes in #1A1012) circle.
  - J, Enter or a tap continues at the current wave with 3 lives and full HP. The score is kept and "CREDITS n" decrements.
  - With 0 credits, or when the countdown reaches 0: "GAME OVER" for 120 f, then high-score entry, then the title.
- **Victory:**
  - The flood sequence plays, then the Ending card.
  - Results screen: TIME, MAX COMBO, KOs, CONTINUES, then SCORE, each line counting up.
  - RANK stamps in (scale 3 → 1 over 8 f, 3 px shake, clang).
  - Then high-score entry: 3 letters, up/down cycles A–Z, ".", space; J confirms.
  - The top 5 are stored in `localStorage["rustfist_hi"]` inside try/catch, defaulting to 50,000.

### 10.7 Touch controls
- **When shown:** on the first `touchstart`, or when `(pointer: coarse)` matches.
- **Overlay:** a separate overlay canvas at device resolution, with multi-touch. In landscape it covers the canvas corners; in portrait the game is letterboxed to the top and the controls sit below it.
- **D-pad:**
  - Base circle r56 CSS px at (84, H−84), #FFF at alpha 0.12, stroke at alpha 0.3.
  - Knob r22 follows the thumb, clamped to the base.
  - Dead zone 12; 8-way, snapped to 45°.
  - A horizontal double-tap within 250 ms runs.
- **Buttons** (alpha 0.35, or 0.6 while pressed):
  - A (attack): r34 at (W−76, H−70), #E2591E.
  - B (jump): r28 at (W−150, H−48), #8FB0C0.
  - S (special): r24 at (W−66, H−150), #F2C14E.
  - Sliding a thumb between buttons presses the new button.
- **Pause button:** 40×28 at (W−52, 12).
- **Vibration:** `navigator.vibrate(8/15/30)` on T2, T3 and KO hits where supported.
- **Keyboard:** arrows/WASD move, J attack, K jump, L special, Enter start/pause.

---

## 11. Audio (all WebAudio)

### 11.1 Engine
- One AudioContext, created on the first input.
- **Routing:**
  - music bus (gain 0.32, through a lowpass at 20 kHz used for the sandstorm and pause duck)
  - SFX bus (gain 0.8)
  - both into master (0.7) → DynamicsCompressor (−14 dB, ratio 4) → destination.
- One shared 1 s white-noise buffer.
- **Sequencer:** 16th-note steps, a 25 ms setInterval with 100 ms lookahead. Patterns are arrays of note names, with `.` for a rest and `-` for a tie.
- **Note envelope:** 5 ms attack, decay to 0.6 over 80 ms, 40 ms release.
- **Ducking:** the music ducks to 30% for 300 ms on a KO, wave-final KO, explosion or boss intro.
- **Pitch variation:** every SFX gets ±6% random pitch. Hit SFX also get the combo climb (§4.6).

**Instruments:**

| Instrument | Synthesis |
|---|---|
| LEAD | square (or a 25% pulse via PeriodicWave) |
| BASS | sawtooth → lowpass 900 Hz |
| DIST | sawtooth → WaveShaper (k = 20) → lowpass 1.2 kHz |
| TRI | triangle |
| KICK | sine 150 → 40 Hz over 120 ms |
| SNARE | noise → bandpass 1.8 kHz for 120 ms, plus a triangle at 180 Hz for 60 ms |
| HAT | noise → highpass 7 kHz, 30 ms |
| TOM | sine 200 → 100 Hz over 200 ms |
| CLANK | squares 523 + 740 Hz, 80 ms decay |
| CRASH | noise → highpass 4 kHz, 600 ms |

### 11.2 Tracks

**TITLE, "Dust on the Wind":** 84 BPM, A minor, 8 bars.
- TRI melody (quarters, through a DelayNode 0.33 s, feedback 0.35):
  - Bars 1–4: `A4 C5 E5 D5 | C5 B4 A4 - | F4 A4 C5 B4 | G4 E4 - -`
  - Bars 5–8: the same melody an octave higher.
- BASS whole notes: `A2 | F2 | G2 | E2` (repeat).
- Wind: noise → bandpass sweeping 300–900 Hz on a 0.1 Hz LFO, gain 0.06.

**STAGE 1, "Rust Row":** 132 BPM, E minor. Chords Em–C–D–B, 2 bars each (8-bar loop).
- BASS 8ths, octave pump: `E2 E3 E2 E3 E2 E3 E2 E3` per bar on Em; the same pattern on C2, D2 and B1.
- LEAD 8ths (square, gain 0.12):
  - Bar 1: `E4 G4 A4 B4 D5 - B4 -`
  - Bar 2: `A4 G4 E4 - - - - -`
  - Bar 3: `E4 G4 A4 B4 C5 - B4 -`
  - Bar 4: `G4 E4 G4 - - - - -`
  - Bar 5: `F#4 A4 B4 D5 E5 - D5 -`
  - Bar 6: `B4 A4 F#4 - - - - -`
  - Bar 7: `D#4 F#4 B4 D#5 F#5 - E5 D#5`
  - Bar 8: `B4 - - - F#4 - D#4 -`
- On the 2nd pass the lead goes up an octave, with a second square a diatonic third below.
- Drums (16 steps per bar):
  - KICK steps 1, 7, 9
  - SNARE 5, 13
  - HAT every step at gain 0.05, every 4th accented to 0.09
  - CRASH bar 1
- **Biker Run variant:** the lead and hats mute; bass and kick only.

**STAGE 2, "Glass Flats":** 112 BPM, D Phrygian dominant, 4-bar loop.
- TRI drone D2 throughout.
- LEAD-square bass 8ths: `D2 D2 A2 D2 D2 Eb2 D2 A1`.
- TRI lead with vibrato (5.5 Hz LFO, ±4 Hz):
  - Bar 1: `D4 Eb4 F#4 G4 A4 Bb4 A4 G4`
  - Bar 2: `F#4 Eb4 D4 - - - - -`
  - Bar 3: `A4 Bb4 C5 Bb4 A4 G4 F#4 G4`
  - Bar 4: `A4 - - - Eb4 - D4 -`
- Hand drum: TOM at 140 → 70 Hz in the pattern `x..x..x.x...x...`.
- Shaker: noise → highpass 5 kHz in 16ths at gain 0.03.
- **Sandstorm:** the music lowpass sweeps to 900 Hz over 3 s; wind noise → lowpass 500 Hz fades to gain 0.2.

**STAGE 3, "Thirsty Dam":** 144 BPM, C minor, industrial. Chords Cm–Ab–Bb–G, 2 bars each.
- DIST bass 16ths per bar: `C2 C2 C3 C2 C2 C2 Eb2 C2 C2 C2 C3 C2 G1 G1 Bb1 C2`, transposed to the roots Ab1, Bb1 and G1.
- LEAD arpeggio 16ths at gain 0.08: `C4 Eb4 G4 C5 G4 Eb4` cycling.
  - Ab: `Ab3 C4 Eb4 Ab4 …`
  - Bb: `Bb3 D4 F4 Bb4 …`
  - G: `G3 B3 D4 G4 …`
- KICK four on the floor. CLANK on beat 4. Noise → bandpass 3.2 kHz (Q 8, 60 ms) on the off-beat 8ths. SNARE on 2 and 4.

**BOSS, "Warchief"** (SLAB, Diesel, Matriarch): 152 BPM, B minor, 4 bars.
- BASS 8th octaves climbing chromatically: bar 1 `B1 B2 …`, bar 2 `C2 C3 …`, bar 3 `C#2 C#3 …`, bar 4 `D2 D3 …`.
- LEAD 16ths diminished arpeggio: `B3 D4 F4 G#4` cycling, going up an octave in bars 3–4.
- KICK on every quarter. SNARE on 2 and 4. A TOM roll (4 sixteenths) on the last beat of bar 4. CRASH on bar 1.

**FINAL BOSS, "The Thirst King":** 164 BPM, C# minor. Chords C#m–A–F#m–G#, 1 bar each.
- DIST bass 8ths on the roots: `C#2 C#3 C#2 C#3 …`, then A1, F#1, G#1.
- Saw lead doubled (+7 cents) in quarters/8ths:
  - Bar 1: `C#5 - E5 G#5 | G#5 F#5 E5 -`
  - Bar 2: `C#5 - B4 A4 | E5 - - -`
  - Bar 3: `A4 - C#5 F#5 | F#5 E5 C#5 -`
  - Bar 4: `G#4 - B#4 D#5 | G#5 - - -`
- Pad: two detuned sawtooths → lowpass 1.2 kHz, 300 ms attack, holding each chord.
- **Phase 2** adds 16th hats. **Phase 3** switches the hats to 32nds and adds a siren (sine 600 ↔ 900 Hz, 1 Hz LFO, gain 0.06).

**Jingles:**
- **Stage Clear:** square `C5 E5 G5 C6` in 16ths, then a C5/E5/G5 chord held 600 ms (1.6 s total).
- **Game Over:** TRI `A4 F4 D4 A3`, 400 ms each, as the lowpass closes.
- **1UP:** square `G5 B5 D6 G6` at 60 ms each.
- **Victory:** C major, 132 BPM, 8 bars: lead `C5 E5 G5 C6 | B5 G5 E5 G5 | A5 F5 C5 F5 | G5 - - -` (twice), plus the Stage 1 drums.
- **Boss sting:** low sawtooth cluster (C2, C#2, D2) for 1 s, plus a noise swell → lowpass 200 → 2000 Hz.
- **Continue tick:** sine 880 Hz, 40 ms.

### 11.3 SFX
**Combat:**
- **Whoosh** at the start of every attack: noise → bandpass sweeping 2200 → 700 Hz over 80 ms, gain 0.15. Heavy moves sweep 1600 → 400 Hz over 120 ms.
- **T1:** noise 40 ms → highpass 1500 Hz, plus a square blip at 260 Hz for 30 ms. Gain 0.35.
- **T2:** noise 70 ms → bandpass 900 Hz (Q 1.5), plus a sine 180 → 80 Hz over 90 ms. Gain 0.5.
- **T3:** noise 120 ms → lowpass 1800 Hz, plus a sine 120 → 40 Hz over 160 ms through a soft-clip WaveShaper, plus a 20 ms noise crack at 3 kHz. Gain 0.7.
- **KO:** the T3 sound plus a sine 60 → 30 Hz over 300 ms.

**Material layers** (added on top of the tier sound):
- **Clank** (armour, drums): squares 620 + 873 Hz with a 120 ms exponential decay, plus a noise tick.
- **Chitin:** 3 noise ticks 15 ms apart → bandpass 2.5 kHz.
- **Squelch:** sine 300 → 120 Hz with a 20 Hz wobble, 100 ms.
- **Gang slap:** noise → highpass 2500 Hz, 20 ms.

**Juno:**
- Jump: square 220 → 440 Hz, 60 ms. Land: noise → lowpass 400 Hz, 50 ms.
- Grab: noise 30 ms plus a sine at 150 Hz.
- Body thud: sine 90 → 40 Hz over 140 ms, plus noise → lowpass 300 Hz.
- Special: sawtooth 200 → 800 Hz over 100 ms, then T3, then a 60 Hz boom for 250 ms.
- Hurt: square 300 → 150 Hz, 100 ms. Death: square 400 → 80 Hz over 600 ms with 6 Hz vibrato.
- Wall splat: T3 plus a clank.

**Enemies:**
- Grunt: sawtooth 140–220 Hz → bandpass 800 Hz, 90 ms, pitch −30%.
- "HEY!": sawtooth 220 Hz through two bandpasses (700 and 1200 Hz), 120 ms.
- Knife shing: sines 3.2 + 4.1 kHz, 150 ms decay.
- Tail whine: sine 400 → 1200 Hz across the telegraph, gain 0.1.
- Scorpion click-rattle: noise amplitude-modulated by a 25 Hz square LFO.
- Mutant groan: sawtooth 70 Hz, ±10 Hz at 6 Hz, → lowpass 500 Hz, 400 ms.
- Bloater inflate: sine 200 → 600 Hz with tremolo. Fuse beep: 1 kHz square, interval shrinking from 6 f to 2 f.
- Engine: sawtooth 55 → 110 Hz with an 18 Hz amplitude LFO, panned by screen x through a StereoPanner, pitch −30% after it passes.
- Flamethrower: looped noise → lowpass 1.2 kHz with random crackle ticks.
- Rumble: noise → lowpass 120 Hz plus a 40 Hz sine.
- Molotov shatter: noise → highpass 3 kHz for 120 ms, plus sines 2400 + 3100 Hz for 150 ms.

**Environment:**
- Explosion: 600 ms noise → lowpass sweeping 3000 → 200 Hz, plus a sine 80 → 30 Hz over 400 ms through a WaveShaper.
- Steam: noise → highpass 2 kHz, swelling.
- Water jet: noise → lowpass 900 Hz, plus a 200 Hz sine with random 8–15 Hz FM.
- Crate break: 3 noise bursts through bandpasses at 600 Hz and 1.2 kHz.

**UI:**
- Food: square `C5 E5 G5` at 40 ms each.
- Score item: square 988 Hz, then 1319 Hz.
- Weapon pickup: clank plus a 660 Hz blip.
- GO: two 60 ms squares at 880 Hz.
- Timer warning: square 1 kHz, 50 ms.
- Menu move: 660 Hz, 20 ms. Menu OK: 880 → 1320 Hz chirp.
- Type tick: square 1.2 kHz, 8 ms, gain 0.05.
- Combo banner: rising 3 notes (`E5 G5 C6`).

---

## 12. Signature moments
1. **BIKER RUN (Stage 1, lock 960).**
   - The music drops to bass and kick.
   - Red "!" arrows and headlight cones sweep the fence while engines snarl across the stereo field.
   - Jump-kicking a rider sends the bike tumbling into the red fuel drum at 1150, and the block goes up.
2. **THE BURNING BUS (Stage 1, W3).**
   - Jackals pour from the door of the flaming bus while Torchers lob from the right.
   - At the last enemy, the bus hisses and shakes under its "!" for 60 f.
   - Knocking the last Jackal into the radius gives an r70 blast that chains the two drums into a second boom, leaving a smoking husk.
3. **SOMETHING UNDER THE ROAD (Stage 1, x 2150, no lock).**
   - A lone Punk sprints at Juno yelling "HEY!".
   - At 60 px away, a giant pincer (the scorpion claw part at k = 2.5, #9A4A22) bursts from the sand on the near edge, grabs him, and drags him down over 30 f in a sand spray.
   - His pipe drops as a pickup. There is no text.
4. **EYES IN THE SANDSTORM (Stage 2, W4).**
   - Everything beyond 130 px becomes a silhouette with glowing eyes, the wind drags Juno left, and mounds slide toward her.
   - Two Ghouls with yellow pinpoint eyes shamble out of the haze as the first mutants.
5. **THE STINGER IN THE ROAD (Matriarch).** The reticle tracks Juno and then locks. A sidestep means the stinger buries itself, giving 70 f of 2x damage while Scorplings pour out behind her: greed or safety.
6. **BLOATER BOMB (Stage 3, W2).**
   - The Bloater spawns between two Ghouls.
   - Kill it, grab the fusing body and toss it: the blast bowls the Ghouls into the red fuel drum, the chain detonates, "CHAIN POP!" and the combo turns orange.
7. **THE FIRST BLUE (finale).** After King Valve's three blasts:
   - A crack polyline runs up the dam over 40 f.
   - A wall of water (polygon #2E7FD8 with a foam edge #E8F4FF and spray particles #8EC8FF) floods from the right at 6 px/f, rising to y 190 and washing surviving adds off the left edge.
   - Rain falls as 1×4 lines in #8EC8FF.
   - Juno raises the gauntlet, steam hisses, Teo spins the floodgate wheel, and the victory fanfare plays.
   - It is the first saturated blue since the last Water Jug.

---

## 13. Build plan (~3,500 lines of JS)
| Module | Lines |
|---|---|
| Boot, loop, accumulator, hitstop/slowmo, input (keyboard plus touch overlay) | 300 |
| Camera, locks, wave director, spawn queue, tokens | 280 |
| Humanoid rig, pose tables, per-type look data | 420 |
| Scorpion rig, blob rig (Bloater) | 180 |
| Juno controller (moves, grab, weapons, special, grey HP) | 450 |
| Enemy AI (shared FSM plus 12 type scripts) | 520 |
| Bosses (SLAB data-only, Diesel, Matriarch, King Valve) | 420 |
| Combat resolution, feel (tiers, shake, splat, bowling, juggle), particles | 300 |
| Hazards, breakables, pickups, projectiles | 200 |
| Backgrounds (3 stages × 5 layers, sandstorm, flood) | 300 |
| HUD, menus, cards, banners, results, high score | 260 |
| Audio engine, sequencer, track data, SFX | 300 |
| **Total** | **~3,930** |

**If over budget, cut in this order:**
1. Ashtail (its waves use Sandstingers instead).
2. The Road Raider U-turn.
3. Ghoul Second Wind.
4. Back Fist.

Never cut the Sandstinger, Punk, Bruiser, Ghoul, Bloater, Torcher or any of the 3 stage bosses.