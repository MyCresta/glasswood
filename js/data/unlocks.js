// What Embers buy between runs. Most unlocks add cards to the pool (wider
// choices); a few are small lasting boosts, kept modest on purpose.
export const UNLOCKS = [
  { id: 'reroll', kind: 'boost', name: 'Spare Reroll', text: '+1 free reroll every run', costs: [8, 18, 32] },
  { id: 'walls', kind: 'boost', name: 'Old Stones', text: 'Walls start 100 stronger', costs: [6, 14, 26] },
  { id: 'purse', kind: 'boost', name: 'Purse', text: 'Start every run with 25 more gold', costs: [5, 12, 22] },
  { id: 'wider', kind: 'boost', name: 'Wider Choice', text: 'Choose from four starter cards instead of three', costs: [15] },
  { id: 'card:crossbow', kind: 'card', card: 'crossbow', costs: [10] },
  { id: 'card:witch', kind: 'card', card: 'witch', costs: [16] },
  { id: 'card:frostward', kind: 'card', card: 'frostward', costs: [10] },
  { id: 'card:emberward', kind: 'card', card: 'emberward', costs: [10] },
  { id: 'card:irongate', kind: 'card', card: 'irongate', costs: [8] },
  { id: 'card:thorns', kind: 'card', card: 'thorns', costs: [8] },
  { id: 'card:oil', kind: 'card', card: 'oil', costs: [10] },
  { id: 'card:tar', kind: 'card', card: 'tar', costs: [10] },
  { id: 'card:cart', kind: 'card', card: 'cart', costs: [12] },
  { id: 'card:twin', kind: 'card', card: 'twin', costs: [20] },
];
export const UNLOCK = Object.fromEntries(UNLOCKS.map((u) => [u.id, u]));
// cards that must be bought with Embers before they are dealt
export const LOCKED_CARDS = new Set(UNLOCKS.filter((u) => u.kind === 'card').map((u) => u.card));
// the cards a run can start with
export const STARTERS = ['archer', 'axe', 'hunter', 'mage', 'firebolt', 'snare', 'palisade', 'spikes', 'lookout', 'heavy', 'barricade', 'quick'];
