// Static game data: the battlefield, village buildings and enemies.
// Balance values live here so they can be tuned without touching code.

export const TILE = 0.85; // world units per battlefield tile
export const GRID = 41; // battlefield is GRID × GRID tiles centred on the village
export const WALL_R = 7.5; // radius of the village walls
export const FIELD_R = 16.6; // walkable battlefield radius
export const STEP = 0.05; // fixed simulation step (seconds)

export const DAY_LENGTH = 120;
export const FIRST_DAY = 60;
export const NIGHT_CAP = 180; // seconds after the first spawn before stragglers retreat
export const OFFLINE_CAP = 24 * 3600;
export const OFFLINE_REWARD = 0.75;
export const OFFLINE_CYCLE = 180; // assumed seconds per day+night while away
export const START_GOLD = 150;

// Hand-placed spawn points (angle in degrees: 0 = east, -90 = north/top of the default view).
export const SPAWNS = [
  { id: 'hollow', name: 'Hollow Gate', angle: -90, opens: 1, blurb: 'An old stone arch in the northern woods, its doorway full of moving dark.' },
  { id: 'moss', name: 'Mossy Cave', angle: 150, opens: 5, blurb: 'A cave mouth on the western slope. Something breathes inside.' },
  { id: 'ravine', name: 'Ravine Stair', angle: 30, opens: 12, blurb: 'Steps cut into the eastern ravine, worn by many feet that were not human.' },
  { id: 'kingsroad', name: 'Old King’s Road', angle: -150, opens: 18, blurb: 'The overgrown road from a kingdom nobody remembers.' },
  { id: 'bog', name: 'Bog Mouth', angle: -30, opens: 24, blurb: 'A sinkhole in the north-eastern fen that bubbles at dusk.' },
  { id: 'arch', name: 'Sunken Arch', angle: 90, opens: 30, blurb: 'Half-buried ruins south of the gate, quiet for now.' },
];
export const SPAWN_R = 15.6;

export const ENEMIES = {
  goblin: { name: 'Goblin', plural: 'Goblins', hp: 12, speed: 0.85, dmg: 4, rate: 1.0, armor: 0, gold: 2, size: 0.22, first: 1, blurb: 'Small, numerous and greedy. They hammer at the walls with whatever they found.' },
  wolf: { name: 'Wolf', plural: 'Wolves', hp: 8, speed: 1.75, dmg: 3, rate: 1.25, armor: 0, gold: 3, size: 0.25, first: 3, blurb: 'Fast and fragile. They reach the walls long before the goblins.' },
};

export const SCALING = {
  hp: 1.16, // per night
  dmg: 1.06, // per night
  gold: 0.08, // +8% of base per night
};

// Buildings and where they stand. Positions are world units from the village centre.
const ring = (deg, r = 4.9) => [Math.round(Math.cos((deg * Math.PI) / 180) * r * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * r * 100) / 100];

export const BUILDINGS = {
  townhall: { name: 'Town Hall', pos: [0, 0], start: 1, max: 5, blurb: 'The heart of the village. Its level sets how far every other building can grow.', upgradable: true },
  walls: { name: 'Walls & Gate', pos: [0, 0], start: 1, max: 10, blurb: 'The ring of walls is the village’s integrity. If it falls to zero, the night is lost.', upgradable: true },
  archery: { name: 'Archery Tower', pos: [1.75, -1.65], start: 1, max: 10, blurb: 'Archers shoot at anything within range of the village. The backbone of the defence.', upgradable: true },
  farmstead: { name: 'Farmstead', pos: ring(150), start: 1, max: 10, blurb: 'Fields, a barn and a very proud goat. Grows the village’s Food.', later: 'Food production and levels arrive with the village economy (Milestone 3).' },
  lumber: { name: 'Lumber Camp', pos: ring(30), start: 1, max: 10, blurb: 'Saws, stacks and sawdust. Supplies Timber for buildings and barricades.', later: 'Timber production and levels arrive with the village economy (Milestone 3).' },
  blacksmith: { name: 'Blacksmith', pos: ring(240), start: 0, blurb: 'Will craft, upgrade and salvage gear for defenders and expeditions.', later: 'Restored in Milestone 4.' },
  workshop: { name: 'Workshop', pos: ring(180), start: 0, blurb: 'Will build barricades, walls and traps for mazes on the battlefield.', later: 'Restored in Milestone 2.' },
  tavern: { name: 'Tavern', pos: ring(118, 5.0), start: 0, blurb: 'Will recruit villagers and send out expeditions.', later: 'Restored in Milestone 3.' },
  library: { name: 'Library', pos: ring(0), start: 0, blurb: 'Will produce Knowledge for research.', later: 'Restored in Milestone 5.' },
  storehouse: { name: 'Storehouse', pos: [-1.8, -1.6], start: 0, blurb: 'Will store the village’s goods.', later: 'Restored in Milestone 3.' },
  quarry: { name: 'Quarry', pos: ring(210), start: 0, blurb: 'Will cut Stone for walls and buildings.', later: 'Restored in Milestone 3.' },
  mine: { name: 'Mine', pos: ring(270), start: 0, blurb: 'Will dig Iron for gear and traps.', later: 'Restored in Milestone 3.' },
  magetower: { name: 'Mage Tower', pos: ring(300), start: 0, blurb: 'Will cast area spells: firebolts and frost.', later: 'Restored in Milestone 5.' },
  temple: { name: 'Temple', pos: ring(330), start: 0, blurb: 'Will heal the walls between waves and bless the defenders.', later: 'Restored in Milestone 7.' },
  market: { name: 'Market', pos: ring(62, 5.0), start: 0, blurb: 'Will trade goods and host travelling merchants.', later: 'Restored in Milestone 7.' },
  watchtower: { name: 'Watchtower', pos: [0, -WALL_R], start: 0, blurb: 'Will reveal what is coming and spot flying enemies.', later: 'Restored in Milestone 7.' },
};
export const BUILDING_ORDER = Object.keys(BUILDINGS);

export const UPGRADES = {
  townhall: { cost: [150, 500, 1400, 3500], time: (L) => 30 * 1.5 ** (L - 1) },
  walls: { cost: (L) => Math.ceil(50 * 1.6 ** (L - 1)), time: (L) => 20 * 1.3 ** (L - 1) },
  archery: { cost: (L) => Math.ceil(40 * 1.6 ** (L - 1)), time: (L) => 15 * 1.3 ** (L - 1) },
};
export const QUEUE_MAX = 4; // one building + three waiting

export function archeryStats(level) {
  return {
    dmg: 4 * 1.3 ** (level - 1),
    rate: 1 + 0.08 * (level - 1), // shots per second
    range: 11 + 0.35 * (level - 1),
    shots: level >= 5 ? 2 : 1,
    pierce: level >= 10,
  };
}

export function wallStats(level) {
  return {
    integrity: Math.round(500 * 1.25 ** (level - 1)),
    armor: level - 1,
  };
}

export const TARGETING = {
  first: { name: 'Closest to the walls', blurb: 'Shoots whatever is about to reach the walls.' },
  strongest: { name: 'Strongest', blurb: 'Focuses the toughest enemy in range.' },
  fastest: { name: 'Fastest', blurb: 'Picks off wolves and other quick enemies first.' },
};
