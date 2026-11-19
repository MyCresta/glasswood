# Glasswood
## Game plan, revision 5 (the idle design, replaced by revision 6 in plan.md)

Glasswood is a cosy, slightly mysterious tower defence that lives inside a glass terrarium globe on a candle-lit desk. Inside the globe is a whole miniature world of moss, mushrooms and forest. In its middle, a small village called Emberfold holds out night after night against goblins, wolves and stranger things that crawl out of burrows in the soil.

The player never leaves the desk. To look closer, they put a lens over the globe. The interface is the desk itself: handwritten notes, a leather index card, wax seals and a deck of trading cards for every villager and creature.

**What changed in revision 5:** The game moves from 3D (Three.js) to 2D SVG, and gets a new name and frame. The three views are now Wilds, Watch and Hearth, each a different way of looking into the globe. Villagers and creatures are trading cards. The defence is built around a large web of forest paths that the player can block with barricades. The 3D prototype is kept on the `3d-prototype` branch, and its simulation code carries over (section 15).

The design references for this revision are in [`docs/design`](design/README.md).

---

## 1. The idea in one paragraph

By day the player restores and levels the buildings of a tiny overgrown village, looks after its villagers and sends them on expeditions into the wider world inside the globe. At dusk, creatures leave their burrows and walk the forest paths towards the village. The village is the tower: its archers, mages and defenders shoot from the walls and the great tower in the middle. The player's main tool is the path web itself. A few well-placed barricades can turn a short walk into a long loop through the archers' range. The game keeps running while the player is away and never punishes them for leaving.

## 2. The desk

Everything happens on one dark walnut desk at night, lit by a candle in a brass dish.

- **The globe** sits in the middle in a wooden horizon ring with brass degree marks and N, E, S and W. We look straight down at it, tilted just enough that the ring's edge and two brass feet show at the bottom. Inside is the Wilds: the whole world.
- **The reading glass** (a brass magnifier with a wooden handle) is laid over the globe for the Watch view.
- **The loupe** (a big lens on an articulated brass arm, slightly tilted) swings in over the globe for the Hearth view.
- **Notes** are worn parchment pinned, taped or simply lying on the desk around the globe. They hold every panel the game needs: the village name and gold, the coming night, the selected building or place, expeditions, barricades and the log.
- **The view card** is a stitched leather card listing the three views, with a red ribbon on the current one.
- **Cards** for villagers and creatures lie in a deck on the desk and come forward when selected.
- **Wax seals** are the main action buttons: Call the night, Restore, Send villagers.
- **The candle** is the clock: it burns down through the day, and the room darkens at dusk.

The desk never scrolls away. On phones, the globe fills the width and the notes become a drawer of paper slips at the bottom (section 13).

## 3. Three views

| Key | View | Instrument | What you see | What you do there |
| --- | --- | --- | --- | --- |
| 1 | **Wilds** | The bare globe | The whole miniature world: meadows, forests, a river and lake, mountain ranges round the rim, villages, ruins and dungeon burrows | Discover places, plan and send expeditions, read rumours |
| 2 | **Watch** | The reading glass | The forest around Emberfold, top-down: the path web, burrows, the village and the archers' range | Read the coming night, place barricades, watch the fight |
| 3 | **Hearth** | The tilted loupe | Emberfold up close and slightly from the side: terraces, stairs, cottages, people, lights | Restore and level buildings, manage villagers and their gear |

Moving between views is a short animation of the instrument itself: the reading glass slides onto the globe and the world inside zooms; the loupe swings in on its arm. By default the game moves to Watch at dusk and back at dawn (a setting).

## 4. Look and feel

**Mood:** dark, warm and cosy, with a little mystery. Colourful, but never bright: colour comes from moss, mushrooms, leaves, lanterns and shells against deep shadow.

**Palette** (from the forest floor): loam `#2a1d1c`, moss `#41763a` and `#2f5e34`, fly agaric `#c43d36`, glow cap violet `#7b55c9`, glow cap teal `#2fb3a0`, lantern amber `#ffd27a`, walnut `#4e2c1e`, brass `#c9a45a`, parchment `#c4a878`, ink `#23170f`.

