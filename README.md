# Glasswood

A cosy, slightly mysterious tower defence inside a terrarium globe on a candle-lit desk.

A tiny village called Emberfold holds out night after night against goblins, wolves and stranger things that crawl out of burrows in the soil. Look into the globe in three ways:

- **Wilds:** the bare globe, with the whole miniature world inside. Plan expeditions.
- **Watch:** a reading glass over the forest around the village. Block forest paths with barricades and watch the night.
- **Hearth:** a tilted loupe over the village itself. Restore buildings and look after villagers, who are trading cards.

The interface is the desk: worn notes, a leather index card, wax seals and a deck of cards.

![The Watch view](docs/design/scenes/watch.jpg)

## Status

Design and planning. The plan is in [docs/plan.md](docs/plan.md) and the design references are in [docs/design](docs/design/README.md).

The earlier 3D version (Three.js) is on the [`3d-prototype`](../../tree/3d-prototype) branch. Its simulation, saving and tests carry over into the 2D game.

## Running

There is no build step. When the game code lands, serve the folder with any static server, for example `python3 -m http.server`, and open it in a browser. GitHub Pages deploys `main` automatically.
