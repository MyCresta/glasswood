// Static game data: the Watch, village buildings and enemies.
// Balance values live here so they can be tuned without touching code.

// The Watch: the forest around the village, crossed by the path web
// (js/data/web.js). Units: the village walls have radius 3.
export const WALL_R = 3.0;
export const FIELD_R = 33.6; // what the reading glass shows
export const STEP = 0.05; // fixed simulation step (seconds)

export const DAY_LENGTH = 120;
export const FIRST_DAY = 60;
export const NIGHT_CAP = 180; // seconds after the first spawn before stragglers retreat
export const OFFLINE_CAP = 24 * 3600;
export const OFFLINE_REWARD = 0.75;
export const OFFLINE_CYCLE = 180; // assumed seconds per day+night while away

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
  hp: 1.12, // per night
  dmg: 1.05, // per night
  gold: 0.08, // +8% of base per night
};

// ---------- the village ----------
// Every level is a milestone with its own cost, build time and a visible gain.
// levels[L] describes the building AT level L and what it took to get there
// (cost and time are paid to reach L). Level 0 is a ruin.
// Times: minutes for the first restorations, hours for the later levels.
const M = 60, H = 3600;
export const RESOURCES = ['gold', 'timber', 'stone'];

export const BUILDINGS = {
  archery: {
    name: 'Great Tower', start: 1, job: 'archer', jobs: 'Archers', pos: [0, 0],
    blurb: 'The tower at the heart of the village. Villagers posted here shoot at anything in reach.',
    levels: [
      null,
      { gain: 'A stump of a tower, room for one archer', slots: 1, range: 9, dmg: 4 },
      { gain: 'A lookout: more reach, room for two archers', slots: 2, range: 10.5, dmg: 4, cost: { gold: 60, timber: 30 }, time: 3 * M },
      { gain: 'A second floor: room for three archers', slots: 3, range: 10.5, dmg: 4.5, cost: { gold: 140, timber: 60, stone: 30 }, time: 15 * M },
      { gain: 'Fire arrows: half again the damage', slots: 3, range: 11, dmg: 6.5, cost: { gold: 300, timber: 100, stone: 80 }, time: 45 * M },
      { gain: 'The full tower: more reach, room for four', slots: 4, range: 12, dmg: 7, cost: { gold: 600, timber: 180, stone: 160 }, time: 2 * H },
      { gain: 'Every archer looses two arrows', slots: 4, range: 12, dmg: 7.5, shots: 2, cost: { gold: 1100, timber: 300, stone: 300 }, time: 6 * H },
    ],
  },
  walls: {
    name: 'Walls & Gate', start: 1,
    blurb: 'If the walls fall to nothing, the night is lost. They are mended at every dawn.',
    levels: [
      null,
      { gain: 'A ring of stakes and a wicker gate', integrity: 500, armor: 0 },
      { gain: 'Stone footings: stronger, and armour against every hit', integrity: 650, armor: 1, cost: { gold: 50, timber: 20, stone: 20 }, time: 4 * M },
      { gain: 'A dry-stone wall', integrity: 850, armor: 1, cost: { gold: 120, timber: 40, stone: 60 }, time: 20 * M },
      { gain: 'A gatehouse: more armour', integrity: 1100, armor: 2, cost: { gold: 260, timber: 80, stone: 140 }, time: 1 * H },
      { gain: 'High walls with a walk on top', integrity: 1500, armor: 3, cost: { gold: 550, timber: 150, stone: 280 }, time: 3 * H },
      { gain: 'Towers on the walls', integrity: 2000, armor: 4, cost: { gold: 1000, timber: 260, stone: 500 }, time: 8 * H },
    ],
  },
  townhall: {
    name: 'Town Hall', start: 0,
    blurb: 'The heart of the village. Its level sets how far every other building can grow.',
    levels: [
      { gain: 'A collapsed hall', cap: 1, builders: 1 },
      { gain: 'Buildings can grow to level 2', cap: 2, builders: 1, cost: { gold: 80, timber: 30, stone: 10 }, time: 3 * M },
      { gain: 'A second builder; buildings can grow to level 3', cap: 3, builders: 2, cost: { gold: 250, timber: 80, stone: 50 }, time: 20 * M },
      { gain: 'Buildings can grow to level 4', cap: 4, builders: 2, cost: { gold: 450, timber: 200, stone: 150 }, time: 1 * H },
      { gain: 'Buildings can grow to level 5', cap: 5, builders: 2, cost: { gold: 900, timber: 350, stone: 300 }, time: 3 * H },
      { gain: 'Buildings can grow to level 6', cap: 6, builders: 2, cost: { gold: 1600, timber: 550, stone: 550 }, time: 8 * H },
    ],
  },
  tavern: {
    name: 'Tavern', start: 0,
    blurb: 'Warm, loud and where travellers stop. With room to spare, one settles here after every night you hold.',
    levels: [
      { gain: 'A roofless shell. Two villagers sleep by the fire', housing: 2 },
      { gain: 'Beds for four', housing: 4, cost: { gold: 60, timber: 40 }, time: 3 * M },
      { gain: 'Beds for six', housing: 6, cost: { gold: 150, timber: 90, stone: 40 }, time: 20 * M },
      { gain: 'Beds for eight', housing: 8, cost: { gold: 380, timber: 160, stone: 120 }, time: 90 * M },
      { gain: 'Beds for ten', housing: 10, cost: { gold: 800, timber: 280, stone: 240 }, time: 4 * H },
    ],
  },
  lumber: {
    name: 'Lumber Camp', start: 0, job: 'woodcutter', jobs: 'Woodcutters', makes: 'timber',
    blurb: 'Villagers posted here cut Timber for building and repairs.',
    levels: [
      { gain: 'An axe in a stump', slots: 0, per: 0 },
      { gain: 'Room for one woodcutter', slots: 1, per: 6, cost: { gold: 30 }, time: 1 * M },
      { gain: 'Room for two', slots: 2, per: 6, cost: { gold: 80, timber: 30, stone: 10 }, time: 8 * M },
      { gain: 'A sawpit: more timber each', slots: 2, per: 9, cost: { gold: 200, timber: 100, stone: 50 }, time: 40 * M },
      { gain: 'Room for three', slots: 3, per: 9, cost: { gold: 450, timber: 180, stone: 120 }, time: 2 * H },
    ],
  },
  quarry: {
    name: 'Quarry', start: 0, job: 'mason', jobs: 'Masons', makes: 'stone',
    blurb: 'Villagers posted here cut Stone for walls and buildings.',
    levels: [
      { gain: 'An overgrown pit', slots: 0, per: 0 },
      { gain: 'Room for one mason', slots: 1, per: 4, cost: { gold: 40, timber: 30 }, time: 2 * M },
      { gain: 'Room for two', slots: 2, per: 4, cost: { gold: 100, timber: 60, stone: 20 }, time: 10 * M },
      { gain: 'A crane: more stone each', slots: 2, per: 6, cost: { gold: 250, timber: 120, stone: 60 }, time: 50 * M },
      { gain: 'Room for three', slots: 3, per: 6, cost: { gold: 500, timber: 220, stone: 140 }, time: 2 * H },
    ],
  },
  workshop: {
    name: 'Workshop', start: 0,
    blurb: 'Builds the barricades you place on the forest paths.',
    levels: [
      { gain: 'A collapsed shed', barricades: 0 },
      { gain: 'One barricade', barricades: 1, cost: { gold: 60, timber: 40, stone: 10 }, time: 3 * M },
      { gain: 'Two barricades', barricades: 2, cost: { gold: 150, timber: 100, stone: 40 }, time: 25 * M },
      { gain: 'Three barricades', barricades: 3, cost: { gold: 400, timber: 200, stone: 140 }, time: 2 * H },
      { gain: 'Four barricades', barricades: 4, cost: { gold: 900, timber: 350, stone: 300 }, time: 6 * H },
    ],
  },
};
for (const b of Object.values(BUILDINGS)) b.max = b.levels.length - 1;
export const BUILDING_ORDER = Object.keys(BUILDINGS);
export const level = (id, L) => BUILDINGS[id].levels[Math.max(0, Math.min(L, BUILDINGS[id].max))] || {};

