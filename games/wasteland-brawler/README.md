# RUSTFIST: Brawl for the Last Well

A side-scrolling arcade beat 'em up set in a post-apocalyptic wasteland, built as one
self-contained HTML file (Canvas 2D, synthesized WebAudio, no external assets).

Year 2097, forty years after the Flash. Water is the only currency, and Warlord King Valve
holds the last dam. His Chrome Jackals burned convoy driver Juno Reyes's water run, crushed her
arm and took her brother Teo. A scrap-smith rebuilt the arm as a piston-driven iron gauntlet.

## Play

Open `wasteland-brawler.html` in a browser (it works offline; fonts for the page header are optional).

| Action | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Move | Arrows / WASD | D-pad | D-pad / left stick |
| Run | Double-tap left/right | Double-tap the d-pad sideways | Double-tap |
| Attack, pick up | J (or Z) | HIT | X / Y |
| Jump | K (or X, Space) | JUMP | A |
| Special / throw weapon | L (or C) | SPEC | B / RB |
| Pause | Enter (or Esc, P) | PAUSE | Start |
| Mute | M | Sound button | |

- Attack string: jab, cross, hook, then the Piston Uppercut (or forward + J for the Piston Straight,
  which turns the enemy into a bowling ball).
- Walk into an enemy to grab: J knees, J + a direction throws (backwards arcs over your head).
- Directional jump + J is a flying kick; neutral jump + J is the Hammer Drop (pops scorpion sand mounds).
- Run + J is a shoulder charge. Hold away + J for a back fist.
- L is the Scrap Burst: it costs health, which you win back by landing hits (grey bar).
  L in the air is the Meteor Fist. With a full Rage bar, L unleashes the Piston King.
- Weapons: lead pipe, machete, stop-sign axe and molotovs. L throws the weapon you hold.
- Red "!" marks and red ground markers telegraph heavy attacks. The TIME counter resets at every GO.

## Content

Three stages (Rust Row at dusk, the Glass Flats at noon, the Thirsty Dam at night), the Chrome
Jackals gang, giant scorpions, glowing mutants, King Valve's Iron Guard, and four bosses:
Slab, Big Diesel, The Matriarch and King Valve.

## Build

Source modules live in `src/` and are concatenated in filename order:

```
node build.mjs            # writes wasteland-brawler.html and dist/artifact.html
```

`ENGINE.md` documents the engine API for content modules and `DESIGN.md` is the full design spec.
Playtest tools (Playwright, Chromium) live in `tests/`: `bot.mjs` (autopilot playthrough),
`sandbox.mjs`, `gallery.mjs`, `hero.mjs` and `smoke.mjs`.
