// The cards dealt after every night held. Each card belongs to one family and
// carries tags; a few cards with the same tag unlock a synergy. Numbers are a
// first pass, tuned with tools/balance (see test/sim.test.mjs for the rules).
//
// Families
//   defender  stands on the Great Tower and shoots from there
//   spell     active (cast by clicking the glass, with a cooldown) or passive
//   toolkit   things for the forest paths (barricades for now)
//   fortify   the walls and gate
//   tower     upgrades to the Great Tower's own bow, for the rest of the run

export const FAMILIES = {
  defender: { name: 'Defender', plural: 'Defenders', building: 'archery' },
  spell: { name: 'Spell', plural: 'Spells', building: 'shrine' },
  toolkit: { name: 'Toolkit', plural: 'Toolkit', building: 'workshop' },
  fortify: { name: 'Fortify', plural: 'Fortify', building: 'walls' },
  tower: { name: 'Tower', plural: 'Tower', building: 'archery' },
};

export const RARITY = {
  common: { name: 'Common', weight: 70 },
  rare: { name: 'Rare', weight: 25 },
  epic: { name: 'Epic', weight: 5 },
};

// What every run starts with.
export const BASE = {
  tower: { dmg: 7, range: 10, rate: 1, shots: 1 },
  walls: { integrity: 500, armor: 0, thorns: 0 },
  barricades: 2,
  rerolls: 2,
};

const card = (id, family, rarity, name, text, tags, fx) => ({ id, family, rarity, name, text, tags, ...fx });