**Type:** Fraunces for headings and cards, Kalam for handwriting on notes, Alegreya Sans for small print and numbers.

**Rules that keep it from looking generic:**
- Everything in the world is a physical object on or inside the desk. No floating glass panels, pills, gradients for decoration or emoji.
- Notes have torn edges, visible paper thickness, tape, pins, stains and folded corners. They differ from each other on purpose.
- Light comes from things in the world: windows, lanterns, mushrooms, fireflies, the candle. Night is darker, not just bluer.
- Creatures are drawn a little larger than their real scale, with outlines and a soft glow beneath, so they stay readable at any zoom.
- Buildings are placed by the land (terraces, stream, hill), never on a ring or grid, and no two look alike.

## 5. The core loop

1. **Day (about 2 minutes):** restore and level buildings, assign villagers, craft gear, research, send expeditions, and set barricades for the coming night.
2. **Dusk:** the night note shows which burrows open, what comes out and by which routes. The player can call the night early or hold the current night level.
3. **Night:** creatures walk the paths, the village fights on its own. The player watches, speeds it up, pulls creature cards, and casts spells once the Mage Tower is restored.
4. **Dawn:** rewards, a short summary, and the next night is one level harder unless held.

## 6. Watch: the night defence

### 6.1 The path web

The forest around the village is crossed by a hand-made **web of paths** in rings: an inner ring close to the walls, and several outer rings joined by radial paths, with some gaps. The first version has about 110 path segments. Six burrows sit at the edge of the glass. Ponds, rocks and thickets break up the web so it looks grown rather than drawn.

The inner ring is reached by only a few roads, and the village by only a few gates. These choke points are what make barricades powerful.

### 6.2 Barricades

- The Workshop gives a number of **barricades** (start: 2, growing with levels and research).
- A barricade can be placed on any path segment by day. Enemies route around blocked segments.
- **A barricade can never seal the village off.** Placement is refused if any active or future burrow would lose every route to the walls. The note explains why.
- While dragging a barricade, the glass shows the new routes live, in dotted gold, and the old ones in red dashes, with the change in walking distance ("118 paces instead of 43").
- The design mockup shows four barricades on three inner-ring roads and the south gate. Goblins from the Hollow Gate must walk the whole way round: 43 paces become 118.
- Later: stone barricades (tougher), Sappers that break barricades, traps on paths, and some paths starting overgrown and needing to be cleared before use.

### 6.3 Enemy movement

- Ground enemies follow the shortest open route along the path web from their burrow to the nearest open gate. Routes are recomputed whenever a barricade changes.
- Flyers (bats) ignore paths. Some later enemies push through the forest itself, slowly.
- Burrows open over time: one at night 1, two at night 5, three at night 12, all six by night 30.

### 6.4 Integrity, attacks, enemies, winning and losing

These carry over from revision 4 unchanged in substance:
- The village has one **integrity** value (walls). Enemies that reach the walls attack them. At 0 the night is lost.
- Attacks come from the Great Tower's archers, defenders on the walls, Mage Tower spells, a Ballista and traps. Range is the link between the path web and the defence: detours inside the range rings multiply damage.
- Enemies: Goblin (1), Wolf (3), Brute (6), Bat Swarm (8), Shieldbearer (11), Sapper (14), Shaman (18), Wraith (25), and a boss every 10 nights.
- A lost night costs up to 10% of stored Gold and Food, sends the siege back by 2 nights and destroys nothing.

## 7. Hearth: the village

### 7.1 The place

Emberfold sits in a mossy clearing with a stream on its east side, a raised terrace in the north-west, a low stone wall with lantern posts, and a vine-covered gate arch to the south. Everything is old wood, stone and moss, lit by round amber windows, door lanterns, strings of coloured lights and glowing mushrooms.

### 7.2 Starting in ruins

