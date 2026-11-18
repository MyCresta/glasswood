# Asterwake

A cosy idle tower defense in which the whole village is the tower. By day the village prepares; by night, monsters come out of the woods from fixed spawn points around it, and the archers on the walls hold the line.

**Play:** https://mycresta.github.io/asterwake/

The full design and milestone plan is in [`docs/game-plan.md`](docs/game-plan.md).

## What's in this version: Milestone 1, "The village holds the line"

- A hand-placed village on a floating island. The Town Hall, Walls & Gate, Archery Tower, Farmstead and Lumber Camp are working from the start, and the other buildings stand as ruins in their final places, waiting for later milestones.
- A day and night cycle. A 2-minute day is followed by a night wave. You can call the night early, run it at ×1 or ×2 speed, or turn on Hold to repeat a night you can win.
- Goblins and Wolves, scaling every night. A second spawn point opens on night 5, and more open on later nights (12, 18, 24 and 30).
- The archers shoot anything inside the village's range ring, with three targeting modes. The archers' level adds double shot at 5 and piercing arrows at 10.
- Walls have integrity and armour, starting as a palisade and becoming stone walls with towers. The walls are fully repaired every dawn.
- Gold comes from kills and from each dawn. Upgrades are queued with builders, and buildings can reach twice the Town Hall's level.
- Losing a night costs 10% of your free gold and moves the siege back two nights. Nothing is destroyed.
- Time away: for up to 24 hours, the village keeps defending your best safely won night at 75% of its rewards. Upgrades keep building, and time away never loses a night.
- The route each enemy will take is shown on the field during the day, ready for Milestone 2's mazes.
- Saving: autosave with a rolling backup, plus export and import. If the game is open in two tabs, you choose which one continues. The game supports phone layouts, touch, keyboard, reduced motion, reduced flashing, larger text and a quality setting.

## Running locally

There is no build step. The game uses plain ES modules, with Three.js loaded from a CDN through an import map.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tests

The simulation has no DOM dependencies and runs deterministically on a fixed 50 ms step. It is tested with Node's built-in runner:

```sh
npm test
```

## Layout

```
js/data/village.js  map, spawn points, buildings, enemies and all balance numbers
js/sim/             map + flow-field pathfinding, nights and combat, upgrades, time/offline
js/persist/         localStorage saves, export/import, single-tab lock
js/render/          Three.js diorama: island, village models, portals, instanced enemies, sky
js/ui/              HUD, night card, building panels and views
js/audio/           generative WebAudio music, ambience and battle sounds
docs/game-plan.md   the design plan (revision 2)
```

`window.asterwake` exposes the running game in the browser console for debugging.
