// Static game data: the Watch, village buildings and enemies.
// Balance values live here so they can be tuned without touching code.

// The Watch: the forest around the village, crossed by the path web
// (js/data/web.js). Units: the village walls have radius 3.
export const WALL_R = 3.0;
export const FIELD_R = 33.6; // what the reading glass shows
export const BARRICADES = 3; // barricades the village can place (the Workshop will raise this)
export const STEP = 0.05; // fixed simulation step (seconds)

export const DAY_LENGTH = 120;
export const FIRST_DAY = 60;
export const NIGHT_CAP = 180; // seconds after the first spawn before stragglers retreat
export const OFFLINE_CAP = 24 * 3600;
export const OFFLINE_REWARD = 0.75;
export const OFFLINE_CYCLE = 180; // assumed seconds per day+night while away
export const START_GOLD = 150;

// Burrows at the edge of the glass, each a node of the path web.
export const SPAWNS = [
  { id: 'hollow', node: 's0', name: 'Hollow Gate', opens: 1, blurb: 'An old stone arch in the north, its doorway full of moving dark.' },
  { id: 'moss', node: 's1', name: 'Mossy Cave', opens: 5, blurb: 'A cave mouth in the west. Something breathes inside.' },
  { id: 'ravine', node: 's2', name: 'Ravine Stair', opens: 12, blurb: 'Steps cut into the eastern ravine, worn by many feet that were not human.' },
  { id: 'kingsroad', node: 's3', name: 'Old King’s Road', opens: 18, blurb: 'The overgrown road from a kingdom nobody remembers.' },
  { id: 'bog', node: 's4', name: 'Bog Mouth', opens: 24, blurb: 'A sinkhole in the north-eastern fen that bubbles at dusk.' },
  { id: 'arch', node: 's5', name: 'Sunken Arch', opens: 30, blurb: 'Half-buried ruins in the south, quiet for now.' },
];

export const ENEMIES = {
  goblin: { name: 'Goblin', plural: 'Goblins', hp: 12, speed: 1.25, dmg: 4, rate: 1.0, armor: 0, gold: 2, size: 0.22, first: 1, blurb: 'Small, numerous and greedy. They hammer at the walls with whatever they found.' },
  wolf: { name: 'Wolf', plural: 'Wolves', hp: 8, speed: 2.5, dmg: 3, rate: 1.25, armor: 0, gold: 3, size: 0.25, first: 3, blurb: 'Fast and fragile. They reach the walls long before the goblins.' },
};

export const SCALING = {
  hp: 1.16, // per night
  dmg: 1.06, // per night
  gold: 0.08, // +8% of base per night
};

// Buildings and where they stand. Positions are world units from the village centre.
const ring = (deg, r = 5.2) => [Math.round(Math.cos((deg * Math.PI) / 180) * r * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * r * 100) / 100];

export const BUILDINGS = {
  townhall: { name: 'Town Hall', pos: ring(62, 5.1), start: 1, max: 5, blurb: 'The heart of the village. Its level sets how far every other building can grow.', upgradable: true },
  walls: { name: 'Walls & Gate', pos: [0, WALL_R], start: 1, max: 10, blurb: 'The ring of walls is the village’s integrity. If it falls to zero, the night is lost.', upgradable: true },
  archery: { name: 'Great Tower', pos: [0, 0], start: 1, max: 10, blurb: 'The tall tower at the heart of the village. Its archers shoot at anything within range. The backbone of the defence.', upgradable: true },
  farmstead: { name: 'Farmstead and Mill', pos: ring(150), start: 1, max: 10, blurb: 'A red barn, crop rows, a scarecrow, and the water mill on the stream.', later: 'Food production and levels arrive with the village economy (Milestone 4).' },
  lumber: { name: 'Lumber Camp', pos: ring(30), start: 1, max: 10, blurb: 'A lean-to, a log pile and an axe left in a stump. Supplies Timber for buildings and barricades.', later: 'Timber production and levels arrive with the village economy (Milestone 4).' },
  blacksmith: { name: 'Blacksmith', pos: ring(240), start: 0, blurb: 'A fallen-in forge by the east bridge, its anvil still there under the ivy. Restored, it crafts and mends gear for the villager cards.', later: 'Restored in Milestone 4.' },
  workshop: { name: 'Workshop', pos: ring(180), start: 0, blurb: 'A collapsed shed by the mill. Restored, it builds more barricades, stone barricades and traps for the forest paths.', later: 'Restored in a coming update.' },
  tavern: { name: 'Tavern', pos: ring(118, 5.1), start: 1, blurb: 'Two storeys of old timber with a mug over the door. Warm, loud and the best place to hear rumours.', later: 'Recruiting villagers and forming expedition parties arrive with the villager cards (Milestone 3).' },
  library: { name: 'Library', pos: ring(0), start: 1, blurb: 'A blue-domed stone house on the terrace, reached by lit stairs. Full of maps nobody has finished reading.', later: 'Knowledge and research arrive in Milestone 6.' },
  storehouse: { name: 'Storehouse', pos: ring(315, 3.2), start: 1, blurb: 'A small shed of crates and sacks.', later: 'Storage arrives with the village economy (Milestone 4).' },
  quarry: { name: 'Quarry', pos: ring(210), start: 0, blurb: 'Will cut Stone for walls and buildings.', later: 'Restored in Milestone 3.' },
  mine: { name: 'Mine', pos: ring(270), start: 0, blurb: 'Will dig Iron for gear and traps.', later: 'Restored in Milestone 3.' },
  magetower: { name: 'Mage Tower', pos: ring(300), start: 0, blurb: 'A crooked, broken tower among humming crystals. Restored, it will cast firebolts and frost.', later: 'Restored in Milestone 6.' },
  temple: { name: 'Standing Stones', pos: ring(330), start: 0, blurb: 'A ring of runestones that have gone dark. Lit again, they will heal the walls between waves and bless the defenders.', later: 'Restored in Milestone 6.' },
  market: { name: 'Market stall', pos: ring(225, 3.2), start: 1, blurb: 'One stall, one awning and whatever the forest gave this week.', later: 'Trade and travelling merchants arrive in Milestone 7.' },
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
    range: 10.5 + 0.5 * (level - 1),
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