A new game starts with the village overgrown: a campfire, the stump of the Great Tower with one archer (Wren), a ring of stakes, and ruins. Bram has nothing to do yet. The first goals walk the player through bringing it back: survive the first night, restore the Lumber Camp, the Tavern, the Workshop (and with it the first barricade), the Quarry and the Town Hall, then raise the tower.

### 7.3 Buildings, levels and what they bring

Every level is a milestone with a visible gain, a cost in Gold, Timber and Stone, and a build time: minutes for the first restorations, hours for later levels. Each building is drawn in three stages (ruin or humble first version, restored, grown) and changes in place when it reaches the next one. The numbers live in `js/data/village.js`.

| Building | Starts | What each level brings |
| --- | --- | --- |
| Great Tower | 1, a stump | Archer posts 1 → 4, reach, fire arrows at 4, two arrows each at 6 |
| Walls & Gate | 1, stakes | Strength 500 → 2000, armour 0 → 4 |
| Town Hall | ruin | How far other buildings can grow (its level + 1); a second builder at 2 |
| Tavern | ruin | Beds 2 → 10. With a bed free, a traveller settles after every night held |
| Lumber Camp | ruin | Woodcutter posts and Timber per worker |
| Quarry | ruin | Mason posts and Stone per worker |
| Workshop | ruin | Barricades 0 → 4 |

### 7.4 Villagers and posts

Villagers are the slow resource. Each one has a post: on the tower (an archer), at the Lumber Camp, at the Quarry, or resting. New villagers take a free post on their own, the tower first. The player moves them with − and + on a building's card. They stand at their posts in Hearth. Villager cards (section 8) build on this.

### 7.5 Pace

A sensible player holds night 10 within about half an hour, then each big milestone (the tower's second floor, the Town Hall's second builder, fire arrows) moves them several nights further. A player who never builds tops out around night 5. Gold comes from nights; Timber and Stone come only from workers, so they decide what gets built.

## 8. Villagers are cards

Each villager is a thick, slightly worn **trading card**:

- name, profession and level, and a coloured gem for rarity
- a hand-drawn portrait in their own setting (Wren draws an arrow under the moon, Bram holds a glowing bar by the forge, Ivy holds a jar of fireflies)
- three stats in medallions: health, aim and pace (or skill, by profession)
- two traits in handwriting
- three gear slots: weapon, armour and charm, shown as sockets; empty ones are dashed
- a line of flavour text, and a card number in the Emberfold deck

Actions sit next to the card as paper slips: change gear, post to the tower, send exploring. Professions, traits, assignments, experience and wellbeing carry over from revision 4. Recruiting at the Tavern means drawing new cards.

## 9. Creatures are cards too

Tapping a creature under the glass pulls its card onto the desk: portrait, health, bite and gold, what it is weak to, what it fears and what it drops. The first time a creature appears, its card is added to the deck as a discovery. Bosses get special cards.

## 10. Wilds: expeditions

The Wilds show places as small standing models inside the globe, with pinned paper tags: friendly villages (Brindlecross, Oakmere), wilds (Whispering Woods, Old Quarry), ruins (Sunken Chapel, Troll Bridge, Fallen Watch) and dungeons (Goblin Warrens, Moonlit Crypt, Crystal Hollow). Trails appear only to places that have been discovered.

An expedition is a party of up to three villager cards sent to a place. It takes real time and brings back materials, recruits, recipes and rumours. Dungeons have short card-based fights. Expedition rules carry over from revision 4.

## 11. Economy

Gold, Food, Timber, Stone, Iron, monster materials and Knowledge carry over from revision 4 with the same rules: rates per minute, worker bonuses, costs set aside on confirmation, nothing goes negative, and running out of Food never kills anyone.

## 12. Time, nights and offline progress

Carries over from revision 4: a 2-minute day, then a night that lasts until cleared (3-minute cap). Night speed ×1 or ×2, call the night early, and hold. Offline progress for up to 24 hours resolves nights at the "safe night" for 75% of rewards and never loses or advances a night. A return summary is written as a note on the desk.

