# VOIDPATH: design brief (proof of concept)

A 2D-HD RPG vertical slice in the style of *Octopath Traveler*, set aboard a derelict colony ship.
No story yet. The goal is to **show the graphics and the core gameplay**: exploration of a lit
diorama, random encounters, and Octopath's Break/Boost turn-based battles.

## The 2D-HD look (non-negotiable pillars)

"2D-HD" means **pixel-art sprites and pixel-art textures living in a real 3D space with HD lighting
and lens effects**. Every module must serve these pillars:

1. **Pixel art everywhere, crisp.** All textures are procedurally painted pixel art (`src/art/painter.js`),
   nearest-filtered, at a constant density of **32 texture pixels per world unit** (PX_PER_UNIT).
   Characters are ~1.5 units tall in the field (32x48 frames).
2. **Diorama camera.** Narrow-FOV perspective camera (~28-34 deg) pitched down ~30-38 deg, following the
   player smoothly. The world reads like a miniature model on a table.
3. **Tilt-shift depth of field.** The top and bottom bands of the screen blur strongly; a horizontal
   band around the player stays sharp. This is the single most recognisable Octopath effect.
4. **HD light on pixel sprites.** Sprites are lit planes (MeshStandardMaterial) with auto-generated
   normal maps, so colored point lights rim-light them. Emissive pixels (visors, LEDs, screens,
   lamps) bloom.
5. **Bloom + glow.** Lamps, screens, reactor cores, muzzle flashes and spell effects bloom softly.
6. **Atmosphere.** Exponential fog, floating dust motes, volumetric light shafts from windows, sparks,
   steam, flickering lamps, a rotating red alarm light.
7. **Grade.** Vignette, gentle contrast, cool shadows / warm highlights, faint film grain, very
   slight chromatic aberration at the screen edges.
8. **Dynamic shadows.** One shadow-casting key light per scene plus soft blob shadows under every actor.

## Setting and areas

The colony ship **ISV Halcyon** drifts on emergency power above a ringed gas giant. Sci-fi palette:
cold steel-blue interiors, amber work lamps (our stand-in for Octopath's warm torchlight), cyan
instrument glow, magenta/red warning light. Four connected areas on one map:

| Area | Mood | Light | Notable props | Encounters |
|---|---|---|---|---|
| **Cryo Deck** (start) | quiet, cold, frosty | pale cyan pods, dim blue fill | rows of cryo pods, frost particles, save Med-Station, robot NPC **BOLT** | none |
| **Spine Corridor** | long hull corridor | light shafts through panoramic windows (gas giant + rings, drifting stars), pools of amber lamp light, one flickering lamp | windows, benches, wall consoles, signage | Sec-Drones |
| **Engineering Bay** | hot, industrial, alarm | pulsing orange/magenta reactor core column, rotating red alarm light, glowing floor grates | reactor, pipes, steam vents, sparking broken conduit, crates, lockers | Crawlers, Drones, Turrets |
| **Observation Bridge** | grand, still | huge window, holographic star-map table, cool moonlight from the planet | captain's chair, hologram AI **HALCYON**, boss **SENTINEL** | boss only |

The bridge door is locked until the **Bridge Keycard** is found in an Engineering supply crate.
Beating the Sentinel shows a "Proof of concept complete" screen with play stats.

## Party (four travelers)

| id | Name | Class | Weapons | Elements | Look |
|---|---|---|---|---|---|
| `kade` | KADE | Vanguard | blade, lance | volt | navy plate armor, amber visor strip, short white hair, cape scarf |
| `nyx` | NYX | Gunslinger | rifle, blade | cryo, void | dark long coat, teal ponytail, cyan eye-lens, long rifle |
| `orion` | ORION | Technomancer | gauntlet | thermal, cryo, volt | violet tech-robe with glowing circuit lines, copper hair, floating orb drone |
| `sera` | SERA | Medic | lance | photon | white/cyan medic suit, pink bob hair, holo-halo, staff-like photon lance |

## Battle rules (Octopath-faithful)

- **Damage types (9):** weapons `blade`, `lance`, `rifle`, `gauntlet`; elements `thermal`, `cryo`,
  `volt`, `photon`, `void`.
- **Turn order:** each round, all living combatants act in descending SPD (small random jitter).
  The UI shows the current round's order and a preview of the next round.
- **Boost Points (BP):** each party member starts the battle with 1 BP and gains +1 at the start of
  every round **unless they boosted in the previous round**; max 5. Before acting, spend 0-3 BP:
  a boosted basic attack hits `1 + boost` times; a boosted skill gets more potency
  (x1.0 / x1.5 / x2.0 / x2.5 at boost 0/1/2/3; healing too); multi-hit skills add hits instead
  where that reads better.
- **Shields and weaknesses:** each enemy has a shield count and 2-4 weaknesses. Each *hit* of a
  type the enemy is weak to removes 1 shield point and does x1.3 damage. Weaknesses are hidden
  ("?") until hit with that type.
- **Break:** at 0 shield the enemy is **BROKEN**: it loses its remaining action this round and
  all actions next round, takes **x2 damage**, then recovers with a full shield at the start of the
  round after that. Breaking is the core loop: find weaknesses, break, then dump boosted attacks.
- **Defend:** halves damage taken until the actor's next turn, and that actor moves first next round.
- **Flee:** allowed outside boss fights, 70% success.
- **Damage formula (guide):** physical `max(1, (ATK*power*2.2 - DEF*1.1) * rand(0.92..1.08))`,
  elemental the same with MAG/RES. Crits on physical (8%, x1.5). Weak x1.3, broken x2.
- **Enemies** act with simple weighted AI; the boss acts twice per round, telegraphs its heavy
  attack one round ahead ("SENTINEL locks on to NYX!") and gains +2 max shield after each Break.
- Battles should last 2-4 rounds (regular) and 6-10 rounds (boss) when played sensibly.

## Feel

- Snappy: an action resolves in about 1-1.6 s; menus respond instantly; damage numbers pop with
  weight; a Break freezes the frame for a beat (hit-stop), flashes and shatters the shield icon.
- Everything has sound (procedural WebAudio): cursor ticks, confirms, hits, shield cracks, the
  Break shatter, heals, and looping music for title, exploration, battle and boss.
- Works with keyboard, gamepad, and touch (virtual stick + buttons) at phone width.

## Controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move / navigate | Arrows / WASD | D-pad / left stick | virtual stick |
| Confirm / interact | Enter / Space / Z | A | A button, or tap menu items |
| Cancel / back | Escape / X / Backspace | B | B button |
| Menu (field) | Tab / C | Start / Y | menu button |
| Boost + / - (battle) | E / Q (also ] / [) | RB / LB | +/- buttons |
| Run (field) | Shift | X | (auto) |
| Mute | M | | sound button |