export const START = { gold: 100, timber: 60, stone: 20 };
export const START_GOLD = START.gold;
export const VILLAGERS = { start: [['Wren', 'archer'], ['Bram', 'idle']], names: ['Ivy', 'Tobin', 'Moss', 'Hazel', 'Corin', 'Fen', 'Alder', 'Rook', 'Juniper', 'Pip', 'Sorrel', 'Briar', 'Wick', 'Linnet', 'Ash', 'Marigold'] };
export const QUEUE_MAX = 4; // building + waiting, across all builders

// The tower with `archers` villagers posted: each archer shoots `rate` times a second.
export function archeryStats(L, archers = level('archery', L).slots) {
  const v = level('archery', L);
  return { dmg: v.dmg, range: v.range, rate: 1, shots: v.shots || 1, pierce: false, slots: v.slots, archers: Math.min(archers, v.slots) };
}

export function wallStats(L) {
  const v = level('walls', L);
  return { integrity: v.integrity, armor: v.armor };
}

export const TARGETING = {
  first: { name: 'Closest to the walls', blurb: 'Shoots whatever is about to reach the walls.' },
  strongest: { name: 'Strongest', blurb: 'Focuses the toughest enemy in range.' },
  fastest: { name: 'Fastest', blurb: 'Picks off wolves and other quick enemies first.' },
};

// Which drawing of a building shows at a level: 0 ruin (or the first, humble
// version), 1 restored, 2 grown. The art lives in assets/b-<id>-<stage>.webp.
export function stage(bid, L) {
  if (bid === 'archery') return L <= 1 ? 0 : L <= 3 ? 1 : 2;
  if (bid === 'walls') return L <= 1 ? 0 : L <= 4 ? 1 : 2;
  return L === 0 ? 0 : L <= 2 ? 1 : 2;
}