## 13. Interface details

- **Desktop:** the desk at 16:10. Notes on the left (village packet, view card, deck) and right (night, selection, expeditions, barricades). Keys: 1/2/3 for views, Space to pause, N to call the night, X for speed, Esc to put things back.
- **Phone:** the globe fills the width at the top. Notes become a stack of slips in a bottom drawer, cards open full-width, and wax seals stay large (at least 48px).
- **Accessibility:** every note and card is real HTML with buttons and labels over the SVG scene. Reduced motion turns off the lens animations and drifting fireflies. Colour is never the only signal: routes are dotted versus dashed, and spawn tags say "open" in words.

## 14. Technology

- **No build step:** plain ES modules served as static files on GitHub Pages, as in the 3D prototype.
- **SVG scenes:** each view is an SVG with layers:
  1. a static layer drawn once per change (terrain, forest, buildings) and cached
  2. a dynamic layer for creatures, arrows, health bars and glows, using `<use>` references to symbols and transforms only
  3. glass and lens overlays

  The desk UI is HTML on top.
- **Procedural art from data:** the forest, path web, mountains and village are generated from seeded data in code, so they can change without hand-editing images. The design generators in `tools/design` are the reference for these drawing functions and are ported to JavaScript.
- **Simulation:** a deterministic fixed-step simulation (0.05 s steps), separate from rendering. Pathfinding runs on the path graph (Dijkstra from each burrow), not a tile grid.
- **Performance budget:** 300 creatures, 100 arrows and the full village at 60 fps on a mid-range laptop. Under load, fall back to fewer glows and fireflies.
- **Saving:** localStorage with a backup, export and import codes, and a lock against two open tabs, as in the prototype.

## 15. What carries over from the 3D prototype

On the `3d-prototype` branch:
- `js/sim/time.js`: the day and night clock, offline catch-up, and the pump with a real-time budget. Reuse as is.
- `js/sim/battle.js`: waves, scaling, archers, projectiles, integrity, and dawn rewards. Reuse, with movement switched from a flow field to path-graph routes.
- `js/sim/village.js` and `js/data/village.js`: upgrade queue, costs, level caps and objectives. Reuse, with the building list updated.
- `js/persist`: saving, backup, export and the tab lock. Reuse.
- `test/sim.test.mjs`: carry over the tests, and add tests for the path graph and the never-seal rule.
- `js/render`: replaced by the SVG renderer.

## 16. Milestones

1. **The desk and the Watch.** Desk scene, globe and reading glass, the path web with burrows, waves of goblins and wolves, the Great Tower's archers, integrity, the night note, and barricades with live routes and the never-seal rule. Saving and offline from the prototype. *Done when* a night can be won or lost under the glass, and barricades visibly change which night the player reaches.
2. **Hearth.** The loupe, the terraced village with all buildings drawn, restoring and levelling with notes, villagers walking about, day and night lighting.
3. **Cards.** The villager and creature cards, the deck, assignments to the tower and buildings, and creature cards pulled from the glass.
4. **Economy and the Blacksmith.** Resources, production buildings, gear crafting and gear slots on cards.
5. **Wilds and expeditions.** The world in the globe, discovery, parties of cards, and dungeon fights.
6. **Magic and research.** The Library, the Mage Tower and spells, and the Standing Stones.
7. **Depth.** More enemies and bosses, Sappers and stone barricades, traps, events and stories.
8. **Polish.** Lens animations, sound, phone layout, accessibility passes and performance.

## 17. Open decisions

1. **Barricade count and cost:** how many, and whether they cost Timber per night or only once.
2. **Gates:** whether the player can also close village gates (the mockup does), or only path segments.
3. **Overgrown paths:** whether some paths start closed and must be cleared by villagers.
4. **The candle as the clock:** whether it should also be the speed control.
5. **Who is looking:** whether the desk belongs to someone (a keeper or naturalist) with a light story, or stays anonymous.
