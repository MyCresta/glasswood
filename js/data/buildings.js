// Building catalog — level-one values from the design plan (section 7.2).
// Rates are per minute. Costs are in Metal unless stated.

export const RESOURCES = ['metal', 'fuel', 'food'];

export const RESOURCE_INFO = {
  metal: { name: 'Metal', icon: '◆', color: '#b4bfcc' },
  fuel: { name: 'Fuel', icon: '▲', color: '#e6a640' },
  food: { name: 'Food', icon: '●', color: '#8fcb6b' },
  research: { name: 'Research', icon: '✦', color: '#98abff' },
  power: { name: 'Power', icon: 'ϟ', color: '#f2d65c' },
  samples: { name: 'Samples', icon: '⬢', color: '#c99ae8' },
  housing: { name: 'Housing', icon: '⌂', color: '#e8c6a0' },
};

// Power-priority category order: food first, then fuel, extraction, research, other.
export const POWER_CATEGORY_ORDER = { farm: 0, refinery: 1, extractor: 2, lab: 3 };

export const BUILDINGS = {
  hq: {
    name: 'Headquarters',
    blurb: 'The heart of the colony. Houses two colonists, stores basic goods, supplies a little power and runs relief work for anyone without a job.',
    cost: {}, time: 0,
    powerSupply: 2, housing: 2,
    storage: { metal: 200, food: 100, fuel: 60, samples: 10 },
    maxLevel: 3, buildable: false, movable: false, staffed: false,
  },
  extractor: {
    name: 'Extractor',
    blurb: 'Drills the crust for Metal.',
    cost: { metal: 60 }, time: 20,
    output: { metal: 12 }, powerUse: 2, profession: 'miner', staffed: true,
    maxLevel: 10, buildable: true,
  },
  farm: {
    name: 'Hydroponic Farm',
    blurb: 'Grows Food under warm lights. Any colonist helps here.',
    cost: { metal: 40 }, time: 20,
    output: { food: 3 }, powerUse: 1, profession: null, staffed: true,
    maxLevel: 10, buildable: true,
  },
  lab: {
    name: 'Laboratory',
    blurb: 'Produces Research for the civilization’s shared bank.',
    cost: { metal: 90 }, time: 30,
    output: { research: 3 }, powerUse: 2, profession: 'scientist', staffed: true,
    maxLevel: 10, buildable: true,
  },
  solar: {
    name: 'Solar Array',
    blurb: 'Dependable power, day and night. Needs no staff.',
    cost: { metal: 50 }, time: 15,
    powerSupply: 6, staffed: false,
    maxLevel: 10, buildable: true,
  },
  refinery: {
    name: 'Fuel Refinery',
    blurb: 'Turns Metal into Fuel. Slows down instead of wasting Metal when inputs run short.',
    cost: { metal: 100 }, time: 30,
    input: { metal: 4 }, output: { fuel: 2 }, powerUse: 2, profession: 'engineer', staffed: true,
    maxLevel: 10, buildable: true, requires: 'fuel_refining',
  },
  depot: {
    name: 'Storage Depot',
    blurb: 'Adds storage for Metal, Food, Fuel and samples.',
    cost: { metal: 50 }, time: 15,
    storage: { metal: 400, food: 200, fuel: 120, samples: 20 }, staffed: false,
    maxLevel: 10, buildable: true,
  },
  habitat: {
    name: 'Habitat',
    blurb: 'Homes for four colonists, plus one more per level.',
    cost: { metal: 70 }, time: 30,
    housing: 4, staffed: false,
    maxLevel: 10, buildable: true,
  },
  // Defined for later milestones; not yet constructible.
  spaceport: { name: 'Spaceport', blurb: 'Ship operations.', cost: { metal: 150 }, time: 60, powerUse: 1, maxLevel: 10, buildable: false, future: 'Arrives with the System Map (Milestone 3).', requires: 'orbital_surveying' },
  observatory: { name: 'Observatory', blurb: 'Faster discovery scanning.', cost: { metal: 180 }, time: 60, powerUse: 2, maxLevel: 10, buildable: false, future: 'Arrives with deeper exploration (Milestone 5).', requires: 'deep_scanning' },
  reactor: { name: 'Reactor', blurb: 'Burns Fuel for lots of power.', cost: { metal: 250, fuel: 30 }, time: 90, powerSupply: 18, maxLevel: 10, buildable: false, future: 'Arrives with Compact Reactors (Milestone 5).', requires: 'compact_reactors' },
  defense: { name: 'Defense Array', blurb: 'Local defense rating.', cost: { metal: 200, fuel: 20 }, time: 60, powerUse: 2, maxLevel: 10, buildable: false, future: 'Arrives with strategic danger (Milestone 7).', requires: 'defensive_coordination' },
};

export const BUILD_ORDER = ['extractor', 'farm', 'solar', 'lab', 'depot', 'habitat', 'refinery', 'spaceport', 'observatory', 'reactor', 'defense'];

export const HQ_UPGRADES = {
  2: { cost: { metal: 300 }, time: 120, requires: 'expanded_settlements', plots: 25 },
  3: { cost: { metal: 900 }, time: 300, requires: 'mature_settlements', plots: 36 },
};

export const LEVEL_OUTPUT = 1.25;
export const LEVEL_DEMAND = 1.15;
export const LEVEL_STORAGE = 1.5;
export const UPGRADE_COST = 1.6;
export const UPGRADE_TIME = 1.35;
export const QUEUE_EXTRA = 4; // one active + four queued
