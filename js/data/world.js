// The wider world shown in the World view. Expeditions arrive in Milestone 6;
// until then these places can be explored on the map and read about.
export const LOCATION_KINDS = {
  home: { name: 'Your village' },
  village: { name: 'Village' },
  ruins: { name: 'Ruins' },
  dungeon: { name: 'Dungeon' },
  wilds: { name: 'Wild place' },
};

export const LOCATIONS = [
  { id: 'home', kind: 'home', name: null, pos: [0, 0], blurb: 'Your village and its Great Tower.' },
  { id: 'whispering', kind: 'wilds', name: 'Whispering Woods', pos: [-26, -16], difficulty: 1, hours: 0.2, rewards: ['Timber', 'Wolf pelts', 'Herbs'], blurb: 'Old trees that lean together and murmur when the wind is still. A ring of standing stones hides in the middle.' },
  { id: 'quarry', kind: 'wilds', name: 'Old Quarry', pos: [30, -8], difficulty: 1, hours: 0.25, rewards: ['Stone', 'Iron', 'Goblin scraps'], blurb: 'An abandoned quarry that goblins use as a camp. Its cranes still creak.' },
  { id: 'brindlecross', kind: 'village', name: 'Brindlecross', pos: [-10, 42], difficulty: 0, hours: 0.3, rewards: ['Recruits', 'Trade', 'Rumours'], blurb: 'A friendly market village at the crossroads. Its people trade, gossip and sometimes want to move somewhere braver.' },
  { id: 'chapel', kind: 'ruins', name: 'Sunken Chapel', pos: [-38, 22], difficulty: 2, hours: 0.4, rewards: ['Relics', 'Recipes', 'Gold'], blurb: 'A chapel slowly sinking into a marsh. Candles are still lit inside, though nobody remembers lighting them.' },
  { id: 'warrens', kind: 'dungeon', name: 'Goblin Warrens', pos: [16, -40], difficulty: 2, hours: 0.5, rewards: ['Goblin trophies', 'Gold', 'Iron'], blurb: 'Tunnels under the hills where the goblins come from. Smells exactly as you would expect.' },
  { id: 'trollbridge', kind: 'ruins', name: 'Troll Bridge', pos: [46, 26], difficulty: 3, hours: 0.6, rewards: ['Brute hide', 'Toll gold'], blurb: 'A great stone bridge over the river, held by a troll who is very particular about manners.' },
  { id: 'oakmere', kind: 'village', name: 'Oakmere', pos: [54, -36], difficulty: 0, hours: 0.6, rewards: ['Recruits', 'Recipes', 'Fish'], blurb: 'A quiet lakeside village of fishers and boat-builders who know old songs about the woods.' },
  { id: 'watch', kind: 'ruins', name: 'Fallen Watch', pos: [10, 66], difficulty: 3, hours: 0.75, rewards: ['Old maps', 'Shield plates'], blurb: 'A broken watchtower on the southern hills. Its last guards left a map nobody has finished reading.' },
  { id: 'crypt', kind: 'dungeon', name: 'Moonlit Crypt', pos: [-60, -32], difficulty: 4, hours: 1, rewards: ['Wraith essence', 'Rare recipes'], blurb: 'A crypt that is only easy to find on clear nights. The dead inside are restless but polite.' },
  { id: 'crystal', kind: 'dungeon', name: 'Crystal Hollow', pos: [-50, 60], difficulty: 5, hours: 1, rewards: ['Gems', 'Rune stones'], blurb: 'A cave of humming crystals near the coast. The deeper you go, the louder they sing.' },
];

export const RIVER = [[30, -78], [36, -50], [40, -20], [46, 26], [62, 52], [86, 70]];
export const WORLD_LAKE = { x: 66, z: -44, r: 9 };
export const WORLD_R = 95;
