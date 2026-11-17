// Technology catalog (section 12.2). `live` marks technologies whose
// capabilities exist in the current build; others explain when they arrive.

export const TECHS = {
  fuel_refining: { name: 'Fuel Refining', cost: 30, pre: [], result: 'Unlocks the Fuel Refinery, which turns Metal into Fuel.', live: true },
  orbital_surveying: { name: 'Orbital Surveying', cost: 40, pre: [], result: 'Spaceports, a starter scout and local surveys.', future: 'Milestone 3' },
  efficient_extraction: { name: 'Efficient Extraction', cost: 80, pre: [], result: 'Extractors produce 20% more Metal.', live: true, bonus: { building: 'extractor', amount: 0.2 } },
  hydroponic_cultures: { name: 'Hydroponic Cultures', cost: 80, pre: [], result: 'Farms produce 20% more Food.', live: true, bonus: { building: 'farm', amount: 0.2 } },
  cargo_logistics: { name: 'Cargo Logistics', cost: 120, pre: ['fuel_refining', 'orbital_surveying'], result: 'Transports, shipments and repeating routes.', future: 'Milestone 4' },
  planetary_settlement: { name: 'Planetary Settlement', cost: 250, pre: ['cargo_logistics'], result: 'Colonies on surveyed habitable worlds.', future: 'Milestone 4' },
  habitat_comfort: { name: 'Habitat Comfort', cost: 150, pre: ['planetary_settlement'], result: 'Recruitment takes 25% less time; comfortable colonists gain 10% more experience.', future: 'Milestone 4' },
  expanded_settlements: { name: 'Expanded Settlements', cost: 200, pre: ['planetary_settlement'], result: '25-plot colonies and headquarters level two.', future: 'Milestone 4' },
  deep_scanning: { name: 'Deep Scanning', cost: 180, pre: ['orbital_surveying'], result: 'Observatories and deeper survey sites.', future: 'Milestone 5' },
  material_analysis: { name: 'Material Analysis', cost: 200, pre: ['deep_scanning'], result: 'Laboratory experiments and material properties.', future: 'Milestone 5' },
  xenolinguistics: { name: 'Xenolinguistics', cost: 200, pre: ['deep_scanning'], result: 'Full alien diplomacy after first contact.', future: 'Milestone 6' },
  commercial_protocols: { name: 'Commercial Protocols', cost: 300, pre: ['cargo_logistics', 'xenolinguistics'], result: 'Trade agreements and improved trade offers.', future: 'Milestone 6' },
  compact_reactors: { name: 'Compact Reactors', cost: 400, pre: ['fuel_refining', 'expanded_settlements'], result: 'Fuel reactors.', future: 'Milestone 5' },
  interstellar_navigation: { name: 'Interstellar Navigation', cost: 500, pre: ['cargo_logistics', 'deep_scanning'], result: 'Other systems and sectors.', future: 'Milestone 5' },
  environmental_adaptation: { name: 'Environmental Adaptation', cost: 600, pre: ['material_analysis', 'planetary_settlement'], result: 'Settlement on frozen and arid marginal worlds.', future: 'Milestone 5' },
  defensive_coordination: { name: 'Defensive Coordination', cost: 500, pre: ['xenolinguistics', 'cargo_logistics'], result: 'Escorts and defense arrays.', future: 'Milestone 7' },
  quiet_operations: { name: 'Quiet Operations', cost: 600, pre: ['xenolinguistics', 'interstellar_navigation'], result: 'Espionage missions.', future: 'Milestone 7' },
  advanced_research: { name: 'Advanced Research', cost: 650, pre: ['material_analysis', 'compact_reactors'], result: 'Second experiment slot per laboratory; 20% more ordinary research.', future: 'Milestone 5' },
  mature_settlements: { name: 'Mature Settlements', cost: 900, pre: ['expanded_settlements', 'compact_reactors'], result: '36-plot colonies and headquarters level three.', future: 'Milestone 5' },
  era_charter: { name: 'Era Charter', cost: 1000, pre: ['interstellar_navigation', 'advanced_research', 'mature_settlements'], result: 'Optional new-era transition once civilization milestones are met.', future: 'Milestone 8' },
};

export const TECH_ORDER = Object.keys(TECHS);
export const RESEARCH_QUEUE_MAX = 3;
export const RETRAIN_COST = 40; // Research
