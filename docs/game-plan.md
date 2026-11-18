# Asterwake
## Browser game requirements and implementation plan (revision 2)

**Working title:** Asterwake. It still fits a village that wakes under strange stars, but the title is open for review (section 19).

**Confirmed direction:** An idle tower defense game in a fantasy setting. The whole village is the tower. Its buildings are already in place and are unlocked, levelled and managed rather than built on a grid. Enemies come from fixed spawn points around the village, and the player can build mazes in the surrounding field to lengthen their route.

**What changed from revision 1:** Revision 1 turned into a grid-based space colony builder and lost the tower defense focus. This revision removes plot grids, free building placement, power networks, multiple colonies, ships, shipping routes, alien factions and eras. Villagers with traits and a research tree carry over. The only grid in the game is the battlefield around the village, and it exists purely for mazes.

**Design status:** Rules, quantities and content below are proposed defaults that form one coherent design for review. Section 19 lists the choices that most need confirming.

## 1. Game identity

The player looks after a small, lovingly made fantasy village that is besieged every night. By day, villagers farm, cut timber, mine, forge and study. By night, monsters come out of the forest, the hills and the old roads, and the village fights back from its walls with archers, spells and the equipment its people have made. The pleasure comes from watching a cosy place grow stronger and more beautiful, outlasting nights that once overwhelmed it, and shaping the battlefield so that enemies take the long way round.

Each building is a place with a purpose, not a tile. The Blacksmith is where all gear is crafted, upgraded and salvaged. The Tavern is where people are recruited and expeditions are formed. The Library is where research happens. Opening a building opens everything related to it.

The core loop:

1. The village produces resources by day while villagers work.
2. Night falls and a wave attacks from the spawn points. Village defences fight automatically.
3. Kills and night rewards bring gold and monster materials.
4. The player restores and levels buildings, crafts gear, researches upgrades and rearranges the maze.
5. Stronger defences survive harder nights, which bring better rewards and new enemy types.
6. Expeditions send equipped villagers out for rare materials, recipes and new recruits.

The tone is warm, storybook and slightly eerie at night. Losing a night is a setback, not a disaster. Nothing permanent is destroyed, and long absences never ruin the village.

There is no mandatory ending. Night milestones, boss nights and village development provide long-term goals.

## 2. Browser experience and controls

- The game runs in a browser without installation or an account.
- Desktop is the primary layout; tablets and phones down to 360 px wide portrait are fully supported with adapted layouts and touch controls.
- Every essential action works with mouse, touch and keyboard. Dragging and shortcuts are conveniences, never the only route.
- Dragging moves the camera. Tapping or clicking selects. Placing maze pieces uses an explicit placement mode so that panning never places anything by accident.
- The player can pause, resume, adjust quality, go full screen and change audio settings. Opening menus never pauses the game. A paused save stays paused.
- Unavailable actions explain what is missing.
- Nothing requires fast reflexes, rapid tapping or being online at a specific real-world time.

## 3. Visual identity and atmosphere

### 3.1 The village

The village is a hand-designed miniature on a floating island or a clearing, depending on the chosen art direction (section 19). Every building has a fixed, deliberately composed spot: the Town Hall on the square, the Blacksmith by the stream, the Mage Tower on the rise, farm fields on the gentle slope. Paths, fences, gardens, washing lines, lanterns and props connect them. Nothing about the layout looks procedurally scattered.

Locked buildings are visible from the start as ruins, overgrown foundations or boarded-up shells. Restoring a building plays a short construction moment. Each level visibly changes it: new storeys, chimneys, banners, better roofing, warmer lights, more activity around it. A level 10 Blacksmith should look like a proud workshop, not a slightly bigger shed.

Villagers walk between home, work and the walls. At dusk they light lanterns and defenders climb onto the walls; at dawn they come back down.

### 3.2 The battlefield

Around the village lies the approach: meadows, forest edges, rocks and old roads, divided into a subtle tile grid that only becomes visible in maze-placement mode. Spawn points are recognisable landmarks such as a dark forest path, a cave mouth, a ruined gate or a mist-filled ravine. Before a night they show a faint glow and a preview of the enemies coming from them.

Enemies are readable at a glance through silhouette, colour and movement: scurrying goblins, loping wolves, heavy brutes, fluttering bats. Projectiles, spells, hits and deaths have clear, satisfying feedback without visual noise. Damage numbers are optional.

### 3.3 Day and night

