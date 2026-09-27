# Epochs of Empire

A browser 4X on a hex map that combines rules from Civilization V and Civilization VI and adds seven civilizations that appear in neither game. It is plain HTML, CSS and JavaScript with no build step and no dependencies.

**Play:** open `index.html` in a browser. The game saves itself to the browser's local storage at the end of every turn.

## What comes from where

| Civilization V | Civilization VI |
|---|---|
| One military unit per tile; ranged units and cities bombard | Districts on their own tiles, with adjacency bonuses |
| Global happiness: luxuries, cities and population | Builders with limited charges; harvesting woods |
| Golden Ages from surplus happiness | Eurekas and Inspirations (boost 40% of a cost) |
| Buying tiles with gold | Separate Civics tree, governments with policy-card slots |
| Barbarian camps that pay out when cleared | Housing caps growth; the combat formula based on strength difference |

Also: pantheons and religions with beliefs, 15 wonders, strategic resources that gate units, unit promotions and upgrades, zone of control, war and peace diplomacy, and three victory types (Science through the Mars Colony, Domination by holding every original capital, or Score at the turn limit).

## Civilizations

Rome, Egypt, China, Greece, England, the Aztec, Japan and Mongolia, plus seven that are new:

| Civilization | Leader | Ability | Unique unit / building |
|---|---|---|---|
| Hittites | Šuppiluliuma I | Start with Bronze Working; Mines +1 Production | Hittite War Chariot, Smelting Works |
| Tibet | Songtsen Gampo | Holy Sites get double Mountain adjacency; Hills cost no extra movement | Mountain Guard, Dzong |
| Majapahit | Hayam Wuruk | Coastal cities +2 Gold and +1 Production; Harbors cost half | Bhayangkara, Candi |
| Great Zimbabwe | Mutota | Commercial Hubs +1 Gold per adjacent Pasture; cheaper walls with Culture | Rozvi Spearman, Great Enclosure |
| Mississippians | Red Horn | Farms +1 Food; +10% growth | Chunkey Runner, Earthwork Mound |
| Swahili Coast | al-Hasan ibn Sulaiman | +3 Gold per kind of luxury; Commercial Hubs +2 Gold | Kilwa Bowman, Stone Town |
| Timurids | Timur | Captured cities give Science and Culture; +25% siege production | Mubariz, Ulugh Beg Observatory |

## Controls

Tap or click a unit, then tap a tile to move. Right-click moves or attacks immediately. Tapping an enemy first shows a combat preview. The round button in the corner asks for whatever still needs a decision (research, civic, production, unit orders); "End turn anyway" skips the remaining unit orders.

Keys: `Enter` next turn, `N` next unit, `F` fortify, `S` skip, `B` found city, arrow keys pan, `+`/`-` zoom, `Esc` cancel.

## Files

- `js/data.js`: terrain, resources, units, buildings, districts, wonders, techs, civics, governments, policies, beliefs and civilizations
- `js/map.js`: hex math and map generation
- `js/game.js`: rules, yields, combat and turn processing (no DOM access)
- `js/ai.js`: rival and barbarian AI
- `js/ui.js`: canvas renderer, input and interface panels
