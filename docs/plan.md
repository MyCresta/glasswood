# Glasswood
## Game plan, revision 6: a roguelike

Revision 5 (an idle village that grew over days) is kept in `plan-idle.md`. Revision 6 turns the game into endless roguelike runs. Most of what is built carries over: the desk, the three views, the Watch and its path web, barricades, the never-seal rule, Hearth and the desk kit.

## 1. The idea in one paragraph

A glass globe on a desk holds a small forest with a village at its heart. Each run is a new globe: a newly grown forest, a web of paths, burrows at the edge. Every night creatures come down the paths for the village; between nights you choose one of three cards (a defender for the tower, a spell, a toolkit of barricades and traps, armour for the walls, or an upgrade for the tower), place your barricades, and perhaps send one defender into the Wilds for something rare. The nights never stop getting harder, so every run ends when the walls fall. What you earn in a run (Embers) buys lasting unlocks on the desk, so each run can reach further than the last.

## 2. A run

1. **Choose a glass.** At first there is one; unlocks add more (forest types with denser or wider paths, a starting relic, a different starting defender).
2. **Night 1 comes quickly.** The village starts with the Great Tower, one archer, stake walls and two barricades.
3. **Camp between nights** (section 5): pick one of three cards, place barricades, maybe send an expedition. There is no clock: the next night starts when you call it.
4. **Nights get harder without end** (section 4). Every 10th night a boss comes.
5. **The walls fall:** the run ends. A run-end card shows the night reached, the cards taken and the Embers earned.

A run can be left at any time and resumed later: it is saved between nights, and a night in progress restarts when you come back. There is no offline progress.

**Length.** Early nights are short (about 30–45 seconds) and later ones longer (1–2 minutes, more creatures and bosses). A run to night 10 takes about 10–15 minutes; a strong run to night 30 about 45–60.

## 3. The three views in a run

| View | Role in a run |
| --- | --- |
| **Watch** (the reading glass) | Where the game happens: the path web, burrows, barricades, the fight |
| **Hearth** (the loupe) | The camp: the four buildings, your defenders on the tower, your cards. It grows during the run as you pick cards |
| **Wilds** (the bare globe) | Expeditions: places appear as nights pass, shuffled every run |

## 4. Nights without end