Day is bright and calm. Dusk is the transition and the cue to prepare. Night is darker and moodier, but the battlefield must stay readable: lit windows and torches on the walls, glowing enemy eyes and clearly coloured projectiles. Dawn brings a short celebratory moment and the night's rewards.

### 3.4 Camera

The default view shows the whole village and the near battlefield. The player can pan, zoom, rotate within limits, focus on a building, and return to the default view. A clean viewing mode hides most of the interface. During placement, the camera tilts towards a more top-down view so that paths are easy to read.

### 3.5 Readability and sound

The interface uses warm parchment and wood tones, kept quiet so that the scene stays the star. Resources always use the same icon and colour. Status is always also conveyed by text or symbols. Music is gentle by day and tense but not stressful by night. Hits, kills, wall damage, level-ups, crafting and dawn have short, distinct sounds. Master, music, ambience and interface volume are separate. Reduced motion and reduced flashing settings are supported.

## 4. Starting the village

The player names the village and chooses a banner (emblem and colour). Defaults allow immediate play.

The village starts with the Town Hall, Walls, Archery Tower, Farmstead and Lumber Camp restored at level 1, and three villagers: an Archer, a Farmer and a Woodcutter. The opening stock is 150 Gold, 100 Food, 80 Timber and 40 Stone. Every other building is visible as a ruin with its restoration requirement shown.

Night 1 begins after a short first day of about two minutes. It is gentle enough to be won with no player action, so the player sees the defence working before having to understand it. A short, dismissible guide covers selecting a building, reading a night preview, levelling the Archery Tower, placing the first barricade, restoring the Blacksmith and equipping a defender.

Pacing targets:
- First meaningful upgrade affordable within 2 minutes.
- First maze piece available on night 3.
- Blacksmith restorable within about 15 minutes.
- First lost night typically around night 8 to 12 for a player who hasn't engaged with mazes or gear.
- First boss night (night 10) is a clear milestone.

## 5. Time, nights and offline progress

### 5.1 The day and night cycle

- A cycle is one **day** followed by one **night**. Proposed default: a 2-minute day, then a night that lasts until its wave is cleared or the village falls, with a 3-minute cap after which remaining enemies retreat.
- Day: production runs at full speed, crafting and research continue, and maze changes are free.
- Night: production continues (proposed: at full speed, for simplicity). Maze pieces can't be placed or removed while enemies are on the field, so the player commits to a layout before dusk. Pieces can still be repaired.
- The player can **call the night early** to skip the rest of the day.
- The player can turn on **hold** to replay the current night level instead of advancing. That gives a safe way to farm rewards while the defences catch up.

### 5.2 Offline and background time

- Economy, crafting, research, recruitment and expeditions continue offline for up to **24 hours** per absence, using exactly the same rules as live play.
- Defence while away (proposed default, see section 19): offline nights are resolved at the **highest night the village has cleared without losing integrity in its last three attempts** (the "safe night"). Each offline night grants that night's rewards at 75%. Offline time never advances the siege level and never loses a night.
- The return summary shows the time away and time credited, nights defended, resources gained and spent, finished crafting, research and expeditions, and anything that needs attention.
- Hiding the tab and coming back never credits the same time twice. A paused game makes no progress.

## 6. Resources

| Resource | Main sources | Main uses | Limits |
| --- | --- | --- | --- |
| Gold | Monster kills, night rewards, Market, expeditions | Restoring and levelling buildings, recruiting, crafting fees | Storehouse capacity |
| Food | Farmstead, expeditions | Villager upkeep (0.1 per villager per minute), expedition supplies, recruiting | Storehouse capacity |
| Timber | Lumber Camp | Buildings, barricades, arrows and ballista ammunition are abstracted (no ammo tracking) | Storehouse capacity |
| Stone | Quarry | Walls, building levels, stone maze walls | Storehouse capacity |
| Iron | Mine | Gear, building levels, traps | Storehouse capacity |
| Monster materials | Drops from enemies, expeditions | Gear crafting and gear upgrades | Separate material pouch, no cap |
| Knowledge | Library | Research | Shared bank, no cap |

Rules carried over from revision 1:
- Rates are shown per minute, with production, consumption, net change, and the time until storage is full or empty.
- Producers work without a worker; an assigned villager adds 50%, plus more for a matching profession.
- Storage never goes negative. Costs are set aside when an action is confirmed, and the interface separates available goods from committed goods.
- Running out of Food never kills anyone. Worker bonuses are halved and recruitment pauses until Food recovers.
- Idle villagers do power-free odd jobs at the Town Hall (2 Gold or 1 Food per minute), so the economy can always recover.

