// Professions, traits and name pools for colonists.

export const PROFESSIONS = {
  miner: { name: 'Miner', strength: 'Extraction and material recovery', color: '#d08a4e', building: 'extractor' },
  scientist: { name: 'Scientist', strength: 'Research and experiments', color: '#7f95f0', building: 'lab' },
  engineer: { name: 'Engineer', strength: 'Fuel, power and construction support', color: '#e3c14d', building: 'refinery' },
  explorer: { name: 'Explorer', strength: 'Surveying and travel', color: '#5fbfa8', building: null },
};
export const PROFESSION_ORDER = ['miner', 'scientist', 'engineer', 'explorer'];

// `live` = effect applies in the current build. Others are shown with their
// full description; their mission effects start mattering in later milestones.
export const TRAITS = {
  diligent: { name: 'Diligent', effect: '5% more output at their assigned production building.', line: 'Finishes the shift, then tidies the shift after.', live: true },
  patient: { name: 'Patient', effect: '10% more experience from building work.', line: 'Has never once tapped a gauge to make it move faster.', live: true },
  curious: { name: 'Curious', effect: '10% faster experiments when assigned to that laboratory.', line: 'Keeps a pocket notebook of things that “seem off, in a good way.”' },
  sociable: { name: 'Sociable', effect: '10% greater positive trust gains from a mission they lead.', line: 'Remembers everyone’s favourite ration flavour.' },
  resourceful: { name: 'Resourceful', effect: '10% more recoverable materials from salvage missions.', line: 'Can build a hinge out of almost anything.' },
  careful: { name: 'Careful', effect: '10% less cargo lost in a failed mission they crew.', line: 'Double-checks the straps. Then the buckles.' },
  adventurous: { name: 'Adventurous', effect: '10% more experience from ship missions.', line: 'Always asks what is behind the next ridge.' },
  methodical: { name: 'Methodical', effect: '5% more ordinary Research at the assigned laboratory.', line: 'Labels the labels.', live: true },
  homebody: { name: 'Homebody', effect: '10% greater staffing bonus at a building; no benefit aboard ship.', line: 'Has a favourite chair in every room.', live: true },
  efficient: { name: 'Efficient', effect: '5% lower operating power demand at their assigned building.', line: 'Turns off lights in rooms other people are still in.', live: true },
  adaptable: { name: 'Adaptable', effect: 'Half the normal recovery duration after a setback.', line: 'Sleeps well on any surface, in any gravity.' },
  inventive: { name: 'Inventive', effect: '10% greater construction-support contribution as a headquarters Engineer.', line: 'Sketches improvements on the back of work orders.', live: true },
};
export const TRAIT_KEYS = Object.keys(TRAITS);

export const FIRST_NAMES = [
  'Ada', 'Bilal', 'Chiamaka', 'Dagny', 'Émile', 'Farida', 'Goran', 'Hana', 'Ines', 'Jorge', 'Kalani', 'Linnea',
  'Mateus', 'Noor', 'Oluwaseun', 'Priya', 'Quentin', 'Rafaela', 'Søren', 'Tomoko', 'Uriel', 'Valentina', 'Wen',
  'Ximena', 'Yusuf', 'Zofia', 'Anouk', 'Björn', 'Catalina', 'Dmitri', 'Esra', 'Felix', 'Gülşen', 'Hiro', 'Ilse',
  'Jamal', 'Kirra', 'Lorenzo', 'Maëlle', 'Nikolai', 'Oona', 'Pablo', 'Rania', 'Sefa', 'Tariq', 'Ulla', 'Vikram',
  'Wanjiru', 'Yara', 'Zeynep', 'Aroha', 'Ciarán', 'Ðorđe', 'Leilani', 'Mirela', 'Tenzin', 'Åsa', 'Kofi',
];
export const LAST_NAMES = [
  'Okafor', 'Lindqvist', 'Haddad', 'Moreau', 'Tanaka', 'Novak', 'Castillo', 'Mbeki', 'Kowalski', 'Ruiz', 'Sato',
  'Achterberg', 'Ferreira', 'Nyström', 'Petrov', 'Raman', 'Osei', 'Delacroix', 'Kimura', 'Halvorsen', 'Aziz',
  'Brennan', 'Costa', 'Dubois', 'Eriksen', 'Fontaine', 'García', 'Hosseini', 'Ivanova', 'Jansen', 'Kaya',
  'Larsen', 'Mendes', 'Nakamura', 'Oyelaran', 'Park', 'Quispe', 'Rossi', 'Šimić', 'Takahashi', 'Úlfarsson', 'Varga',
];

export const EMBLEMS = ['orbit', 'leaf', 'spark', 'wave', 'crown', 'key', 'eye', 'tri'];
export const CIV_COLORS = ['#7fd6c8', '#f0a86b', '#a9b8ff', '#e88fb0', '#c3d977', '#f2d65c', '#c99ae8', '#ffffff'];
