// What a run's cards add up to: the tower and its defenders, the walls, the
// barricades, spells and synergies. Worked out from state.cards and cached.
import { BASE, CARD, SYNERGIES } from '../data/cards.js';

const cache = new WeakMap();

export function build(state) {
  const key = `${state.cards.join(',')}|${state.bonus?.walls || 0}`;
  const hit = cache.get(state);
  if (hit && hit.key === key) return hit.b;
  const b = compute(state.cards, state.bonus);
  cache.set(state, { key, b });
  return b;
}

export function compute(ids, bonus = {}) {
  const cards = ids.map((id) => CARD[id]).filter(Boolean);
  const tags = {};
  const counts = { defender: 0, spell: 0, toolkit: 0, fortify: 0, tower: 0 };
  for (const c of cards) { counts[c.family] += 1; for (const t of c.tags) tags[t] = (tags[t] || 0) + 1; }
  const syn = new Set(SYNERGIES.filter((s) => (tags[s.tag] || 0) >= s.need).map((s) => s.tag));

  const tower = { ...BASE.tower, burn: 0 };
  const walls = { ...BASE.walls };
  walls.integrity += bonus.walls || 0;
  let barricades = BASE.barricades;
  let reach = 0, dmgMul = 1, rateMul = 1;
  for (const c of cards) {
    if (c.tower) {
      reach += c.tower.range || 0;
      dmgMul += c.tower.dmg || 0;
      rateMul += c.tower.rate || 0;
      tower.shots += c.tower.shots || 0;
      tower.burn += c.tower.burn || 0;
    }
    if (c.walls) for (const k of Object.keys(c.walls)) walls[k] += c.walls[k];
    if (c.barricades) barricades += c.barricades;
  }
  tower.dmg *= dmgMul;
  tower.rate *= rateMul;
  tower.range += reach;
  if (syn.has('iron')) walls.armor += 1;
  if (syn.has('nature')) walls.thorns *= 2;

  const burnMul = syn.has('fire') ? 2 : 1;
  const slowMul = syn.has('frost') ? 1.5 : 1;
  const beastMul = syn.has('beast') ? 1.5 : 1;
  const pierceArmor = syn.has('iron');
  const shooter = (id, s) => ({
    id, dmg: s.dmg, rate: s.rate, range: s.range + (id === 'tower' ? 0 : reach), shots: s.shots || 1,
    burn: (s.burn || 0) * burnMul, splash: s.splash || 0, slow: Math.min(0.8, (s.slow || 0) * slowMul), pierce: !!s.pierce,
    vsBeast: (s.vsBeast || 1) * beastMul, ignoreArmor: pierceArmor,
  });
  const shooters = [shooter('tower', tower), ...cards.filter((c) => c.shooter).map((c) => shooter(c.id, c.shooter))];

  const spells = cards.filter((c) => c.spell).map((c) => ({ id: c.id, ...c.spell, burn: (c.spell.burn || 0) * burnMul, slow: Math.min(0.8, (c.spell.slow || 0) * slowMul), root: (c.spell.root || 0) * (syn.has('nature') ? 1.5 : 1) }));
  return {
    tags, counts, synergies: syn, tower, walls, barricades, shooters,
    active: spells.filter((s) => s.active),
    auras: spells.filter((s) => s.aura),
    burnMul,
  };
}

// The stage each Hearth building is drawn at: it grows with the cards of its family.
export function buildingStage(b, building) {
  const n = building === 'archery' ? b.counts.tower + b.counts.defender
    : building === 'walls' ? b.counts.fortify
      : building === 'workshop' ? b.counts.toolkit
        : b.counts.spell;
  if (building === 'archery' || building === 'walls') return n === 0 ? 0 : n < 4 ? 1 : 2;
  return n === 0 ? 0 : n < 3 ? 1 : 2;
}