Monster materials come in tiers that follow enemy families, for example Goblin Scraps, Wolf Pelts, Brute Hide, Bat Wings, Shield Plates, Shaman Beads and boss trophies. Each gear recipe names the materials it needs, so the player knows which nights and expeditions to pursue.

## 7. The village: preplaced buildings

### 7.1 Principles

- Every building has a fixed place. There is no plot grid, free placement, relocation or demolition in the village.
- Buildings start either restored or as ruins. A ruin shows its **restoration requirement** (Town Hall level, night reached, research or resources) and its cost.
- Each building has its **own management screen** that holds everything related to it: production, workers, levels, and its own feature (crafting, recruiting, research, spells and so on).
- Building levels are capped by Town Hall level, so the Town Hall paces overall progression.
- One restoration or level-up builds at a time, with up to three more queued. Buildings keep working while they level up.
- Level-up costs grow by ×1.55 per level and durations by ×1.3 per level from the listed level-1 values. Previews always show the exact cost and benefit.

### 7.2 Building catalog

| Building | Starts | Restore requirement | What it does | What levels improve |
| --- | --- | --- | --- | --- |
| Town Hall | Restored | — | The heart of the village. Sets building level caps, holds the village banner and stores basic goods | Raises level caps, unlocks building restorations, small integrity bonus |
| Walls & Gate | Restored | — | Village integrity (the "tower HP") and defender wall posts | Integrity, armour, wall posts (2 → 6), integrity regeneration by day |
| Archery Tower | Restored | — | Main single-target ranged attack | Damage, attack speed, range; level 5 double shot, level 10 piercing arrows |
| Farmstead | Restored | — | Food (4/min at level 1) | Output ×1.25 per level, extra fields and animals appear |
| Lumber Camp | Restored | — | Timber (6/min) | Output |
| Quarry | Ruin | Night 2 | Stone (5/min) | Output |
| Mine | Ruin | Town Hall 2 | Iron (3/min) | Output; level 5 occasionally finds gems used by trinkets |
| Storehouse | Ruin | Night 3 | Storage for Gold, Food, Timber, Stone and Iron | Capacity ×1.5 per level |
| Workshop | Ruin | Night 3 | Maze pieces and traps, repairs, the Ballista add-on | Maze-point budget, unlocks new piece types, repair speed, Ballista damage |
| Blacksmith | Ruin | Town Hall 2 | Crafts, upgrades, reforges and salvages gear | Recipe tier, crafting slots (1 → 3), crafting speed, max upgrade level of items |
| Tavern | Ruin | Night 5 | Recruits villagers, houses them, forms expedition parties, runs the quest board | Candidate quality, housing, party size, expedition slots |
| Library | Ruin | Town Hall 2 | Knowledge and the research tree | Knowledge output, research queue length |
| Mage Tower | Ruin | Town Hall 3 and research | Area spells: firebolt (splash), frost (slow), later chain lightning | Spell damage, cooldown, unlocks new spells |
| Temple | Ruin | Town Hall 3 | Heals integrity between waves, villager recovery, a once-per-night blessing | Healing, blessing strength, recovery speed |
| Market | Ruin | Town Hall 4 | Trades between resources at fair but lossy rates, travelling merchant visits | Better rates, merchant stock |
| Watchtower | Ruin | Night 15 | Reveals the next night's full wave, longer warning, spotter bonus vs flyers | Detection, crit bonus, flyer damage |

Storehouse-free base storage comes from the Town Hall (300 of each basic resource at level 1, +150 per Town Hall level).

### 7.3 Building screens

Each building's screen follows the same frame so that players learn it once:

- **Header:** name, level, status and a short description.
- **Its feature:** for example the Blacksmith's crafting bench or the Tavern's recruits and quest board.
- **Workers:** the villagers working there and the bonus they add.
- **Level up:** cost, time, and the exact benefit of the next level, including anything newly unlocked.
- **Log:** recent activity for this building.

## 8. Defence: the village is the tower

### 8.1 Integrity

The village has a single **integrity** value (proposed starting value: 500). Enemies that reach the walls attack them and reduce integrity. If integrity reaches 0 before the wave is cleared, the night is lost. Integrity regenerates by day (Walls level) and between waves (Temple).

