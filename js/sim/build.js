// What a run's cards add up to: the tower and its defenders, the walls, the
// barricades, spells and synergies. Worked out from state.cards and cached.
import { BASE, CARD, SYNERGIES } from '../data/cards.js';

const cache = new WeakMap();

export function build(state) {
  const up = state.upgrades || {};
  const key = `${state.cards.join(',')}|${state.bonus?.walls || 0}|${UPGRADE_IDS.map((k) => up[k] || 0).join(',')}`;
  const hit = cache.get(state);
  if (hit && hit.key === key) return hit.b;
  const b = compute(state.cards, state.bonus, up);
  cache.set(state, { key, b });
  return b;
}

// ---------- Hearth upgrades, bought with gold between nights ----------
export const UPGRADES = {
  archery: { name: 'Great Tower', text: 'Every shooter +10% damage', base: 25, grow: 1.8 },
  walls: { name: 'Walls & Gate', text: 'Walls +15%', base: 20, grow: 1.8 },
  workshop: { name: 'Workshop', text: 'One more barricade', base: 40, grow: 2.5, max: 3 },
  shrine: { name: 'Shrine', text: 'Spells +12% and ready sooner', base: 30, grow: 1.8 },
};
export const UPGRADE_IDS = Object.keys(UPGRADES);
export const upgradeCost = (id, level) => {
  const u = UPGRADES[id];
  if (u.max !== undefined && level >= u.max) return undefined;
  return Math.round(u.base * u.grow ** level);
};

export function compute(ids, bonus = {}, up = {}) {
  const cards = ids.map((id) => CARD[id]).filter(Boolean);
  const tags = {};
  const counts = { defender: 0, spell: 0, toolkit: 0, fortify: 0, tower: 0 };
  for (const c of cards) { counts[c.family] += 1; for (const t of c.tags) tags[t] = (tags[t] || 0) + 1; }
  const syn = new Set(SYNERGIES.filter((x) => (tags[x.tag] || 0) >= x.need).map((x) => x.tag));
  // the tier reached for each tag: 0, 1 or 2
  const tier = {};
  for (const x of SYNERGIES) tier[x.tag] = (tags[x.tag] || 0) >= x.need2 ? 2 : (tags[x.tag] || 0) >= x.need ? 1 : 0;
  const L = (k) => up[k] || 0;

  const tower = { ...BASE.tower, burn: 0 };
  const walls = { ...BASE.walls, oil: 0 };
  walls.integrity += bonus.walls || 0;
  let barricades = BASE.barricades + L('workshop') + tier.maze;
  let reach = 0, dmgMul = 1, rateMul = 1;
  const all = { dmg: 1 + 0.1 * L('archery') + [0, 0.25, 0.75][tier.iron], rate: 1, burn: 0 };
  let spikes = 0, tar = 0;
  for (const c of cards) {
    if (c.tower) {
      reach += c.tower.range || 0;
      dmgMul += c.tower.dmg || 0;
      rateMul += c.tower.rate || 0;
      tower.shots += c.tower.shots || 0;
      tower.burn += c.tower.burn || 0;
    }
    if (c.all) { all.dmg += c.all.dmg || 0; all.rate += c.all.rate || 0; all.burn += c.all.burn || 0; }
    if (c.walls) for (const k of Object.keys(c.walls)) walls[k] += c.walls[k];
    if (c.barricades) barricades += c.barricades;
    if (c.spikes) spikes += c.spikes;
    if (c.tar) tar = 1 - (1 - tar) * (1 - c.tar);
  }
  all.rate += [0, 0.35, 0.9][tier.bow];
  tower.dmg *= dmgMul;
  tower.rate *= rateMul;
  tower.range += reach;
  walls.integrity *= 1 + 0.15 * L('walls') + [0, 0.25, 0.6][tier.stone];
  walls.thorns *= [1, 2, 3][tier.stone];
  walls.oil *= [1, 2, 3][tier.stone];
  // armour: each point takes a share off every hit, with diminishing returns
  walls.taken = 1 / (1 + 0.12 * walls.armor);
  spikes *= [1, 2.5, 5][tier.maze];

  const burnMul = [1, 2, 3.2][tier.fire];
  const shatter = [1, 1.4, 2][tier.frost];
  const pierceArmor = syn.has('iron');
  const shooter = (id, x) => ({
    id, dmg: x.dmg * all.dmg, rate: x.rate * all.rate, range: x.range + (id === 'tower' ? 0 : reach), shots: x.shots || 1,
    burn: ((x.burn || 0) + all.burn) * burnMul, splash: x.splash || 0, slow: Math.min(0.8, x.slow || 0), pierce: !!x.pierce,
    vsBeast: x.vsBeast || 1, ignoreArmor: pierceArmor,
  });
  const shooters = [shooter('tower', tower), ...cards.filter((c) => c.shooter).map((c) => shooter(c.id, c.shooter))];

  // spells: copies of the same spell make one stronger spell
  const spellPow = 1 + 0.12 * L('shrine');
  const cdMul = 0.94 ** L('shrine');
  const byId = new Map();
  for (const c of cards) if (c.spell) byId.set(c.id, (byId.get(c.id) || 0) + 1);
  const spells = [...byId].map(([id, k]) => {
    const sp = CARD[id].spell;
    const p = (1 + 0.7 * (k - 1)) * spellPow;
    return {
      id, level: k, ...sp, cd: sp.cd ? sp.cd * cdMul : undefined,
      dmg: (sp.dmg || 0) * p, burn: (sp.burn || 0) * p * burnMul, dps: (sp.dps || 0) * p * burnMul,
      mend: Math.min(0.8, (sp.mend || 0) * p), root: (sp.root || 0) * (1 + 0.3 * (k - 1)),
      slow: Math.min(0.7, (sp.slow || 0) * (1 + 0.35 * (k - 1))), radius: (sp.radius || 0) * (1 + 0.1 * (k - 1)),
    };
  });
  return {
    tags, counts, synergies: syn, tier, tower, walls, barricades, shooters, spikes, tar, shatter,
    active: spells.filter((x) => x.active),
    auras: spells.filter((x) => x.aura),
    burnMul,
  };
}

// The stage each Hearth building is drawn at: it grows with its upgrades.
export function buildingStage(state, building) {
  const lv = state.upgrades?.[building] || 0;
  return lv === 0 ? 0 : lv < 3 ? 1 : 2;
}
