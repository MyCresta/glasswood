// Static game data: the Watch, the camp's buildings and the creatures.
// Balance values live here so they can be tuned without touching code.

// The Watch: the forest around the village, crossed by the path web
// (js/data/web.js). Units: the village walls have radius 3.
export const WALL_R = 3.0;
export const FIELD_R = 33.6; // what the reading glass shows
export const STEP = 0.05; // fixed simulation step (seconds)

export const NIGHT_CAP = 180; // seconds after the first spawn before stragglers retreat

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
  wolf: { name: 'Wolf', plural: 'Wolves', hp: 8, speed: 2.5, dmg: 3, rate: 1.25, armor: 0, gold: 3, size: 0.25, first: 3, beast: true, blurb: 'Fast and fragile. They reach the walls long before the goblins.' },
};

export const SCALING = {
  hp: 1.18, // per night
  dmg: 1.05, // per night
  gold: 0.08, // +8% of base per night
};

// ---------- the camp ----------
// Four buildings, each tied to card families; they grow as cards are picked
// (see buildingStage in js/sim/build.js).
export const BUILDINGS = {
  archery: { name: 'Great Tower', families: ['tower', 'defender'], blurb: 'It always shoots. Defenders stand on it, and Tower cards raise it.', pos: [0, 0] },
  walls: { name: 'Walls & Gate', families: ['fortify'], blurb: 'If the walls fall to nothing, the run is over. They are mended at every dawn.' },
  workshop: { name: 'Workshop', families: ['toolkit'], blurb: 'Keeps the barricades and other things for the paths.' },
  shrine: { name: 'Shrine', families: ['spell'], blurb: 'Where spells are kept.' },
};

export const TARGETING = {
  first: { name: 'Closest to the walls', blurb: 'Shoots whatever is about to reach the walls.' },
  strongest: { name: 'Strongest', blurb: 'Focuses the toughest enemy in range.' },
  fastest: { name: 'Fastest', blurb: 'Picks off wolves and other quick enemies first.' },
};