// Every number here is for night 1. Everything the village does (damage,
// walls, thorns, spells) grows by POWER_GROWTH a night, so no card fades.
// Each card is worth taking on its own; its tags push a run in a direction.
export const CARDS = [
  // ----- defenders: each one another shooter on the tower -----
  card('archer', 'defender', 'common', 'Archer', 'Steady arrows at long reach', ['bow'], { shooter: { dmg: 4.8, rate: 1, range: 10 } }),
  card('hunter', 'defender', 'common', 'Hunter', 'Triple damage to wolves and trolls', ['bow'], { shooter: { dmg: 3.5, rate: 1, range: 11, vsBeast: 3 } }),
  card('axe', 'defender', 'common', 'Axe Thrower', 'Heavy axes, short reach', ['iron'], { shooter: { dmg: 13, rate: 0.5, range: 7 } }),
  card('crossbow', 'defender', 'rare', 'Crossbow', 'Bolts go through a second creature', ['iron', 'bow'], { shooter: { dmg: 11, rate: 0.55, range: 12, pierce: true } }),
  card('mage', 'defender', 'rare', 'Mage', 'Fire that splashes and burns', ['fire'], { shooter: { dmg: 5.2, rate: 0.6, range: 9, splash: 1.8, burn: 2.5 } }),
  card('witch', 'defender', 'epic', 'Frost Witch', 'Chills a group, slowing it', ['frost'], { shooter: { dmg: 5.5, rate: 0.8, range: 9.5, splash: 1.5, slow: 0.4 } }),

  // ----- spells: a second copy makes the spell stronger -----
  card('firebolt', 'spell', 'common', 'Firebolt', 'Click the glass: fire bursts there', ['fire'], { spell: { active: true, cd: 9, radius: 1.9, dmg: 50, burn: 4 } }),
  card('snare', 'spell', 'common', 'Root Snare', 'Click the glass: roots hold creatures', ['frost'], { spell: { active: true, cd: 11, radius: 2.2, root: 5, dmg: 35 } }),
  card('mend', 'spell', 'rare', 'Mend Walls', 'Click: the walls regain half', ['stone'], { spell: { active: true, cd: 14, mend: 0.5, self: true } }),
  card('emberward', 'spell', 'rare', 'Ember Ward', 'Creatures near the walls burn', ['fire'], { spell: { aura: 'burn', dps: 7.5, radius: 5.5 } }),
  card('frostward', 'spell', 'rare', 'Frost Ward', 'Creatures near the village slow down', ['frost'], { spell: { aura: 'slow', slow: 0.36, radius: 8.5 } }),

  // ----- toolkit: the paths -----
  card('barricade', 'toolkit', 'common', 'Barricade', 'One more barricade, and stakes along the paths', ['maze'], { barricades: 1, spikes: 0.1 }),
  card('spikes', 'toolkit', 'common', 'Spike Pits', 'Creatures are hurt for every pace they walk', ['maze'], { spikes: 0.25 }),
  card('tar', 'toolkit', 'rare', 'Tar Paths', 'Creatures walk the paths 10% slower', ['maze', 'frost'], { tar: 0.1 }),
  card('cart', 'toolkit', 'rare', 'Barricade Cart', 'Two more barricades, and stakes along the paths', ['maze'], { barricades: 2, spikes: 0.1 }),

  // ----- fortify: the walls hold, and hurt what hits them -----
  card('footings', 'fortify', 'common', 'Stone Footings', 'Walls 2.3 times as strong', ['stone'], { walls: { integrity: 650 } }),
  card('palisade', 'fortify', 'common', 'Palisade', 'Walls +50% and sharp stakes', ['stone'], { walls: { integrity: 250, thorns: 4 } }),
  card('thorns', 'fortify', 'rare', 'Thorn Hedge', 'Attackers take damage every hit', ['stone'], { walls: { thorns: 12 } }),
  card('irongate', 'fortify', 'rare', 'Iron Gate', 'Walls +40% and take a third less damage', ['iron', 'stone'], { walls: { armor: 5, integrity: 200 } }),
  card('oil', 'fortify', 'rare', 'Boiling Oil', 'Burns creatures at the walls', ['fire', 'stone'], { walls: { oil: 5 } }),

  // ----- tower: the Great Tower's own bow, and a little for everyone -----
  card('lookout', 'tower', 'common', 'Lookout', 'Every shooter reaches further', ['bow'], { tower: { range: 2.2, dmg: 0.5 } }),
  card('quick', 'tower', 'common', 'Quick Hands', 'The tower shoots 50% faster', ['bow'], { tower: { rate: 0.5 }, all: { rate: 0.05 } }),
  card('heavy', 'tower', 'common', 'Heavy Arrows', 'Tower arrows +85% damage', ['iron'], { tower: { dmg: 0.85 }, all: { dmg: 0.06 } }),
  card('firearrows', 'tower', 'rare', 'Fire Arrows', 'Every shooter sets creatures alight', ['fire'], { tower: { dmg: 0.4, burn: 1.5 }, all: { burn: 1.6 } }),
  card('twin', 'tower', 'epic', 'Twin String', 'The tower looses two arrows at once', ['bow'], { tower: { shots: 1, dmg: 0.15 }, all: { dmg: 0.08 } }),
];

export const CARD = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// A few cards with the same tag unlock a bonus for the rest of the run.
// Two tiers: the first at `need` cards with the tag, the second at `need2`.
export const SYNERGIES = [
  { tag: 'bow', need: 3, need2: 5, name: 'Volley', text: 'Every shooter shoots 35% faster', text2: '90% faster' },
  { tag: 'fire', need: 3, need2: 5, name: 'Wildfire', text: 'All burning is twice as hot', text2: 'over three times as hot' },
  { tag: 'frost', need: 2, need2: 4, name: 'Shatter', text: 'Slowed and rooted creatures take 40% more damage', text2: 'twice the damage' },
  { tag: 'iron', need: 3, need2: 5, name: 'Ironworks', text: 'Shots ignore armour; every shooter +25% damage', text2: '+75% damage' },
  { tag: 'stone', need: 3, need2: 5, name: 'Bulwark', text: 'Walls +25%; thorns and oil twice as strong', text2: 'walls +60%, three times as strong' },
  { tag: 'maze', need: 2, need2: 4, name: 'Labyrinth', text: 'One more barricade; spikes 2.5 times as sharp', text2: 'two more, five times as sharp' },
];

export const TAG_NAMES = { bow: 'Bow', fire: 'Fire', frost: 'Frost', iron: 'Iron', stone: 'Stone', maze: 'Maze' };
