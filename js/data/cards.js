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
  tower: { dmg: 4, range: 9.5, rate: 1, shots: 1 },
  walls: { integrity: 500, armor: 0, thorns: 0 },
  barricades: 2,
  rerolls: 2,
};

const card = (id, family, rarity, name, text, tags, fx) => ({ id, family, rarity, name, text, tags, ...fx });

export const CARDS = [
  // ----- defenders: each one is another shooter on the tower -----
  card('archer', 'defender', 'common', 'Archer', 'Steady arrows at long reach', [], { shooter: { dmg: 4, rate: 1, range: 10 } }),
  card('axe', 'defender', 'common', 'Axe Thrower', 'Heavy axes, short reach', ['iron'], { shooter: { dmg: 11, rate: 0.5, range: 6.5 } }),
  card('hunter', 'defender', 'common', 'Hunter', 'Double damage to beasts', ['beast'], { shooter: { dmg: 4, rate: 1, range: 10.5, vsBeast: 2 } }),
  card('crossbow', 'defender', 'rare', 'Crossbow', 'Bolts pierce a second creature', ['iron'], { shooter: { dmg: 9, rate: 0.45, range: 12, pierce: true } }),
  card('mage', 'defender', 'rare', 'Mage', 'Fire that splashes nearby creatures', ['fire'], { shooter: { dmg: 6, rate: 0.6, range: 9, splash: 1.3, burn: 2 } }),
  card('witch', 'defender', 'epic', 'Frost Witch', 'Chills a group, slowing it', ['frost'], { shooter: { dmg: 3, rate: 0.8, range: 9, splash: 1, slow: 0.4 } }),

  // ----- spells -----
  card('firebolt', 'spell', 'common', 'Firebolt', 'Click the glass: fire bursts there', ['fire'], { spell: { active: true, cd: 12, radius: 1.6, dmg: 30, burn: 3 } }),
  card('snare', 'spell', 'common', 'Root Snare', 'Click the glass: roots hold creatures still', ['nature'], { spell: { active: true, cd: 16, radius: 1.8, root: 3 } }),
  card('mend', 'spell', 'rare', 'Mend Walls', 'Click: the walls regain a fifth', [], { spell: { active: true, cd: 24, mend: 0.2, self: true } }),
  card('emberward', 'spell', 'rare', 'Ember Ward', 'Creatures at the walls burn', ['fire'], { spell: { aura: 'burn', dps: 5, radius: 4.6 } }),
  card('frostward', 'spell', 'rare', 'Frost Ward', 'Creatures near the village slow down', ['frost'], { spell: { aura: 'slow', slow: 0.3, radius: 7 } }),

  // ----- toolkit -----
  card('barricade', 'toolkit', 'common', 'Barricade', 'One more barricade', ['iron'], { barricades: 1 }),
  card('cart', 'toolkit', 'rare', 'Barricade Cart', 'Two more barricades', ['iron'], { barricades: 2 }),

  // ----- fortify -----
  card('footings', 'fortify', 'common', 'Stone Footings', 'Walls +250', [], { walls: { integrity: 250 } }),
  card('palisade', 'fortify', 'common', 'Palisade', 'Walls +150, armour +1', ['nature'], { walls: { integrity: 150, armor: 1 } }),
  card('irongate', 'fortify', 'rare', 'Iron Gate', 'Armour +2', ['iron'], { walls: { armor: 2 } }),
  card('thorns', 'fortify', 'rare', 'Thorn Hedge', 'Attackers take 4 a hit', ['nature'], { walls: { thorns: 4 } }),

  // ----- tower -----
  card('lookout', 'tower', 'common', 'Lookout', 'Reach +1.5 for every shooter', [], { tower: { range: 1.5 } }),
  card('quick', 'tower', 'common', 'Quick Hands', 'The tower shoots 25% faster', [], { tower: { rate: 0.25 } }),
  card('heavy', 'tower', 'common', 'Heavy Arrows', 'Tower arrows +30% damage', ['iron'], { tower: { dmg: 0.3 } }),
  card('firearrows', 'tower', 'rare', 'Fire Arrows', 'Tower arrows +20% and burn', ['fire'], { tower: { dmg: 0.2, burn: 2 } }),
  card('twin', 'tower', 'epic', 'Twin String', 'The tower looses two arrows', [], { tower: { shots: 1 } }),
];

export const CARD = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// A few cards with the same tag unlock a bonus for the rest of the run.
export const SYNERGIES = [
  { tag: 'fire', need: 3, name: 'Wildfire', text: 'All burning lasts twice as long and burns twice as hot' },
  { tag: 'frost', need: 2, name: 'Deep Frost', text: 'Slows are half again as strong' },
  { tag: 'iron', need: 3, name: 'Ironworks', text: 'Every shot ignores armour; walls armour +1' },
  { tag: 'nature', need: 2, name: 'Overgrowth', text: 'Roots last longer; thorns hurt twice as much' },
  { tag: 'beast', need: 2, name: 'Pack Sense', text: 'Every shooter does +50% to beasts' },
];

export const TAG_NAMES = { fire: 'Fire', frost: 'Frost', iron: 'Iron', nature: 'Nature', beast: 'Beast' };
