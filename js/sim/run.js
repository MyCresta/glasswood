// A run: the three cards dealt after every night held, picking and rerolling,
// and the end of the run with its Embers.
import { CARDS, CARD, RARITY } from '../data/cards.js';
import { build } from './build.js';

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rarer cards come up more often the further the run gets.
export function rarityWeights(n) {
  return { common: Math.max(35, RARITY.common.weight - 1.4 * n), rare: RARITY.rare.weight + 0.9 * n, epic: RARITY.epic.weight + 0.5 * n };
}

export function deal(state, salt = 0) {
  const r = rng(state.seed ^ Math.imul(state.night, 9973) ^ Math.imul(salt + 1, 7919));
  const w = rarityWeights(state.night);
  const out = [];
  for (let k = 0; k < 3; k++) {
    const pool = CARDS.filter((c) => !out.includes(c.id));
    const total = pool.reduce((a, c) => a + w[c.rarity], 0);
    let x = r() * total;
    const c = pool.find((cc) => (x -= w[cc.rarity]) <= 0) || pool[pool.length - 1];
    out.push(c.id);
  }
  return out;
}

export const rerollCost = (state) => 10 + 3 * state.night;

export function reroll(state) {
  if (state.phase !== 'draft') return { ok: false, reason: 'Nothing to reroll.' };
  if (state.rerolls > 0) state.rerolls -= 1;
  else {
    const cost = rerollCost(state);
    if (state.gold < cost) return { ok: false, reason: `A reroll costs ${cost} gold.` };
    state.gold -= cost;
  }
  state.offerSalt = (state.offerSalt || 0) + 1;
  state.offer = deal(state, state.offerSalt);
  return { ok: true };
}

export function pick(state, id) {
  if (state.phase !== 'draft' || !state.offer?.includes(id)) return { ok: false, reason: 'That card is not on offer.' };
  state.cards.push(id);
  state.offer = null;
  state.phase = 'day';
  state.integrity = build(state).walls.integrity;
  return { ok: true, card: CARD[id] };
}

// Embers for a run: one for every night held, and more for every fifth.
export const embersFor = (held) => held + 2 * Math.floor(held / 5);

export function endRun(state, ev) {
  const held = state.best;
  const embers = embersFor(held);
  state.meta.embers += embers;
  const record = held > state.meta.best;
  state.meta.best = Math.max(state.meta.best, held);
  state.meta.history.unshift({ held, embers, cards: [...state.cards], kills: state.stats.kills, at: Date.now() });
  state.meta.history.length = Math.min(state.meta.history.length, 20);
  state.phase = 'over';
  state.runEnd = { held, embers, record };
  ev?.emit('attention', `The walls fell on night ${state.night}`, { cat: 'runover' });
}