Armour reduces each hit by a flat amount, at least 1 damage per hit. Integrity and armour are shown on the HUD at all times during the night.

### 8.2 Village attacks

All attacks come from the village itself:

| Source | Style | Notes |
| --- | --- | --- |
| Archery Tower | Fast single target, good range | Backbone of the defence. Targeting priority can be set: closest to walls, strongest, fastest, flyers first |
| Defenders on wall posts | One attack per assigned villager | Their damage and style come from profession, level and gear: bows (range), spears (short range, high damage), staves (small splash) |
| Mage Tower spells | Area damage and slows on cooldowns | Spells auto-cast. The player can set preferences (save frost for brutes, for example) |
| Ballista (Workshop add-on) | Slow, very heavy single shot | Strong against brutes and bosses |
| Traps | Damage or slow enemies who walk over them | Placed in the maze (section 8.4) |

Every attack has damage, attack speed, range, and optionally critical chance, splash and slow. A defence breakdown shows where each number comes from: building level, research, villager, gear, traits.

Range is the key link between village and maze: the village only hits enemies within its range rings, so a maze that winds inside those rings multiplies the damage enemies take before they arrive.

### 8.3 Spawn points and enemy movement

- The battlefield has **six spawn points** around the village, placed by hand like the buildings. Night 1 uses one. More open as nights progress (2 at night 5, 3 at night 12, all 6 by night 30), so pressure gradually comes from all sides.
- Before each night, active spawn points glow and the night preview lists which enemies come from where.
- Ground enemies walk the shortest available route from their spawn point to the walls, recalculated whenever the maze changes (a flow field towards the wall).
- **Flyers ignore the maze** and fly straight in, so the maze can never be the whole answer.
- Enemies attack walls only, except Sappers (below).

### 8.4 Mazes

- The battlefield is a tile grid (proposed: 41 × 41 tiles, with the village occupying the centre). The grid is only drawn during placement mode.
- The Workshop gives a **maze-point budget**. Each piece costs points and resources. Levelling the Workshop and research raise the budget.
- **The maze can never fully block a route.** Placement is rejected if any active or future spawn point would lose its path to the walls. The preview shows the new path live, with its length and the estimated walking time compared to before.
- Pieces can be placed, rotated (where shaped), sold for a full refund by day, and saved as **layout presets** so that the player can switch between maze plans.

| Piece | Effect | Unlock |
| --- | --- | --- |
| Barricade | Blocks one tile. Cheap, wooden | Workshop 1 |
| Stone Wall (1×3) | Blocks three tiles in a line; much tougher against Sappers | Workshop 3 |
| Spike Trap | Walkable; damages each enemy that crosses | Workshop 2 |
| Tar Pit | Walkable; slows by 40% while inside | Workshop 4 |
| Watch Torch | Blocks a tile; extends archer range near it by 10% | Workshop 6 and research |
| Rune Stone | Blocks a tile; boosts spell damage on nearby enemies by 15% | Mage Tower 5 |

Only Sappers attack maze pieces. Broken pieces are rebuilt free at dawn, so a lost barricade costs a night's advantage, not resources.

### 8.5 Enemies

| Enemy | First night | Role | Counter |
| --- | --- | --- | --- |
| Goblin | 1 | Basic, weak, numerous | Anything |
| Wolf | 3 | Fast and fragile | Long mazes, frost |
| Brute | 6 | Slow, high health, hits walls hard | Ballista, spears, focused fire |
| Bat Swarm | 8 | Flying, ignores the maze | Archers set to flyers first, Watchtower |
| Shieldbearer | 11 | High armour, protects nearby enemies from arrows | Spells, heavy damage per hit |
| Sapper | 14 | Attacks maze pieces in its way | Stone walls, killing it early |
| Shaman | 18 | Heals nearby enemies | Priority targeting, splash |
| Wraith | 25 | Briefly invisible, slips past tight mazes | Rune stones, Watchtower detection |

**Boss nights** happen every 10 nights: the Goblin Chief (10), the Alpha Wolf (20), the Stone Troll (30), then repeating with stronger variants and new bosses added later. A boss night has a distinct dusk, music and reward chest.

Enemy health and numbers scale with night number (proposed: health ×1.12 per night, count +1 every 2 nights, with new types blended in). Exact formulas live in one data file so that balance can be tuned without code changes.

### 8.6 Winning and losing a night

