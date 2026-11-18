// Static game data: the battlefield, village buildings and enemies.
// Balance values live here so they can be tuned without touching code.

// The battlefield, in Defence-view world units. The village is small in the
// middle of a much larger field.
export const TILE = 0.85; // world units per battlefield tile
export const GRID = 53; // battlefield is GRID × GRID tiles centred on the village
export const WALL_R = 3.0; // radius of the village walls on the battlefield
export const FIELD_R = 21.6; // walkable battlefield radius
// The Village view shows the same village up close at this wall radius.
export const VIEW_WALL_R = 7.5;
export const MINI = WALL_R / VIEW_WALL_R; // scale of the miniature village in the Defence view
export const STEP = 0.05; // fixed simulation step (seconds)

export const DAY_LENGTH = 120;
export const FIRST_DAY = 60;
export const NIGHT_CAP = 180; // seconds after the first spawn before stragglers retreat
export const OFFLINE_CAP = 24 * 3600;
export const OFFLINE_REWARD = 0.75;
export const OFFLINE_CYCLE = 180; // assumed seconds per day+night while away
export const START_GOLD = 150;

// Hand-placed spawn points deep in the forest, each at the end of a path.
export const SPAWNS = [
  { id: 'hollow', name: 'Hollow Gate', pos: [0, -20.4], opens: 1, blurb: 'An old stone arch at the end of the northern path, its doorway full of moving dark.' },
  { id: 'moss', name: 'Mossy Cave', pos: [-19.6, 7], opens: 5, blurb: 'A cave mouth where the western path ends. Something breathes inside.' },
  { id: 'ravine', name: 'Ravine Stair', pos: [19.4, 8.5], opens: 12, blurb: 'Steps cut into the eastern ravine, worn by many feet that were not human.' },
  { id: 'kingsroad', name: 'Old King’s Road', pos: [-15, -15.5], opens: 18, blurb: 'The overgrown road from a kingdom nobody remembers.' },
  { id: 'bog', name: 'Bog Mouth', pos: [15.5, -15], opens: 24, blurb: 'A sinkhole in the north-eastern fen that bubbles at dusk.' },
  { id: 'arch', name: 'Sunken Arch', pos: [2, 20.6], opens: 30, blurb: 'Half-buried ruins at the end of the southern road, quiet for now.' },
];

// The village sits in a clearing; everything else is forest, crossed by paths.
// Paths are polylines [x, z] with a width; links between them make loops, so
// blocking one path later can force enemies onto another.
export const CLEAR_R = 6.2;
export const PATHS = [
  { id: 'north', w: 1.8, pts: [[0, -20.4], [-2.4, -16.4], [1.6, -12.4], [-0.6, -8.8], [0, -5.6]] },
  { id: 'west', w: 1.8, pts: [[-19.6, 7], [-15.2, 4.6], [-11.6, 6.6], [-8.2, 3.2], [-5.2, 1.8]] },
  { id: 'east', w: 1.8, pts: [[19.4, 8.5], [15.4, 10.6], [11.2, 8.2], [8.6, 9.4], [5.4, 3.8]] },
  { id: 'kings', w: 1.7, pts: [[-15, -15.5], [-11.2, -11.4], [-7.4, -11.8], [-5.2, -8.8], [-3.6, -5]] },
  { id: 'bog', w: 1.7, pts: [[15.5, -15], [12.2, -10.6], [8.2, -10.8], [5.6, -6.2], [3.4, -4.8]] },
  { id: 'south', w: 1.8, pts: [[2, 20.6], [-1.4, 16.4], [1.2, 12.4], [0, 8.6], [0, 5.8]] },
  { id: 'link-ne', w: 1.3, pts: [[1.6, -12.4], [4.6, -14.6], [8.2, -10.8]] },
  { id: 'link-nw', w: 1.3, pts: [[-2.4, -16.4], [-6.8, -14.6], [-11.2, -11.4]] },
  { id: 'link-sw', w: 1.3, pts: [[-11.6, 6.6], [-8.4, 11.8], [-4.2, 14.4], [-1.4, 16.4]] },
  { id: 'link-se', w: 1.3, pts: [[11.2, 8.2], [6.4, 13.2], [1.2, 12.4]] },
  { id: 'ring-w', w: 1.2, pts: [[-8.2, 3.2], [-9.6, -2.6], [-5.2, -8.8]] },
  { id: 'ring-e', w: 1.2, pts: [[8.6, 9.4], [10.4, 2.2], [9.6, -4.2], [8.2, -10.8]] },
];
export const LAKE = { x: 14.6, z: -1.8, r: 2.9 };

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
const ring = (deg, r = 5.2) => [Math.round(Math.cos((deg * Math.PI) / 180) * r * 100) / 100, Math.round(Math.sin((deg * Math.PI) / 180) * r * 100) / 100];