- Creatures get tougher every night (health, damage and numbers on a gentle exponential curve), so every run ends somewhere.
- New burrows open at set nights; later burrows sit further from the village but on wider roads.
- **Bosses** every 10 nights: a single huge creature with an ability (a troll that smashes barricades, a wraith that ignores slow, a brood mother that splits).
- **Omens** from night 20: a random modifier each night, shown in advance (fog shortens the tower's reach, wolves run, one burrow moves). They stack later.

## 5. Camp: the card between nights

After every night held, three cards are dealt and you take one. Five families:

| Family | What it is | Examples |
| --- | --- | --- |
| **Defenders** | A character who stands on the Great Tower and fights from there | Archer, Mage (splash), Axe Thrower (short reach, heavy), Crossbow (pierces), Hunter (bonus against beasts), Lamplighter (reveals and slows in fog) |
| **Spells** | Cast during the night with a cooldown, by clicking the glass | Firebolt, Root Snare, Gust (pushes back along the path), Mend Walls, Will-o'-wisp (lures for a few seconds) |
| **Toolkit** | Things to put on the paths | Barricade, Bramble (slows), Spike Trap (hurts), Lantern (creatures prefer that path), Rockfall (blocks for one night), more barricades |
| **Fortify** | The walls and gate | Stone footings (+strength), Iron gate (+armour), Thorn hedge (hurts attackers), Watch fire (mends a little each night) |
| **Tower** | Upgrades to the Great Tower for the rest of the run | More reach, faster shots, a second floor (one more defender post), fire arrows |

**Why it feels like a roguelike:**
- **Tags and synergies.** Cards carry tags (fire, frost, nature, iron, beast). Two or three cards with the same tag unlock a bonus: fire arrows plus a Mage plus Firebolt sets things alight. You keep hoping for the card that fits what you have.
- **Rarity.** Common, rare and epic. Rarer cards show up more often the further you get. Boss nights deal a rare-or-better hand.
- **Rerolls.** A few per run, plus gold for more.
- **Limits.** The tower has a few defender posts (more with Tower cards), spells have a few slots, the Workshop holds so many traps. A full tower means choosing whom to replace.

**Gold** in a run comes from nights and is spent on rerolls, on mending walls and on a small shop every 5th night.

## 6. Hearth: the camp

Four buildings, each tied to card families, and they look the part as you pick cards (three drawn stages each, as now):

- **Great Tower:** your defenders stand on it; Tower cards raise it.
- **Walls & Gate:** Fortify cards.
- **Workshop:** where Toolkit cards are kept; shows how many barricades and traps you hold.
- **Shrine:** where Spells are kept.

The Tavern, Lumber Camp, Quarry and Town Hall go: timber, stone and level caps belonged to the idle design. Clicking a building opens its cards.

## 7. Wilds: one expedition at a time

Between nights you may send **one defender** to a discovered place. They are away for one or more nights (the place says how many), so the tower is weaker meanwhile. When they come back they bring what that place gives:

- **Relics** come only from expeditions: unique passive items that bend a run (every tenth arrow is fire; barricades regrow after a night; bosses drop an extra card).
- Rare and epic cards, gold, or a new defender from a friendly village.
- Dangerous places give more, and the defender may come back hurt (misses one more night).

It is a single choice in camp (who, and where), so it fits between nights without slowing the game.

## 8. The Watch: paths for all sizes

- **A new forest each run**, generated from a seed: rings of paths, crossings, burrows at the edge, ponds and clearings. The path web is drawn live in SVG instead of a fixed image.
- **Three widths:** narrow **trails** (small creatures only), **paths** (most creatures) and wide **roads** (the only ways bosses and brutes can walk). Blocking a road sends a boss the long way round while goblins slip through the trails.
- **Many paths stay the point.** Barricades, brambles, traps and lanterns make routes longer, slower or more painful, and the never-seal rule still holds for every creature size (each size must always have a way in).

## 9. Look and feel

**Mood:** dark, warm and cosy, with a little mystery. Colourful, but never bright: colour comes from moss, mushrooms, leaves, lanterns and shells against deep shadow.

**Palette** (from the forest floor): loam `#2a1d1c`, moss `#41763a` and `#2f5e34`, fly agaric `#c43d36`, glow cap violet `#7b55c9`, glow cap teal `#2fb3a0`, lantern amber `#ffd27a`, walnut `#4e2c1e`, brass `#c9a45a`, parchment `#c4a878`, ink `#23170f`.

**Type:** Fraunces for headings and cards, Kalam for handwriting on notes, Alegreya Sans for small print and numbers.

**Rules that keep it from looking generic:**
- Everything in the world is a physical object on or inside the desk. No floating glass panels, pills, gradients for decoration or emoji.
- Notes have torn edges, visible paper thickness, tape, pins, stains and folded corners. They differ from each other on purpose.
- Light comes from things in the world: windows, lanterns, mushrooms, fireflies, the candle. Night is darker, not just bluer.
- Creatures are drawn a little larger than their real scale, with outlines and a soft glow beneath, so they stay readable at any zoom.
- Buildings are placed by the land (terraces, stream, hill), never on a ring or grid, and no two look alike.

## 10. Lasting progress: the desk

Every run earns **Embers**: more for each night reached, extra for bosses. Embers buy unlocks that appear as things on the desk:

- **New cards in the pool** (most unlocks): new defenders, spells, toolkit pieces and their tags. This widens what runs can become more than it makes them stronger.
- **Small lasting boosts:** a reroll, a starting card choice, a little more wall strength. Kept modest on purpose, so power still comes from the run.
- **New glasses:** forest types (dense trails, river crossings, a mountain pass) with their own creatures.
- **Head starts:** once you have reached night 20 or 30, a run can begin at night 10 with a few extra picks, so strong players skip the easy part.

The save holds the unlocks, Embers, best night, run history and the current run.

## 11. Technology

No build step, static files on GitHub Pages. The simulation is deterministic and fixed-step, separate from rendering, and pathfinding runs on the path graph. The desk is a stack of SVG layers; the notes use the desk kit (`js/ui/kit.js`, gallery in `docs/ui/`). New in revision 6: seeded generation of the forest and its live drawing, and a card system (data for every card, tags, rarities and their effects).

## 12. Milestones

1. **The run loop.** Start a run, camp with no clock, endless nights with the scaling curve, the run-end card, Embers. Hearth trimmed to the four buildings. Offline progress removed.
2. **The card draft.** The five families with a first set of cards each, tags and synergies, rarity, rerolls. Defenders on the tower, spells cast on the glass.
3. **Generated forests and path widths.** Seeded path webs drawn live, trails, paths and roads, bosses every 10 nights.
4. **Toolkit mechanics.** Brambles, traps, lanterns, rockfall, alongside barricades.
5. **Expeditions and relics** in the Wilds.
6. **The desk of unlocks**, new glasses and head starts.

## 13. Decided

- **Spells:** both kinds. Active spells are cast during the night (Q W E R or their buttons, then a click on the glass; Mend Walls works at once). Passive spells work on their own.
- **The tower** always shoots on its own. Defenders are extra shooters on top, with no fixed number of posts: how many you end up with depends on what the draft deals.
- **Saving:** the run is saved between nights. Leaving during a night starts that night again from its beginning when you come back (gold earned in it is undone). Time away is never played.

## 14. Status

Milestone 1 and a first draft (milestone 2) are in: runs, camp with no clock, endless nights, 22 cards in five families with tags, rarity, synergies and rerolls, active and passive spells, the run-over card and Embers, and Hearth with the Great Tower, Walls, Workshop and Shrine growing with the cards. A simulated player that picks sensibly and casts spells when ready ends runs between nights 23 and 38 (median 27).