- **Cleared:** all enemies dead or retreated at the cap. The night's rewards are granted at dawn, and the next night is one level higher (unless hold is on).
- **Lost:** integrity hit 0. Remaining enemies retreat. The village loses up to 10% of stored Gold and Food (never materials or gear), defenders on the walls become *recovering* for one day, and the siege level falls back by 2 nights. Nothing is destroyed.
- The best night ever reached is recorded, and a "personal best" moment marks new records.

## 9. Villagers

### 9.1 Identity and professions

Every villager has a name, portrait, appearance, profession, level, experience, two traits, gear, and a current assignment. Names can be changed.

| Profession | Best at | Typical assignments |
| --- | --- | --- |
| Farmer | Food | Farmstead |
| Woodcutter | Timber and Stone | Lumber Camp, Quarry |
| Miner | Iron and gems | Mine |
| Smith | Crafting speed and quality | Blacksmith, Workshop |
| Scholar | Knowledge and spells | Library, Mage Tower |
| Archer | Ranged defence | Archery Tower, wall posts, expeditions |
| Guard | Close defence, toughness | Wall posts, expeditions |

Any villager can do any job; a matching profession adds a bonus (+10%, +2% per level above 1, up to level 20). Experience: 4 per minute of useful work or per night spent defending; each level needs 20 × the current level. Retraining costs Knowledge and keeps experience in each profession.

### 9.2 Assignments

A villager has one assignment: a building job, a wall post, an expedition, or odd jobs at the Town Hall. Wall posts only matter at night, so the proposed default is that **villagers on wall posts also keep their day job**: they work by day and climb the walls at dusk. That keeps defence from competing harshly with the economy early on. Assignment works by drop-down and by dragging a villager onto a building or a wall post.

### 9.3 Traits

Twelve traits with modest effects (5–15%) and a short flavour line each, for example:

| Trait | Effect |
| --- | --- |
| Steady Hand | +10% critical chance on the walls |
| Hardy | +15% integrity contribution while on a wall post |
| Diligent | +5% output at their building |
| Night Owl | +10% damage during nights, −5% output by day |
| Tinkerer | +10% crafting speed at the Blacksmith or Workshop |
| Bookish | +10% Knowledge at the Library |
| Wanderer | +10% expedition rewards |
| Careful | 25% less chance of injury on expeditions |
| Brave | +10% damage against bosses |
| Homebody | +10% staffing bonus, −10% on expeditions |
| Quick Learner | +10% experience |
| Lucky | +5% rare material drops from their kills and expeditions |

### 9.4 Recruitment, housing and wellbeing

The Tavern offers three candidates. Recruiting costs Gold and Food and takes three minutes. The candidate list refreshes for free once per day cycle. Housing comes from the Town Hall and the Tavern. The village limit starts at 8 villagers and grows to 30.

Wellbeing states: comfortable, hungry (Food ran out), recovering (after a lost night or a rough expedition). Hungry or recovering villagers give half their normal bonus. There is no death or aging.

## 10. The Blacksmith and gear

