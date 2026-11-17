# Asterwake

An idle colony builder told through small, living 3D dioramas. Colonists work on their own, buildings visibly grow with each level, and your civilization keeps going while you are away.

**Play:** https://mycresta.github.io/asterwake/

## What's in this version

This covers **Milestones 1 and 2** of the design plan:

- **A living home colony.** A floating diorama with a day and night cycle. It has 8 building types, each with visible upgrades across 10 levels, and construction shown with scaffolding. Power works on a priority system, storage is limited, and costs are set aside as soon as you confirm. The construction queue holds one active item and four waiting. Moving buildings is free, and demolishing them has safeguards.
- **People and idle progress.** Colonists have names, portraits, two traits each and four professions, and they gain experience. You can assign them by drop-down or by dragging them onto buildings. The game includes recruitment, housing, food upkeep, relief work, construction support, retraining, laboratories and research. Offline progress runs for up to 24 hours, follows the same rules as live play, and ends with a return summary.
- **Browser essentials.** Saves happen automatically and on demand, with a rolling backup and save-code export/import. If the game is open in two tabs, you choose which one continues. Layouts adapt to phones, and the game supports touch, keyboard, reduced motion and reduced flashing, larger text, a quality setting, full screen, and separate volume controls for music, ambience and interface sounds.

Surveys, ships, other worlds, factions and eras come in later milestones. Technologies for those are visible in Research and are marked with the milestone that brings them.

## Running locally

The game has no build step. It uses plain ES modules, with Three.js loaded from a CDN through an import map. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` straight from disk won't work, because browsers block module imports over `file://`.)

## Tests

The simulation is DOM-free and covered by Node's built-in test runner:

```sh
npm test
```

## Layout

```
js/data/      building, technology, profession and trait catalogs
js/sim/       pure simulation: economy tick, actions, research, objectives, offline catch-up
js/persist/   localStorage saves, export/import, single-tab lock
js/render/    Three.js diorama: terrain, sky, building models, colonists, camera
js/ui/        interface views and controller
js/audio/     generative WebAudio music, ambience and interface sounds
test/         simulation tests
```

The same `tickColony` function runs both live play and offline catch-up, so time away always follows the visible rules. `window.asterwake` exposes the running game in the browser console for debugging.

## Deploying

Each push to `main` runs the tests and publishes the site to GitHub Pages through `.github/workflows/pages.yml`. In the repository settings, Pages must use **GitHub Actions** as its source.