export const BUILDINGS = {
  townhall: { name: 'Town Hall', pos: ring(62, 5.1), start: 1, max: 5, blurb: 'The heart of the village. Its level sets how far every other building can grow.', upgradable: true },
  walls: { name: 'Walls & Gate', pos: [0, VIEW_WALL_R], start: 1, max: 10, blurb: 'The ring of walls is the village’s integrity. If it falls to zero, the night is lost.', upgradable: true },
  archery: { name: 'Great Tower', pos: [0, 0], start: 1, max: 10, blurb: 'The tall tower at the heart of the village. Its archers shoot at anything within range. The backbone of the defence.', upgradable: true },
  farmstead: { name: 'Farmstead', pos: ring(150), start: 1, max: 10, blurb: 'Fields, a barn and a very proud goat. Grows the village’s Food.', later: 'Food production and levels arrive with the village economy (Milestone 3).' },
  lumber: { name: 'Lumber Camp', pos: ring(30), start: 1, max: 10, blurb: 'Saws, stacks and sawdust. Supplies Timber for buildings and barricades.', later: 'Timber production and levels arrive with the village economy (Milestone 3).' },
  blacksmith: { name: 'Blacksmith', pos: ring(240), start: 0, blurb: 'Will craft, upgrade and salvage gear for defenders and expeditions.', later: 'Restored in Milestone 4.' },
  workshop: { name: 'Workshop', pos: ring(180), start: 0, blurb: 'Will build barricades, walls and traps for mazes on the battlefield.', later: 'Restored in Milestone 2.' },
  tavern: { name: 'Tavern', pos: ring(118, 5.1), start: 0, blurb: 'Will recruit villagers and send out expeditions.', later: 'Restored in Milestone 3.' },
  library: { name: 'Library', pos: ring(0), start: 0, blurb: 'Will produce Knowledge for research.', later: 'Restored in Milestone 5.' },
  storehouse: { name: 'Storehouse', pos: ring(315, 3.2), start: 0, blurb: 'Will store the village’s goods.', later: 'Restored in Milestone 3.' },
  quarry: { name: 'Quarry', pos: ring(210), start: 0, blurb: 'Will cut Stone for walls and buildings.', later: 'Restored in Milestone 3.' },
  mine: { name: 'Mine', pos: ring(270), start: 0, blurb: 'Will dig Iron for gear and traps.', later: 'Restored in Milestone 3.' },
  magetower: { name: 'Mage Tower', pos: ring(300), start: 0, blurb: 'Will cast area spells: firebolts and frost.', later: 'Restored in Milestone 5.' },
  temple: { name: 'Temple', pos: ring(330), start: 0, blurb: 'Will heal the walls between waves and bless the defenders.', later: 'Restored in Milestone 7.' },
  market: { name: 'Market', pos: ring(225, 3.2), start: 0, blurb: 'Will trade goods and host travelling merchants.', later: 'Restored in Milestone 7.' },
  watchtower: { name: 'Watchtower', pos: [0, -VIEW_WALL_R], start: 0, blurb: 'Will reveal what is coming and spot flying enemies.', later: 'Restored in Milestone 7.' },
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
    range: 8.5 + 0.4 * (level - 1),
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