- **Slots:** each villager has Weapon, Armour and Trinket slots.
- **Weapons** decide a defender's attack style: bows (range), spears (heavy, short range), staves (small splash). Armour adds integrity contribution on the walls and safety on expeditions. Trinkets give special bonuses such as crit, flyer damage or extra materials.
- **Recipes** need Iron, other resources and monster materials, and take crafting time. New recipes come from Blacksmith levels, research, boss trophies and expeditions.
- **Rarity:** Common, Fine, Superior and Masterwork. Rarity is rolled at crafting, with odds shown before confirming, and a Smith working there improves them. Higher rarity adds an extra bonus line.
- **Upgrading** an item raises its level (up to the Blacksmith's cap), with costs shown in advance. Upgrades never fail or destroy the item.
- **Reforging** rerolls one bonus line for a cost. **Salvaging** returns half the materials.
- The Blacksmith screen shows the crafting queue, the recipe book with missing materials highlighted, and an armoury of every item with who is wearing it.

Gear is a big part of how the village scales, but building levels and research matter at least as much, so no single system is mandatory to keep progressing.

## 11. Expeditions

Formed at the Tavern, expeditions are the village's window to the wider world, without turning it into a second game:

- A **region map** shows locations around the village (Whispering Woods, Old Quarry, Sunken Chapel, Troll Bridge and others) with difficulty, duration (5 to 60 minutes), expected rewards and risk.
- A party of 1 to 4 villagers goes out with their gear. Party power (from levels, gear and traits) against location difficulty decides the result, and the forecast shows the odds before departure.
- Results: materials, Gold, recipes, recruits (rescued travellers join the candidate list), lore, and occasionally a new region or a spawn-point secret, such as learning that a spawn point can be partly sealed for a few nights.
- Setbacks: fewer rewards and villagers *recovering* for a while. Never death or lost gear.
- Villagers on an expedition can't work or defend until they return, which is the real cost of sending them.
- Expeditions continue offline.

## 12. Research (the Library)

One project at a time with a three-project queue, fed by a shared Knowledge bank (the same rules as revision 1). The tree has four branches:

| Branch | Example technologies |
| --- | --- |
| Defence | Fletching (+15% arrow damage), Volley (second Archery target), Reinforced Walls (+20% integrity), Siege Engineering (Ballista), Watchfires (+10% range at night) |
| Battlefield | Barricade Craft (+maze points), Masonry (Stone Walls), Trapmaking (Spike Traps, Tar Pits), Runecraft (Rune Stones), Pathfinding Studies (path length shown per spawn point, longer warning) |
| Village | Crop Rotation (+20% Food), Sawmills (+20% Timber), Deep Shafts (+20% Iron), Granaries (+storage), Hospitality (faster recruiting, +housing) |
| Craft & lore | Metallurgy (Fine recipes), Masterworks (Masterwork odds), Arcane Basics (Mage Tower), Frost Lore and Storm Lore (new spells), Cartography (new expedition regions) |

Each technology shows prerequisites, cost, time at the current rate, and the concrete effect. The full catalog with costs (about 24 technologies) is the first content task of the research milestone.

## 13. Village events

Light, occasional events add story without interrupting play. Each has two or three choices with stated costs:

- A travelling merchant with one rare item.
- Refugees at the gate who can join for a Food cost.
- A wounded knight who offers to train a Guard.
- A strange light in the forest that becomes a new expedition site.
- A festival that costs Food and gives a temporary experience boost.
- An eclipse warning: the next night is harder with double rewards, and the player can choose to accept or delay it.

At most three unresolved events wait at a time. Events never block production or nights.

## 14. Interface and views

Principal views:

- **Village:** the scene, the resource bar, the day and night timer, integrity, the next-night preview, and building selection.
- **Battlefield / maze mode:** the grid, maze budget, piece palette, live path preview per spawn point, and layout presets.
- **Villagers:** roster, assignments, wall posts, gear overview.
- **Building screens:** the Blacksmith, Tavern and others, each opened from the building itself.
- **Research, Expeditions** (region map), **Log, Settings, Help.**

During a night, the HUD adds integrity, enemies remaining per spawn point, active spells with cooldowns, and a speed control (×1 and ×2, proposed). Everything else from revision 1's interface rules still applies: three notification levels, grouped completions, exact numbers on inspection, explained blockers, visible keyboard focus, scalable text, and large touch targets.

## 15. Saving and recovery

Unchanged from revision 1: autosave plus manual save, a visible save indicator, a rolling recoverable backup, export and import with a preview, a clear message when storage fails, and protection against two tabs running the same village. Maze layout presets are saved with the village.

## 16. Presentation and performance

- Target 60 fps on an ordinary integrated-graphics desktop. A reduced-detail mode should hold about 30 fps on modest phones.
- The game must handle at least 300 enemies on screen, 100 projectiles and the full village at once. Enemies use instanced rendering, and pathfinding uses one shared flow field per spawn point that is recomputed only when the maze changes.
- Combat runs on a fixed-step simulation independent of frame rate, so results are identical at any quality setting or speed.
- Lower quality may reduce particles, shadows and crowd animation, never outcomes.

## 17. Minimum content for the complete game

| Area | Content |
| --- | --- |
| Village | 16 preplaced buildings with ruin states and visible levels 1–10 (Town Hall to 5) |
| Battlefield | 1 hand-made map with 6 spawn points; 6 maze piece types; layout presets |
| Enemies | 8 regular types, 3 bosses, scaling to night 100+ |
| Villagers | 7 professions, 12 traits, varied names and portraits |
| Gear | 3 slots, 3 weapon styles, at least 30 recipes, 4 rarities |
| Research | About 24 technologies across 4 branches |
| Expeditions | At least 8 regions |
| Events | At least 10 village events |

A second battlefield map, a different village site with its own layout and spawn points, is a natural later addition but is not required.

## 18. Ordered milestones

Each milestone is a playable game, and the tower defense comes first.

### Milestone 1: The village holds the line
The preplaced village diorama with the starting buildings, integrity, the Archery Tower, the day and night cycle, one spawn point, Goblins and Wolves, night scaling, winning and losing nights, Gold from kills, levelling the Archery Tower and Walls, and saving.
*Complete when* the player can watch a night play out, upgrade between nights, eventually lose a night, recover, and come back to the same village later.

### Milestone 2: Mazes
The battlefield grid, the Workshop, barricades, stone walls and spike traps, the live path preview with the never-block rule, multiple spawn points, Brutes and Bat Swarms (flyers ignore the maze), and layout presets.
*Complete when* a good maze visibly changes which night the player can reach, and flyers make a pure-maze strategy insufficient.

### Milestone 3: A living village economy
Resources and storage, ruins and restoration, building screens and levels, Town Hall caps, villagers with traits, jobs and wall posts, recruitment at the Tavern, food upkeep, offline progress with safe-night defence, and the return summary.
*Complete when* investing in the village measurably strengthens the defence and a short visit is always worthwhile.

### Milestone 4: The Blacksmith
Gear slots, recipes, monster materials, crafting, rarity, upgrades, reforging, salvage, the armoury, and gear changing defender attack styles.
*Complete when* equipping a defender visibly changes how the walls fight and players chase specific materials.

### Milestone 5: Research and magic
The Library, the research tree, the Mage Tower with spells, the Ballista, tar pits and rune stones, Shieldbearers, Sappers and Shamans, and the first boss nights.
*Complete when* different defence builds (arrow-heavy, spell-heavy, maze-heavy) are viable.

### Milestone 6: Expeditions
The region map, parties, forecasts, results, setbacks, recipes and recruits from expeditions, and offline expeditions.
*Complete when* sending villagers out is a real trade-off against keeping them on the walls.

### Milestone 7: Depth and stories
Wraiths, all bosses and scaling to night 100+, the Watchtower, Temple and Market, village events, achievements, and balance passes.
*Complete when* the game sustains many hours of progression with clear goals.

### Milestone 8: The complete browser experience
Full visual and audio polish across day and night, phone layouts for maze mode, accessibility settings, performance at the stated enemy counts, and import/export.

## 19. Decisions still open

1. **Offline defence:** This plan replays the "safe night" at 75% rewards, so offline time never loses and never advances. Alternatives are fully simulating offline nights (with possible losses), or no offline nights at all (economy only).
2. **Night rhythm:** Distinct nights with a 2-minute day suit an idle game with a cosy rhythm. The alternative is continuous waves with no day phase, as in many idle tower defence games, which would make the day and night visuals cosmetic.
3. **Spawn points versus all sides:** This plan uses six fixed spawn points that open over time, so that mazes stay readable. True "from any edge" spawning makes mazes much harder to plan.
4. **Wall posts and day jobs:** Here defenders keep their day jobs. Making them full-time soldiers creates a sharper economy-versus-defence trade-off.
5. **Should anything outside the village shoot?** Here only the village attacks, and the maze holds only barriers and traps. Allowing a few outpost towers in the field would add strategy but dilute the "the village is the tower" idea.
6. **Setting of the site:** A floating island (reusing the current diorama, a little magical) or a forest clearing on the ground (more grounded, easier to read as a battlefield).
7. **Name:** Asterwake, or something more village-like, such as Lanternhold, Hearthward, Emberfield or The Long Night. These are suggestions; availability has not been checked.

## 20. Relationship to the current prototype

The Milestone 1–2 build from revision 1 is not wasted, but its core building model is replaced:

- **Keep:** the save, backup, export/import and two-tab lock; offline catch-up and the return summary; the research bank and queue; villagers' portraits, traits, experience and roster screens; the toast, modal, settings, help and keyboard framework; the day/night lighting, sky, island terrain, decoration and camera; the audio engine; the test setup and GitHub Pages deployment.
- **Replace:** the plot grid, free placement, relocation and demolition; the power network; the generic building catalog (with the hand-composed village and building screens); and the space theme in models and text (with fantasy art).
- **New:** the battlefield grid and flow-field pathfinding, the enemy and projectile simulation, integrity, spawn points, maze placement with path preview, and wave scaling. This is the heart of Milestones 1 and 2.
